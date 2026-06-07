import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, location, type, capacity, status, is_active } = body;

    const result = await sql`
      UPDATE public.transformers
      SET
        name       = COALESCE(${name ?? null}, name),
        location   = COALESCE(${location ?? null}, location),
        type       = COALESCE(${type ?? null}, type),
        capacity   = COALESCE(${capacity != null ? Number(capacity) : null}, capacity),
        status     = COALESCE(${status ?? null}, status),
        is_active  = COALESCE(${is_active != null ? Boolean(is_active) : null}, is_active),
        updated_at = now()
      WHERE id = ${id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: 'Transformer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    
    const result = await sql`
      DELETE FROM public.transformers
      WHERE id = ${id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: 'Transformer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
