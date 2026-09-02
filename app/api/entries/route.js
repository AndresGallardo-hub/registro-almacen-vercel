import { getSql, ensureTable } from '../../../lib/db';

export async function GET(request) {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    if (!date) {
      return Response.json({ error: 'Falta el parámetro date' }, { status: 400 });
    }
    const rows = await sql`SELECT * FROM sales_entries WHERE date = ${date} ORDER BY ts DESC`;
    return Response.json({ entries: rows });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const body = await request.json();
    const { date, time, ts, amount, tipo, medio, plat, cliente } = body;

    if (!date || !amount || !tipo) {
      return Response.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO sales_entries (date, time, ts, amount, tipo, medio, plat, cliente)
      VALUES (${date}, ${time}, ${ts}, ${amount}, ${tipo}, ${medio || null}, ${plat || null}, ${cliente || null})
      RETURNING *
    `;
    return Response.json({ entry: rows[0] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
