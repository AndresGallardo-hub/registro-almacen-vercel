import { getSql, ensureTable, clean, norm } from '../../../lib/db';

export async function GET(request) {
  try {
    const sql = getSql(); await ensureTable(sql);
    const date = new URL(request.url).searchParams.get('date');
    if (!date) return Response.json({ error: 'Falta date' }, { status: 400 });
    return Response.json({ entries: await sql`SELECT * FROM sales_entries WHERE date = ${date} ORDER BY ts DESC` });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}

export async function POST(request) {
  try {
    const sql = getSql(); await ensureTable(sql);
    const { date, time, ts, amount, tipo, medio, plat, cliente } = await request.json();
    const name = clean(cliente);
    if (!date || !amount || !tipo) return Response.json({ error: 'Faltan datos' }, { status: 400 });
    if (tipo === 'fiado' && !name) return Response.json({ error: 'Falta el nombre del cliente' }, { status: 400 });
    const rows = await sql`INSERT INTO sales_entries (date, time, ts, amount, tipo, medio, plat, cliente) VALUES (${date}, ${time}, ${ts}, ${amount}, ${tipo}, ${medio || null}, ${plat || null}, ${tipo === 'fiado' ? name : null}) RETURNING *`;
    if (tipo === 'fiado') {
      const k = norm(name);
      await sql`INSERT INTO fiado_accounts (key, name, balance) VALUES (${k}, ${name}, ${amount}) ON CONFLICT (key) DO UPDATE SET balance = fiado_accounts.balance + ${amount}`;
      const n = await sql`SELECT name FROM fiado_accounts WHERE key = ${k}`;
      await sql`INSERT INTO fiado_movements (date, time, ts, key, name, kind, amount, sale_id) VALUES (${date}, ${time}, ${ts}, ${k}, ${n[0].name}, 'fiado', ${amount}, ${rows[0].id})`;
    }
    return Response.json({ entry: rows[0] });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
