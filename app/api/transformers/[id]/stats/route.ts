import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStats } from '@/lib/transformerService';

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

    console.log(`[GET] /api/transformers/${id}/stats`);

    const data = await getStats(id);

    if (data === null) {
      return NextResponse.json(
        { success: false, error: `Transformer table transformer_${id} does not exist.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error in GET /api/transformers/[id]/stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
