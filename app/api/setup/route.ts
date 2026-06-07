import { NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';

export async function GET() {
  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.transformer (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100),
        location VARCHAR(200),
        type VARCHAR(50),
        capacity NUMERIC,
        status VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Optionally insert 25 dummy metadata records if table is empty
    const [count] = await sql`SELECT count(*) FROM public.transformers`;
    if (Number(count.count) === 0) {
      for (let i = 1; i <= 25; i++) {
        await sql`
          INSERT INTO public.transformers (id, name, location, type, capacity, status, is_active)
          VALUES (
            ${'TR-' + String(i).padStart(3, '0')},
            ${'Transformer ' + i},
            'Station ' || ${i},
            'Distribution',
            500,
            'GOOD',
            true
          )
        `;
      }
    }

    for (let i = 1; i <= 25; i++) {
      const tableName = `transformer_${i}`;
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS public.${tableName} (
          "Timestamp" timestamp,
          "Ambient_Temperature_C" double precision,
          "Age_yr" int,
          "Maintenance_Count" int,
          "No_of_Short_Circuits" int,
          "Outages_hours_per_year" double precision,
          "Current_A" double precision,
          "Voltage_kV" double precision,
          "Temp_score" double precision,
          "Age_score" double precision,
          "Maintenance_score" double precision,
          "ShortCircuit_score" double precision,
          "Outage_score" double precision,
          "Current_score" double precision,
          "Voltage_score" double precision,
          "HI" double precision,
          "Predicted_HI" double precision
        );
      `);
    }

    return NextResponse.json({ success: true, message: 'Created tables' });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
