import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getChartData } from '@/lib/transformerService';

const paramsSchema = z.object({
  id: z.string().regex(/^(?:transformer_)?\d+$/, { message: 'Invalid Transformer ID' }),
});

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(1000).default(100),
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

    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!queryValidation.success) {
      return NextResponse.json(
        { success: false, error: queryValidation.error.errors[0]?.message || 'Invalid query parameters' },
        { status: 400 }
      );
    }

    const { limit } = queryValidation.data;

    console.log(`[GET] /api/transformers/${id}/chart - Limit: ${limit}`);

    const data = await getChartData(id, limit);

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
    console.error('Error in GET /api/transformers/[id]/chart:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
