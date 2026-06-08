import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';

// GET /api/admin/transformers
export async function GET(_request: NextRequest) {
  try {
    const metaRows = await sql`
      SELECT id, name, location, type, capacity, status, is_active, created_at, updated_at
      FROM public.transformers
      ORDER BY id ASC
    `;

    const enriched = await Promise.all(
      metaRows.map(async (meta) => {
        const numMatch = meta.id.match(/\d+/);
        if (!numMatch) return meta;
        const tableNum  = parseInt(numMatch[0], 10);
        const tableName = `transformer_${tableNum}`;

        try {
          const [latest] = await sql`
            SELECT * FROM ${sql(tableName)}
            ORDER BY "Timestamp" DESC
            LIMIT 1
          `;
          if (!latest) return meta;

          const hi: number | null = latest.HI ?? null;
          let liveStatus = meta.status;
          if (hi !== null) {
            if      (hi < 0.55) liveStatus = 'CRITICAL';
            else if (hi < 0.70) liveStatus = 'WARNING';
            else if (hi < 0.80) liveStatus = 'MONITOR';
            else                liveStatus = 'GOOD';
          }

          return {
            ...meta,
            Timestamp:              latest.Timestamp,
            Ambient_Temperature_C:  latest.Ambient_Temperature_C,
            Age_yr:                 latest.Age_yr,
            Maintenance_Count:      latest.Maintenance_Count,
            No_of_Short_Circuits:   latest.No_of_Short_Circuits,
            Outages_hours_per_year: latest.Outages_hours_per_year,
            Current_A:              latest.Current_A,
            Voltage_kV:             latest.Voltage_kV,
            Temp_score:             latest.Temp_score,
            Age_score:              latest.Age_score,
            Maintenance_score:      latest.Maintenance_score,
            ShortCircuit_score:     latest.ShortCircuit_score,
            Outage_score:           latest.Outage_score,
            Current_score:          latest.Current_score,
            Voltage_score:          latest.Voltage_score,
            HI:                     latest.HI,
            Predicted_HI:           latest.Predicted_HI,
            status:                 liveStatus,
            healthIndex:            hi,
          };
        } catch {
          return meta;
        }
      })
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/admin/transformers
// Auto-generates transformer ID, inserts metadata row,
// creates the sensor data table, enables RLS, and adds the allow-read policy.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, location, type, capacity, status } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      );
    }

    // ── 1. Auto-generate next numeric ID ──────────────────────────
    const existing = await sql`SELECT id FROM public.transformers`;
    const nums = (existing as any[])
      .map((r) => parseInt(String(r.id).replace(/\D/g, ''), 10))
      .filter((n) => !isNaN(n));
    const nextNum   = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    const newId     = `T${nextNum}`;
    const tableName = `transformer_${nextNum}`;

    // ── 2. Insert metadata row ─────────────────────────────────────
    const [row] = await sql`
      INSERT INTO public.transformers (id, name, location, type, capacity, status, is_active)
      VALUES (
        ${newId},
        ${name.trim()},
        ${location?.trim() || ''},
        ${type || 'Distribution'},
        ${Number(capacity) || 50},
        ${status || 'GOOD'},
        true
      )
      RETURNING id, name, location, type, capacity, status, is_active, created_at, updated_at
    `;

    // ── 3. Create the sensor data table ───────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS public.${sql(tableName)} (
        "Timestamp"              timestamp,
        "Ambient_Temperature_C"  double precision,
        "Age_yr"                 int,
        "Maintenance_Count"      int,
        "No_of_Short_Circuits"   int,
        "Outages_hours_per_year" double precision,
        "Current_A"              double precision,
        "Voltage_kV"             double precision,
        "Temp_score"             double precision,
        "Age_score"              double precision,
        "Maintenance_score"      double precision,
        "ShortCircuit_score"     double precision,
        "Outage_score"           double precision,
        "Current_score"          double precision,
        "Voltage_score"          double precision,
        "HI"                     double precision,
        "Predicted_HI"           double precision
      )
    `;

    // ── 4. Enable RLS + allow-read policy ─────────────────────────
    try {
      await sql`ALTER TABLE public.${sql(tableName)} ENABLE ROW LEVEL SECURITY`;
    } catch { /* may already be enabled */ }

    try {
      await sql`
        CREATE POLICY "allow read"
        ON public.${sql(tableName)}
        FOR SELECT
        USING (true)
      `;
    } catch (pErr: any) {
      // Policy already exists → fine
      if (!pErr.message?.includes('already exists')) {
        console.warn('Policy creation warning:', pErr.message);
      }
    }

    return NextResponse.json({ success: true, data: row, assignedId: newId }, { status: 201 });
  } catch (err: any) {
    if (err.message?.includes('duplicate key') || err.message?.includes('unique')) {
      return NextResponse.json(
        { success: false, error: 'A transformer with this ID already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
