import { getSql, ensureTable } from '../../../lib/db';

export async function GET(request) {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const rows = await sql`
      SELECT DISTINCT date FROM sales_entries
      WHERE date >= ${from} AND date <= ${to}
      ORDER BY date DESC
    `;
    return Response.json({ days: rows.map((r) => r.date) });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
