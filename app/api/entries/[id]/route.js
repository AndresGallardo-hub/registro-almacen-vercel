import { getSql, ensureTable, norm } from '../../../../lib/db';

export async function DELETE(request, { params }) {
  try {
    const sql = getSql(); await ensureTable(sql);
    const { id } = params;
    const r = await sql`DELETE FROM sales_entries WHERE id = ${id} RETURNING tipo, cliente, amount`;
    if (r[0] && r[0].tipo === 'fiado' && r[0].cliente) {
      await sql`UPDATE fiado_accounts SET balance = GREATEST(balance - ${r[0].amount}, 0) WHERE key = ${norm(r[0].cliente)}`;
      await sql`DELETE FROM fiado_movements WHERE sale_id = ${id}`;
    }
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
