import sql from '@/lib/postgres';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const num = id.replace(/\D/g, '');
    const normalizedId = `transformer_${num}`;
    
    const { name, location, type, capacity, status } = await request.json();

    if (!name || !name.trim()) {
      return Response.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const result = await sql`
      UPDATE public.transformers 
      SET 
        name = ${name}, 
        location = ${location || ''}, 
        type = ${type || 'Distribution'}, 
        capacity = ${capacity || 50}, 
        status = ${status || 'GOOD'},
        updated_at = now()
      WHERE id = ${normalizedId}
      RETURNING *;
    `;

    if (result.length === 0) {
      return Response.json({ success: false, error: 'Transformer not found' }, { status: 404 });
    }

    return Response.json({ success: true, data: result[0] });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const num = id.replace(/\D/g, '');
    const normalizedId = `transformer_${num}`;

    const result = await sql`
      DELETE FROM public.transformers 
      WHERE id = ${normalizedId}
      RETURNING *;
    `;

    if (result.length === 0) {
      return Response.json({ success: false, error: 'Transformer not found' }, { status: 404 });
    }

    return Response.json({ success: true, message: 'Metadata deleted successfully' });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
