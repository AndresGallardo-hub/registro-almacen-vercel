import { getSql, ensureTable, clean, norm } from '../../../lib/db';

const TIPOS = ['gaseosa', 'cerveza'];

export async function GET() {
  try {
    const sql = getSql(); await ensureTable(sql);
    const accounts = await sql`SELECT key, MIN(name) AS name, COALESCE(SUM(qty) FILTER (WHERE tipo = 'gaseosa'), 0)::int AS gaseosa, COALESCE(SUM(qty) FILTER (WHERE tipo = 'cerveza'), 0)::int AS cerveza FROM envases_balances GROUP BY key ORDER BY MIN(name)`;
    const movs = await sql`SELECT id, date, time, name, tipo, kind, qty FROM envases_movements ORDER BY ts DESC LIMIT 15`;
    return Response.json({ accounts, movs });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}

export async function POST(request) {
  try {
    const sql = getSql(); await ensureTable(sql);
    const { name, tipo, qty, kind, date, time, ts } = await request.json();
    const n = parseInt(qty, 10), nm = clean(name), k = norm(nm);
    if (!k || !n || n < 1 || !TIPOS.includes(tipo)) return Response.json({ error: 'Faltan datos' }, { status: 400 });
    let row;
    if (kind === 'presto') {
      const ex = await sql`SELECT name FROM envases_balances WHERE key = ${k} LIMIT 1`;
      const canon = ex.length ? ex[0].name : nm;
      row = (await sql`INSERT INTO envases_balances (key, name, tipo, qty) VALUES (${k}, ${canon}, ${tipo}, ${n}) ON CONFLICT (key, tipo) DO UPDATE SET qty = envases_balances.qty + ${n} RETURNING name, qty`)[0];
    } else if (kind === 'devolvio') {
      const r = await sql`UPDATE envases_balances SET qty = qty - ${n} WHERE key = ${k} AND tipo = ${tipo} AND qty >= ${n} RETURNING name, qty`;
      if (!r.length) return Response.json({ error: 'Esa persona no tiene tantos envases de ese tipo' }, { status: 400 });
      row = r[0];
    } else return Response.json({ error: 'Operación inválida' }, { status: 400 });
    await sql`INSERT INTO envases_movements (date, time, ts, key, name, tipo, kind, qty) VALUES (${date}, ${time}, ${ts}, ${k}, ${row.name}, ${tipo}, ${kind}, ${n})`;
    return Response.json({ ok: true, name: row.name, qty: row.qty });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(request) {
  try {
    const sql = getSql(); await ensureTable(sql);
    const id = new URL(request.url).searchParams.get('id');
    const m = await sql`DELETE FROM envases_movements WHERE id = ${id} RETURNING key, tipo, kind, qty`;
    if (m[0]) {
      const delta = m[0].kind === 'presto' ? -m[0].qty : m[0].qty;
      await sql`UPDATE envases_balances SET qty = GREATEST(qty + ${delta}, 0) WHERE key = ${m[0].key} AND tipo = ${m[0].tipo}`;
    }
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
