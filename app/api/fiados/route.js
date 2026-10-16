import { getSql, ensureTable } from '../../../lib/db';

export async function GET() {
  try {
    const sql = getSql(); await ensureTable(sql);
    const accounts = await sql`SELECT key, name, balance FROM fiado_accounts ORDER BY balance DESC, name`;
    const pagos = await sql`SELECT id, date, time, name, amount FROM fiado_movements WHERE kind = 'pago' ORDER BY ts DESC LIMIT 15`;
    return Response.json({ accounts, pagos });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}

export async function POST(request) {
  try {
    const sql = getSql(); await ensureTable(sql);
    const { key, amount, medio, plat, date, time, ts } = await request.json();
    if (!key || !amount) return Response.json({ error: 'Faltan datos' }, { status: 400 });
    const r = await sql`UPDATE fiado_accounts SET balance = balance - ${amount} WHERE key = ${key} AND balance >= ${amount} RETURNING name, balance`;
    if (!r.length) return Response.json({ error: 'Ese monto es mayor a lo que debe' }, { status: 400 });
    await sql`INSERT INTO fiado_movements (date, time, ts, key, name, kind, amount, medio, plat) VALUES (${date}, ${time}, ${ts}, ${key}, ${r[0].name}, 'pago', ${amount}, ${medio || 'efectivo'}, ${plat || null})`;
    return Response.json({ ok: true, resta: r[0].balance });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(request) {
  try {
    const sql = getSql(); await ensureTable(sql);
    const id = new URL(request.url).searchParams.get('id');
    const m = await sql`DELETE FROM fiado_movements WHERE id = ${id} AND kind = 'pago' RETURNING key, amount`;
    if (m[0]) await sql`UPDATE fiado_accounts SET balance = balance + ${m[0].amount} WHERE key = ${m[0].key}`;
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
