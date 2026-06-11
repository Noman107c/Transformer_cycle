import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/postgres';

// -------------------- VALIDATION --------------------
const createTransformerSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional().default(''),
  type: z.string().optional().default('Distribution'),
  capacity: z.coerce.number().int().positive().default(50),
  status: z.string().optional().default('GOOD'),
});

// -------------------- GET ALL TRANSFORMERS --------------------
export async function GET() {
  try {
    // STEP 1: fetch all transformer tables
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'transformer_%'
      ORDER BY table_name ASC
    `;

    const result = [];

    // STEP 2: enrich each transformer
    for (const t of tables) {
      const tableName = t.table_name;

      const latest = await sql.unsafe(`
        SELECT *
        FROM ${tableName}
        ORDER BY "Timestamp" DESC
        LIMIT 1
      `);

      if (!latest.length) continue;

      const row = latest[0];
      const id = tableName.replace('transformer_', '');

      let status = 'GOOD';

      if (row.HI !== null && row.HI !== undefined) {
        if (row.HI < 0.55) status = 'CRITICAL';
        else if (row.HI < 0.70) status = 'WARNING';
        else if (row.HI < 0.80) status = 'MONITOR';
      }

      result.push({
        id,
        name: `Transformer ${id}`,
        status,

        Timestamp: row.Timestamp,
        HI: row.HI,
        Predicted_HI: row.Predicted_HI,
        Voltage_kV: row.Voltage_kV,
        Current_A: row.Current_A,
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[GET transformers error]', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// -------------------- POST CREATE NEW TRANSFORMER --------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createTransformerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, location, type, capacity, status } = parsed.data;

    // STEP 1: find next table number
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'transformer_%'
    `;

    let max = 0;

    for (const t of tables) {
      const match = t.table_name.match(/transformer_(\d+)/);
      if (match) {
        max = Math.max(max, parseInt(match[1]));
      }
    }

    const newId = max + 1;
    const tableName = `transformer_${newId}`;

    // STEP 2: create table
    await sql.unsafe(`
      CREATE TABLE ${tableName} (
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
      )
    `);

    // STEP 3: insert metadata (ONLY if table exists)
    await sql`
      INSERT INTO transformers (id, name, location, type, capacity, status, is_active, created_at, updated_at)
      VALUES (${tableName}, ${name}, ${location}, ${type}, ${capacity}, ${status}, true, NOW(), NOW())
    `;

    return NextResponse.json({
      success: true,
      data: {
        id: tableName,
        name,
      },
    });
  } catch (error: any) {
    console.error('[POST transformer error]', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}