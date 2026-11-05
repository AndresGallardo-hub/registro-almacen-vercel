import { getSql, ensureTable, todayAR } from '../../../lib/db';

const money = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const p = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const diff = (a, b) => Math.round((p(b) - p(a)) / 864e5);

export async function GET() {
  try {
    const sql = getSql(); await ensureTable(sql);
    const today = todayAR();
    const alerts = [];
    // Deudas con proveedores: una alerta nueva por cada semana cumplida
    const debts = await sql`SELECT key, name, debt, debt_since FROM providers WHERE debt > 0 AND debt_since IS NOT NULL`;
    for (const x of debts) {
      const w = Math.floor(diff(x.debt_since, today) / 7);
      if (w >= 1) alerts.push({ id: `pd-${x.key}-${w}`, text: `${x.name}: pasaron ${w} ${w === 1 ? 'semana' : 'semanas'} y todavía le debés ${money(x.debt)}.`, href: '/gastos' });
    }
    // Clientes: 7 días desde su último pago y todavía deben algo
    const pagos = await sql`SELECT DISTINCT ON (m.key) m.id, m.name, m.amount, m.date, a.balance FROM fiado_movements m JOIN fiado_accounts a ON a.key = m.key WHERE m.kind = 'pago' ORDER BY m.key, m.ts DESC`;
    for (const x of pagos) {
      const d = diff(x.date, today);
      if (d >= 7 && x.balance > 0) alerts.push({ id: `fp-${x.id}`, text: `${x.name} abonó ${money(x.amount)} hace ${d} días y todavía debe ${money(x.balance)}.`, href: '/fiados' });
    }
    // Fin de mes
    const [y, m, d] = today.split('-').map(Number);
    if (d === new Date(y, m, 0).getDate()) alerts.push({ id: `fm-${today}`, text: 'Hoy es el último día del mes: sacá captura del Balance mensual antes de que se borre.', href: '/resumen' });
    if (d === 1) alerts.push({ id: `fm-${today}`, text: 'Empezó el mes nuevo: sacá hoy la captura del Balance del mes anterior, pronto se empieza a borrar.', href: '/resumen' });
    return Response.json({ alerts });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
