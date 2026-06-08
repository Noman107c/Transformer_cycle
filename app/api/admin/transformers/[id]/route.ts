import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';

// PUT /api/admin/transformers/[id]
// Updates metadata fields for a transformer in the `transformers` table.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, location, type, capacity, status } = body;

    const result = await sql`
      UPDATE public.transformers
      SET
        name        = COALESCE(${name       ?? null}, name),
        location    = COALESCE(${location   ?? null}, location),
        type        = COALESCE(${type       ?? null}, type),
        capacity    = COALESCE(${capacity   ?? null}::numeric, capacity),
        status      = COALESCE(${status     ?? null}, status),
        updated_at  = now()
      WHERE id = ${id}
      RETURNING id, name, location, type, capacity, status, is_active, created_at, updated_at
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Transformer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/transformers/[id]
// Removes a transformer record from the `transformers` metadata table.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await sql`
      DELETE FROM public.transformers
      WHERE id = ${id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Transformer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deletedId: result[0].id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
