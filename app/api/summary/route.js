import { getSql, ensureTable } from '../../../lib/db';

export async function GET(request) {
  try {
    const sql = getSql(); await ensureTable(sql);
    const month = new URL(request.url).searchParams.get('month');
    if (!month) return Response.json({ error: 'Falta month' }, { status: 400 });
    const [y, m] = month.split('-').map(Number);
    const from = `${month}-01`;
    const to = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
    const sales = await sql`SELECT * FROM sales_entries WHERE date >= ${from} AND date <= ${to} ORDER BY date, ts`;
    const expenses = await sql`SELECT * FROM expenses WHERE date >= ${from} AND date <= ${to}`;
    const payments = await sql`SELECT * FROM fiado_movements WHERE kind = 'pago' AND date >= ${from} AND date <= ${to}`;
    return Response.json({ sales, expenses, payments });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
