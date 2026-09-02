import { getSql, ensureTable } from '../../../../lib/db';

export async function DELETE(request, { params }) {
  try {
    const sql = getSql();
    await ensureTable(sql);
    const { id } = params;
    await sql`DELETE FROM sales_entries WHERE id = ${id}`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
