import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch existing registered transformers from metadata table
    let existingRows: any[] = [];
    try {
      existingRows = await sql`
        SELECT id, name, location, type, capacity, status, is_active, created_at, updated_at
        FROM public.transformers
        ORDER BY id ASC
      `;
    } catch (metaErr: any) {
      console.log('transformers metadata table fetch failed:', metaErr.message);
    }

    const existingIds = new Set(existingRows.map((r: any) => r.id.toLowerCase()));

    // 2. Probe transformer_1 to transformer_25, auto-register missing ones, log failures
    const autoRows: any[] = [];
    for (let i = 1; i <= 25; i++) {
      const tableName = `transformer_${i}`;
      const expectedId = `T${i}`;

      try {
        const sample = await sql`SELECT * FROM public.${sql(tableName)} LIMIT 1`;
        // If this transformer's data table exists but is not in metadata, auto-register it
        if (!existingIds.has(expectedId.toLowerCase())) {
          try {
            const [inserted] = await sql`
              INSERT INTO public.transformers (id, name, location, type, capacity, status, is_active)
              VALUES (
                ${expectedId},
                ${`Transformer ${i}`},
                ${''},
                ${'Distribution'},
                ${100},
                ${'GOOD'},
                true
              )
              ON CONFLICT (id) DO NOTHING
              RETURNING id, name, location, type, capacity, status, is_active, created_at, updated_at
            `;
            if (inserted) {
              autoRows.push(inserted);
              existingIds.add(expectedId.toLowerCase());
            }
          } catch (insertErr: any) {
            console.log(`Auto-register failed for ${expectedId}:`, insertErr.message);
          }
        }
      } catch (err: any) {
        console.log(`[BACKEND] Failed to fetch transformer_${i}: ${err.message}`);
      }
    }

    // 3. Re-fetch metadata to include any newly auto-registered ones
    const finalRows = await sql`
      SELECT id, name, location, type, capacity, status, is_active, created_at, updated_at
      FROM public.transformers
      ORDER BY id ASC
    `;

    return NextResponse.json({ success: true, data: finalRows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, location, type, capacity, status } = body;

    if (!id || !name) {
      return NextResponse.json({ success: false, error: 'ID and name are required' }, { status: 400 });
    }

    const [row] = await sql`
      INSERT INTO public.transformers (id, name, location, type, capacity, status, is_active)
      VALUES (
        ${id.trim().toUpperCase()},
        ${name.trim()},
        ${location?.trim() || ''},
        ${type?.trim() || 'Distribution'},
        ${Number(capacity) || 50},
        ${status || 'GOOD'},
        true
      )
      RETURNING id
    `;
    
    return NextResponse.json({ success: true, id: row.id }, { status: 201 });
  } catch (err: any) {
    if (err.message?.includes('duplicate key') || err.message?.includes('unique')) {
      return NextResponse.json({ success: false, error: 'Transformer ID already exists' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
