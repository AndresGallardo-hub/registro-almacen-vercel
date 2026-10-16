import { getSql, ensureTable, clean, norm } from '../../../lib/db';

export async function GET(request) {
  try {
    const sql = getSql(); await ensureTable(sql);
    const date = new URL(request.url).searchParams.get('date');
    const hoy = await sql`SELECT id, time, prov_name, amount FROM expenses WHERE date = ${date} ORDER BY ts DESC`;
    const acum = await sql`SELECT MIN(prov_name) AS name, SUM(amount)::int AS total FROM expenses GROUP BY prov_key ORDER BY total DESC`;
    const provs = (await sql`SELECT name FROM providers ORDER BY name`).map((p) => p.name);
    return Response.json({ hoy, acum, provs });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}

export async function POST(request) {
  try {
    const sql = getSql(); await ensureTable(sql);
    const { date, time, ts, proveedor, amount } = await request.json();
    const name = clean(proveedor);
    if (!name || !amount) return Response.json({ error: 'Falta proveedor o monto' }, { status: 400 });
    const k = norm(name);
    const ins = await sql`INSERT INTO providers (key, name) VALUES (${k}, ${name}) ON CONFLICT (key) DO NOTHING RETURNING key`;
    const canon = (await sql`SELECT name FROM providers WHERE key = ${k}`)[0].name;
    await sql`INSERT INTO expenses (date, time, ts, prov_key, prov_name, amount) VALUES (${date}, ${time}, ${ts}, ${k}, ${canon}, ${amount})`;
    return Response.json({ ok: true, created: ins.length > 0, name: canon });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(request) {
  try {
    const sql = getSql(); await ensureTable(sql);
    const id = new URL(request.url).searchParams.get('id');
    await sql`DELETE FROM expenses WHERE id = ${id}`;
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
