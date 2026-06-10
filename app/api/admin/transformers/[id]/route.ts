import { NextRequest, NextResponse } from 'next/server';
import { transformersTable } from '@/lib/supabase';

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

    // Build only the fields that were provided
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name      !== undefined) updates.name     = name;
    if (location  !== undefined) updates.location = location;
    if (type      !== undefined) updates.type     = type;
    if (capacity  !== undefined) updates.capacity = Number(capacity);
    if (status    !== undefined) updates.status   = status;

    const { data, error } = await transformersTable()
      .update(updates)
      .eq('id', id)
      .select('id, name, location, type, capacity, status, is_active, created_at, updated_at')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Transformer not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Error in PUT /api/admin/transformers/[id]:", err);
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

    const { data, error } = await transformersTable()
      .delete()
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Transformer not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, deletedId: data.id });
  } catch (err: any) {
    console.error("Error in DELETE /api/admin/transformers/[id]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
