import { NextResponse } from 'next/server';
import { getAllTransformersWithMeanData } from '@/lib/transformerService';

/**
 * GET /api/transformers
 * Public endpoint — no authentication required.
 * Returns all transformer metadata enriched with mean HI / temp from their sensor tables.
 */
export async function GET() {
  try {
    const data = await getAllTransformersWithMeanData();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in GET /api/transformers:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
