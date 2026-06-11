import { NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';
import { tableExists } from '@/lib/transformerService';

export async function GET() {
  try {
    // STEP 1: get all transformer tables (NO metadata table)
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'transformer_%'
      ORDER BY table_name ASC
    `;

    // STEP 2: enrich each transformer table sequentially
    const enriched = [];
    for (const t of tables) {
      const tableName = t.table_name;

      const latestRows = await sql.unsafe(`
        SELECT *
        FROM ${tableName}
        ORDER BY "Timestamp" DESC
        LIMIT 1
      `);

      if (!latestRows.length) continue;

        const latest = latestRows[0];

        const hi: number | null = latest.HI ?? null;

        let liveStatus = 'GOOD';

        if (hi !== null) {
          if (hi < 0.55) liveStatus = 'CRITICAL';
          else if (hi < 0.70) liveStatus = 'WARNING';
          else if (hi < 0.80) liveStatus = 'MONITOR';
          else liveStatus = 'GOOD';
        }

        const id = tableName.replace('transformer_', '');

        return {
          id,
          name: `Transformer ${id}`,

          Timestamp: latest.Timestamp,
          Ambient_Temperature_C: latest.Ambient_Temperature_C,
          Age_yr: latest.Age_yr,
          Maintenance_Count: latest.Maintenance_Count,
          No_of_Short_Circuits: latest.No_of_Short_Circuits,
          Outages_hours_per_year: latest.Outages_hours_per_year,
          Current_A: latest.Current_A,
          Voltage_kV: latest.Voltage_kV,
          Temp_score: latest.Temp_score,
          Age_score: latest.Age_score,
          Maintenance_score: latest.Maintenance_score,
          ShortCircuit_score: latest.ShortCircuit_score,
          Outage_score: latest.Outage_score,
          Current_score: latest.Current_score,
          Voltage_score: latest.Voltage_score,
          HI: latest.HI,
          Predicted_HI: latest.Predicted_HI,

          status: liveStatus,
          healthIndex: hi,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enriched.filter(Boolean),
    });
  } catch (error: any) {
    console.error('Error fetching admin dashboard data:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}