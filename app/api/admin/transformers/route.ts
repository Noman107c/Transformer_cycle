import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';
import { getTimestamp } from 'swr/_internal';

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch existing registered transformers from metadata table
    const finalRows = await sql`
      SELECT Timestamp, HI, Predicted_HI, Temp_score, Age_score, Maintenance_score, ShortCircuit_score, Outage_score, Current_score, Voltage_score
      FROM public.transformer_1
      ORDER BY Timestamp DESC
    `;

    // 2. Fetch the latest telemetry record for each transformer
    const enrichedRows = await Promise.all(finalRows.map(async (row: any) => {
      const numId = row.id.match(/\d+/)?.[0] ?? row.id;
      const tableName = `transformer_${numId}`;
      let latestData = null;
      try {
        // use sql(tableName) directly without public. prefix to avoid syntax errors with postgres template literal
        const [data] = await sql`SELECT * FROM ${sql(tableName)} ORDER BY "Timestamp" DESC LIMIT 1`;
        if (data) {
          latestData = data;
        }
      } catch (e) {
        // Table might not exist or be empty
      }
      return { ...row, ...latestData };
    }));

    return NextResponse.json({ success: true, data: enrichedRows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { Timestamp, HI, Predicted_HI, Temp_score, Age_score, Maintenance_score, ShortCircuit_score, Outage_score, Current_score, Voltage_score } = body;

    if (!Timestamp || !HI || !Predicted_HI || !Temp_score || !Age_score || !Maintenance_score || !ShortCircuit_score || !Outage_score || !Current_score || !Voltage_score) {
      return NextResponse.json({ success: false, error: 'ID and name are required' }, { status: 400 });
    }

    const [row] = await sql`
      INSERT INTO public.transformer_1 (Timestamp, HI, Predicted_HI, Temp_score, Age_score, Maintenance_score, ShortCircuit_score, Outage_score, Current_score, Voltage_score)
        VALUES (
        ${Timestamp},
        ${HI},  
        ${Predicted_HI},
        ${Temp_score},
        ${Age_score},
        ${Maintenance_score},
        ${ShortCircuit_score},
        ${Outage_score},
        ${Current_score},
        ${Voltage_score}
      )
      RETURNING Timestamp
    `;
    
    return NextResponse.json({ success: true, Timestamp: row.Timestamp }, { status: 201 });
  } catch (err: any) {
    if (err.message?.includes('duplicate key') || err.message?.includes('unique')) {
      return NextResponse.json({ success: false, error: 'Transformer already exists' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
