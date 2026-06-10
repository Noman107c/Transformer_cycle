import { NextResponse } from 'next/server';
import { transformersTable, sensorTable } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const pageParam = searchParams.get('page');

    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const limit = Math.max(1, parseInt(limitParam || '10', 10) || 10);
    const offset = (page - 1) * limit;

    const { data: rows, error: rowsErr } = await transformersTable()
      .select('id, name, location, type, capacity, status, is_active')
      .eq('is_active', true)
      .order('id', { ascending: true });

    if (rowsErr) throw rowsErr;
    if (!rows) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { total: 0, page, limit, pages: 0 },
      });
    }

    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / limit));

    const pageRows = rows.slice(offset, offset + limit);

    // Fetch latest sensor reading for each transformer
    const transformers = await Promise.all(
      pageRows.map(async (row: any) => {
        let hi: number | null = null;
        let temp: number | null = null;
        let predictedHi: number | null = null;

        try {
          // Map T18 -> transformer_18
          const tableNum = row.id.replace(/\D/g, '');
          const tableName = `transformer_${tableNum}`;

          const { data: rows, error: sensorErr } = await sensorTable(tableName)
            .select('HI, Ambient_Temperature_C, Predicted_HI, Timestamp')
            .order('Timestamp', { ascending: false })
            .limit(1);

          if (!sensorErr && rows && rows.length > 0) {
            hi = rows[0].HI;
            temp = rows[0].Ambient_Temperature_C;
            predictedHi = rows[0].Predicted_HI;
          }
        } catch {
          // Table might not exist yet or be empty — silently skip
        }

        // Map to frontend status: healthy | warning | critical
        let healthState: 'healthy' | 'warning' | 'critical' = 'healthy';
        if (hi !== null) {
          if (hi < 0.55) healthState = 'critical';
          else if (hi < 0.70) healthState = 'warning';
          else healthState = 'healthy';
        }

        // healthScore expected by frontend (0-100 scale)
        const healthScore = (hi ?? 0) * 100;

        return {
          _id: row.id,
          id: row.id,
          name: row.name,
          location: row.location,
          type: row.type,
          capacity: row.capacity,
          status: healthState,
          healthScore,
          temperature: temp ?? 0,
          oilLevel: 0, // Column not in provided SQL schema
          rul: Math.round((predictedHi ?? 0) * 3650), // Using predicted HI as a base for RUL days
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: transformers,
      pagination: { total, page, limit, pages },
    });
  } catch (err: any) {
    console.error("Error in GET /api/transformers:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
