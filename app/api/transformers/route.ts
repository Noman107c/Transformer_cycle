import { NextResponse } from 'next/server';
import { transformersTable, sensorTable } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');

    const { data: rows, error: rowsErr } = await transformersTable()
      .select('id, name, location, type, capacity, status, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('id', { ascending: true });

    if (rowsErr) throw rowsErr;
    if (!rows) return NextResponse.json({ success: true, data: [] });

    // Fetch latest sensor reading for each transformer
    const transformers = await Promise.all(
      rows.map(async (row) => {
        let hi: number | null = null;
        let temp: number | null = null;
        let age: number | null = null;
        let time: string | null = null;

        const numMatch = row.id.match(/\d+/);
        if (numMatch) {
          try {
            const { data: latest } = await sensorTable(row.id)
              .select('HI, Ambient_Temperature_C, Age_yr, Timestamp')
              .order('Timestamp', { ascending: false })
              .limit(1)
              .single();

            if (latest) {
              hi   = latest.HI;
              temp = latest.Ambient_Temperature_C;
              age  = latest.Age_yr;
              time = latest.Timestamp;
            }
          } catch {
            // Table might not exist yet or be empty — silently skip
          }
        }

        // Derive live status from health index if data exists
        let currentStatus = row.status || 'UNKNOWN';
        if (hi !== null) {
          if      (hi < 0.55) currentStatus = 'CRITICAL';
          else if (hi < 0.70) currentStatus = 'WARNING';
          else if (hi < 0.80) currentStatus = 'MONITOR';
          else                currentStatus = 'GOOD';
        }

        return {
          _id:                row.id,
          id:                 row.id,
          name:               row.name,
          transformerId:      row.id,
          location:           row.location,
          type:               row.type,
          capacity:           row.capacity,
          status:             currentStatus,
          healthIndex:        hi,
          ambientTemperatureC: temp,
          ageYr:              age,
          lastMaintenance:    time,
        };
      })
    );

    let list = transformers;
    if (limit) {
      list = list.slice(0, parseInt(limit));
    }

    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
