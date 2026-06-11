import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getReadings } from '@/lib/transformerService';

const paramsSchema = z.object({
  id: z.string().regex(/^(?:transformer_)?\d+$/, { message: 'Invalid Transformer ID' }),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
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

    const { page, limit } = queryValidation.data;

    console.log(`[GET] /api/transformers/${id} - Page: ${page}, Limit: ${limit}`);
    
    const result = await getReadings(id, page, limit);

    if (!result) {
      return NextResponse.json(
        { success: false, error: `Transformer table transformer_${id} does not exist.` },
        { status: 404 }
      );
    }

    const totalPages = Math.ceil(result.total / limit);

    return NextResponse.json({
      success: true,
      data: result.readings,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/transformers/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
