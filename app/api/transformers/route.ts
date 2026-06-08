import { NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    
    const rows = await sql`
      SELECT id, name, location, type, capacity, status, is_active, created_at, updated_at
      FROM public.transformers
      WHERE is_active = true
      ORDER BY id ASC
    `;

    // Fetch latest reading for each transformer
    const transformers = await Promise.all(rows.map(async (row) => {
      let hi = null;
      let temp = null;
      let age = null;
      let time = null;
      
      const numMatch = row.id.match(/\d+/);
      if (numMatch) {
         const tableName = `transformer_${parseInt(numMatch[0], 10)}`;
         try {
           const [latest] = await sql`
             SELECT "HI", "Ambient_Temperature_C", "Age_yr", "Timestamp"
             FROM public.${sql(tableName)}
             ORDER BY "Timestamp" DESC
             LIMIT 1
           `;
           if (latest) {
             hi = latest.HI;
             temp = latest.Ambient_Temperature_C;
             age = latest.Age_yr;
             time = latest.Timestamp;
           }
         } catch (e) {
           // Table might not exist yet or empty
         }
      }

      // Calculate dynamic status based on health index ONLY if data exists
      let currentStatus = row.status || 'UNKNOWN';
      if (hi !== null) {
        if (hi < 0.55) currentStatus = 'CRITICAL';
        else if (hi < 0.70) currentStatus = 'WARNING';
        else if (hi < 0.80) currentStatus = 'MONITOR';
        else currentStatus = 'GOOD';
      }

      return {
        _id: row.id,
        id: row.id,
        name: row.name,
        transformerId: row.id,
        location: row.location,
        type: row.type,
        capacity: row.capacity,
        status: currentStatus,
        healthIndex: hi,
        ambientTemperatureC: temp,
        ageYr: age,
        lastMaintenance: time
      };
    }));

    let list = transformers;
    if (limit) {
      list = list.slice(0, parseInt(limit));
    }
    
    return NextResponse.json({
      success: true,
      data: list
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
