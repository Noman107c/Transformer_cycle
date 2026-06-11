import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/postgres';

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid Transformer ID'),
});

const updateMetadataSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional().default(''),
  type: z.string().optional().default('Distribution'),
  capacity: z.coerce.number().int().positive().default(50),
  status: z.string().optional().default('GOOD'),
});

// PUT - Update metadata (SAFE)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validation = paramsSchema.safeParse(params);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid transformer id' },
        { status: 400 }
      );
    }

    const id = Number(validation.data.id);
    const fullId = `transformer_${id}`;

    const body = updateMetadataSchema.safeParse(await request.json());

    if (!body.success) {
      return NextResponse.json(
        { success: false, error: body.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, location, type, capacity, status } = body.data;

    console.log(`[PUT] Updating metadata for ${fullId}`);

    // Check if metadata table exists FIRST
    const exists = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'transformers'
      )
    `;

    if (!exists[0].exists) {
      return NextResponse.json(
        {
          success: false,
          error: 'Metadata table does not exist. Create transformers table first.',
        },
        { status: 404 }
      );
    }

    const result = await sql`
      UPDATE transformers
      SET
        name = ${name},
        location = ${location},
        type = ${type},
        capacity = ${capacity},
        status = ${status},
        updated_at = NOW()
      WHERE id = ${fullId}
      RETURNING *
    `;

    if (!result.length) {
      return NextResponse.json(
        { success: false, error: `${fullId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Safe metadata delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validation = paramsSchema.safeParse(params);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid transformer id' },
        { status: 400 }
      );
    }

    const id = Number(validation.data.id);
    const fullId = `transformer_${id}`;

    console.log(`[DELETE] Removing metadata ${fullId}`);

    const exists = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'transformers'
      )
    `;

    if (!exists[0].exists) {
      return NextResponse.json(
        {
          success: false,
          error: 'Metadata table does not exist',
        },
        { status: 404 }
      );
    }

    const result = await sql`
      DELETE FROM transformers
      WHERE id = ${fullId}
      RETURNING *
    `;

    if (!result.length) {
      return NextResponse.json(
        { success: false, error: `${fullId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}