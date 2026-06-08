import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';

/**
 * DELETE /api/admin/transformers/[id]/cascade
 *
 * Drops the sensor data table (e.g. transformer_3) for the given transformer ID.
 * Call this BEFORE deleting the row from the `transformers` metadata table.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Extract numeric part from id (handles T1, T01, TRF-01, etc.)
    const numMatch = id.match(/\d+/);
    if (!numMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid transformer ID — no numeric part found' },
        { status: 400 }
      );
    }
    const tableNum = parseInt(numMatch[0], 10);
    const tableName = `transformer_${tableNum}`;

    // Drop the sensor data table if it exists
    await sql`DROP TABLE IF EXISTS public.${sql(tableName)} CASCADE`;

    return NextResponse.json({
      success: true,
      message: `Table "${tableName}" dropped (if it existed).`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
