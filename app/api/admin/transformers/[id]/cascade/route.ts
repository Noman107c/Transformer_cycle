import { type NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * DELETE /api/admin/transformers/[id]/cascade
 *
 * Drops the sensor data table (e.g. transformer_3) for the given transformer ID.
 * Call this BEFORE deleting the row from the `transformers` metadata table.
 *
 * Requires the following RPC function in Supabase SQL Editor:
 *
 *   CREATE OR REPLACE FUNCTION drop_transformer_table(p_table_name text)
 *   RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
 *   BEGIN
 *     EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', p_table_name);
 *   END;
 *   $$;
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const numMatch = id.match(/\d+/);
    if (!numMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid transformer ID — no numeric part found' },
        { status: 400 }
      );
    }
    const tableNum  = parseInt(numMatch[0], 10);
    const tableName = `transformer_${tableNum}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc('drop_transformer_table', {
      p_table_name: tableName,
    });

    if (error) {
      console.warn('drop_transformer_table RPC error:', error.message);
      // Non-fatal — table may already not exist
    }

    return NextResponse.json({
      success: true,
      message: `Table "${tableName}" dropped (if it existed).`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
