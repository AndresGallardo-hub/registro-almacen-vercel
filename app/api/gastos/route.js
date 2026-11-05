import { getSql, ensureTable, clean, norm, todayAR } from '../../../lib/db';

export async function GET(request) {
  try {
    const sql = getSql(); await ensureTable(sql);
    const date = new URL(request.url).searchParams.get('date');
    const hoy = await sql`SELECT id, time, prov_name, amount, paid FROM expenses WHERE date = ${date} ORDER BY ts DESC`;
    const acum = await sql`SELECT MIN(prov_name) AS name, SUM(amount)::int AS total FROM expenses GROUP BY prov_key HAVING SUM(amount) > 0 ORDER BY total DESC`;
    const provs = (await sql`SELECT name FROM providers ORDER BY name`).map((p) => p.name);
    const deudas = await sql`SELECT key, name, debt, debt_since FROM providers WHERE debt > 0 ORDER BY debt DESC`;
    return Response.json({ hoy, acum, provs, deudas });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}

export async function POST(request) {
  try {
    const sql = getSql(); await ensureTable(sql);
    const { date, time, ts, proveedor, amount, paid, kind } = await request.json();
    const name = clean(proveedor);
    const k = norm(name);
    if (!k) return Response.json({ error: 'Falta el proveedor' }, { status: 400 });

    if (kind === 'pago') { // pago de una deuda existente
      const p = parseInt(paid, 10);
      if (!p || p < 0) return Response.json({ error: 'Falta el monto' }, { status: 400 });
      const r = await sql`UPDATE providers SET debt = debt - ${p} WHERE key = ${k} AND debt >= ${p} RETURNING name, debt`;
      if (!r.length) return Response.json({ error: 'Ese monto es mayor a la deuda' }, { status: 400 });
      await sql`UPDATE providers SET debt_since = NULL WHERE key = ${k} AND debt = 0`;
      await sql`INSERT INTO expenses (date, time, ts, prov_key, prov_name, amount, paid) VALUES (${date}, ${time}, ${ts}, ${k}, ${r[0].name}, 0, ${p})`;
      return Response.json({ ok: true, name: r[0].name, deuda: r[0].debt });
    }

    const total = parseInt(amount, 10);
    const pd = paid === undefined || paid === null ? total : parseInt(paid, 10);
    if (!total) return Response.json({ error: 'Falta el monto' }, { status: 400 });
    if (isNaN(pd) || pd < 0 || pd > total) return Response.json({ error: 'Lo pagado no puede ser mayor al gasto' }, { status: 400 });
    const ins = await sql`INSERT INTO providers (key, name) VALUES (${k}, ${name}) ON CONFLICT (key) DO NOTHING RETURNING key`;
    if (total - pd > 0) await sql`UPDATE providers SET debt = debt + ${total - pd}, debt_since = COALESCE(debt_since, ${date}) WHERE key = ${k}`;
    const pr = (await sql`SELECT name, debt FROM providers WHERE key = ${k}`)[0];
    await sql`INSERT INTO expenses (date, time, ts, prov_key, prov_name, amount, paid) VALUES (${date}, ${time}, ${ts}, ${k}, ${pr.name}, ${total}, ${pd})`;
    return Response.json({ ok: true, created: ins.length > 0, name: pr.name, deuda: pr.debt });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(request) {
  try {
    const sql = getSql(); await ensureTable(sql);
    const id = new URL(request.url).searchParams.get('id');
    const r = await sql`DELETE FROM expenses WHERE id = ${id} RETURNING prov_key, amount, paid`;
    if (r[0]) {
      await sql`UPDATE providers SET debt = GREATEST(debt - ${r[0].amount - r[0].paid}, 0) WHERE key = ${r[0].prov_key}`;
      await sql`UPDATE providers SET debt_since = CASE WHEN debt > 0 THEN COALESCE(debt_since, ${todayAR()}) ELSE NULL END WHERE key = ${r[0].prov_key}`;
    }
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
