import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';

export async function GET(request: NextRequest) {
  try {
    // Auto-create the metadata table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS public.transformers (
        id varchar PRIMARY KEY,
        name varchar NOT NULL,
        location varchar,
        type varchar,
        capacity integer,
        status varchar,
        is_active boolean DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `;

    const rows = await sql`
      SELECT id, name, location, type, capacity, status, is_active, created_at, updated_at
      FROM public.transformers
      ORDER BY id ASC
    `;
    return NextResponse.json({ success: true, data: rows });
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

    // Auto-create the metadata table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS public.transformers (
        id varchar PRIMARY KEY,
        name varchar NOT NULL,
        location varchar,
        type varchar,
        capacity integer,
        status varchar,
        is_active boolean DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `;

    // Also auto-create the data table for this specific transformer!
    const tableName = `transformer_${id.replace(/\D/g, '') || id}`;
    await sql`
      CREATE TABLE IF NOT EXISTS public.${sql(tableName)} (
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
    `;

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
