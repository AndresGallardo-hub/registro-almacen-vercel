import { neon } from '@neondatabase/serverless';

export function getSql() {
  const c = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!c) throw new Error('Falta conectar la base de datos en Vercel (Storage).');
  return neon(c);
}

export const clean = (s) => (s || '').trim().replace(/\s+/g, ' ');
export const norm = (s) => clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const todayAR = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
const minusDays = (d, n) => { const [y, m, x] = d.split('-').map(Number); return new Date(Date.UTC(y, m - 1, x - n)).toISOString().slice(0, 10); };
// 32 días: hoy + los 31 anteriores
export const cutoffDate = () => minusDays(todayAR(), 31);

let ready = false, lastPurge = 0;
export async function ensureTable(sql) {
  if (!ready) {
    await sql`CREATE TABLE IF NOT EXISTS sales_entries (id SERIAL PRIMARY KEY, date TEXT NOT NULL, time TEXT NOT NULL, ts BIGINT NOT NULL, amount INTEGER NOT NULL, tipo TEXT NOT NULL, medio TEXT, plat TEXT, cliente TEXT)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sales_date ON sales_entries(date)`;
    await sql`CREATE TABLE IF NOT EXISTS expenses (id SERIAL PRIMARY KEY, date TEXT NOT NULL, time TEXT NOT NULL, ts BIGINT NOT NULL, prov_key TEXT NOT NULL, prov_name TEXT NOT NULL, amount INTEGER NOT NULL)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_exp_date ON expenses(date)`;
    await sql`CREATE TABLE IF NOT EXISTS providers (key TEXT PRIMARY KEY, name TEXT NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS fiado_accounts (key TEXT PRIMARY KEY, name TEXT NOT NULL, balance INTEGER NOT NULL DEFAULT 0)`;
    await sql`CREATE TABLE IF NOT EXISTS fiado_movements (id SERIAL PRIMARY KEY, date TEXT NOT NULL, time TEXT NOT NULL, ts BIGINT NOT NULL, key TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL, amount INTEGER NOT NULL, medio TEXT, plat TEXT, sale_id INTEGER)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_mov_date ON fiado_movements(date)`;
    await sql`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)`;
    // Migración única: pasar los fiados con nombre ya cargados a cuentas
    const f = await sql`SELECT v FROM meta WHERE k = 'fiado_backfill'`;
    if (!f.length) {
      const rows = await sql`SELECT cliente, SUM(amount)::int AS total FROM sales_entries WHERE tipo = 'fiado' AND COALESCE(cliente, '') <> '' GROUP BY cliente`;
      const acc = {};
      for (const r of rows) { const k = norm(r.cliente); acc[k] = acc[k] || { name: clean(r.cliente), total: 0 }; acc[k].total += r.total; }
      for (const k in acc) await sql`INSERT INTO fiado_accounts (key, name, balance) VALUES (${k}, ${acc[k].name}, ${acc[k].total}) ON CONFLICT (key) DO NOTHING`;
      await sql`INSERT INTO meta (k, v) VALUES ('fiado_backfill', '1') ON CONFLICT DO NOTHING`;
    }
    ready = true;
  }
  // Borrado automático de movimientos con más de 32 días (cuentas de fiado y proveedores NO se borran)
  if (Date.now() - lastPurge > 3600000) {
    const c = cutoffDate();
    await sql`DELETE FROM sales_entries WHERE date < ${c}`;
    await sql`DELETE FROM expenses WHERE date < ${c}`;
    await sql`DELETE FROM fiado_movements WHERE date < ${c}`;
    lastPurge = Date.now();
  }
}
