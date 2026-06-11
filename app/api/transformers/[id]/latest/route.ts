import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getLatestReading } from '@/lib/transformerService';
const paramsSchema = z.object({
  id: z.string().regex(/^(?:transformer_)?\d+$/, { message: 'Invalid Transformer ID' }),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const paramsValidation = paramsSchema.safeParse(resolvedParams);
    if (!paramsValidation.success) {
      return NextResponse.json(
        { success: false, error: paramsValidation.error.errors[0]?.message || 'Invalid parameters' },
        { status: 400 }
      );
    }

    const { id } = paramsValidation.data;

    console.log(`[GET] /api/transformers/${id}/latest`);

    const data = await getLatestReading(id);

    if (data === null) {
      // Check if table missing or just no records
      // We know getLatestReading returns null if table doesn't exist OR if table is empty
      // Let's check table existence to return 404 or 200 with null
      const { tableExists, getSafeTableName } = await import('@/lib/transformerService');
      const tableName = getSafeTableName(id);
      const exists = await tableExists(tableName);
      if (!exists) {
        return NextResponse.json(
          { success: false, error: `Transformer table transformer_${id} does not exist.` },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error in GET /api/transformers/[id]/latest:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
