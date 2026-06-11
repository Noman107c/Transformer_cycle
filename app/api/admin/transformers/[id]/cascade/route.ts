import sql from '@/lib/postgres';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const num = id.replace(/\D/g, '');
    const normalizedId = `transformer_${num}`;
    const tableName = `transformer_${num}`;

    await sql.begin(async (tx) => {
      // 1. Delete metadata row
      await tx`
        DELETE FROM public.transformers 
        WHERE id = ${normalizedId};
      `;

      // 2. Drop the physical sensor table
      await tx`
        DROP TABLE IF EXISTS public.${tx(tableName)} CASCADE;
      `;
    });

    return Response.json({ success: true, message: `Transformer ${id} and table ${tableName} dropped successfully` });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
