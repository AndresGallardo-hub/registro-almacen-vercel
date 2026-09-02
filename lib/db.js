import { neon } from '@neondatabase/serverless';

export function getSql() {
  const connStr =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED;

  if (!connStr) {
    throw new Error(
      'Falta conectar la base de datos. En Vercel: tu proyecto → Storage → Marketplace → Neon → Connect.'
    );
  }
  return neon(connStr);
}

export async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS sales_entries (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      ts BIGINT NOT NULL,
      amount INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      medio TEXT,
      plat TEXT,
      cliente TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_sales_entries_date ON sales_entries(date)`;
}
