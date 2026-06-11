import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import postgres from 'postgres';

function getDb() {
  return postgres(process.env.DATABASE_URL!, { ssl: 'require' });
}

// GET /api/admin/transformers
export async function GET(_request: NextRequest) {
  const sql = getDb();
  try {
    // Direct postgres query - bypasses PostgREST/schema cache completely
    const metaRows = await sql`
      SELECT id, name, location, type, capacity, status, is_active, created_at, updated_at
      FROM public.transformers
      ORDER BY id ASC
    `;

    if (!metaRows || metaRows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const enriched = await Promise.all(
      metaRows.map(async (meta: any) => {
        try {
          const tableNum = parseInt(String(meta.id).replace(/\D/g, ''), 10);
          const tableName = `transformer_${tableNum}`;

          const rows = await sql.unsafe(`
            SELECT "Timestamp", "HI", "Ambient_Temperature_C", "Age_yr",
                   "Current_A", "Voltage_kV", "Predicted_HI",
                   "Maintenance_Count", "No_of_Short_Circuits",
                   "Outages_hours_per_year", "Temp_score", "Age_score",
                   "Maintenance_score", "ShortCircuit_score", "Outage_score",
                   "Current_score", "Voltage_score"
            FROM public.${tableName}
            ORDER BY "Timestamp" DESC
            LIMIT 1
          `);

          if (!rows || rows.length === 0) return meta;

          const latest = rows[0];
          const hi = typeof latest.HI === 'number' ? latest.HI : null;
          let liveStatus = meta.status;
          if (hi !== null) {
            if (hi < 0.55) liveStatus = 'CRITICAL';
            else if (hi < 0.70) liveStatus = 'WARNING';
            else if (hi < 0.80) liveStatus = 'MONITOR';
            else liveStatus = 'GOOD';
          }

          return {
            ...meta,
            ...latest,
            status: liveStatus,
            healthIndex: hi !== null ? hi * 100 : 0,
          };
        } catch {
          console.error(`Failed to enrich transformer ${meta.id}`);
          return meta;
        }
      })
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (err: any) {
    console.error("Error in GET /api/admin/transformers:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    await sql.end();
  }
}

// POST /api/admin/transformers
// Auto-generates transformer ID, inserts metadata row,
// creates the sensor data table via RPC, enables RLS, and adds the allow-read policy.
export async function POST(request: NextRequest) {
  const sql = getDb();
  try {
    const body = await request.json();
    const { name, location, type, capacity, status } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      );
    }

    // ── 1. Auto-generate next numeric ID via direct postgres ──────────────────────────
    const existing = await sql`SELECT id FROM public.transformers`;
    const nums = (existing ?? [])
      .map((r: any) => parseInt(String(r.id).replace(/\D/g, ''), 10))
      .filter((n: number) => !isNaN(n));
    const nextNum   = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    const newId     = `T${nextNum}`;
    const tableName = `transformer_${nextNum}`;

    // ── 2. Insert metadata row via direct postgres ─────────────────────────────────────
    const inserted = await sql`
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
      ON CONFLICT (id) DO NOTHING
      RETURNING id, name, location, type, capacity, status, is_active, created_at, updated_at
    `;

    if (!inserted || inserted.length === 0) {
      return NextResponse.json(
        { success: false, error: 'A transformer with this ID already exists' },
        { status: 409 }
      );
    }

    const row = inserted[0];

    // ── 3. Create the sensor data table via RPC (service-role) ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcErr } = await (supabaseAdmin as any).rpc('create_transformer_table', {
      p_table_name: tableName,
    });

    if (rpcErr) {
      return NextResponse.json(
        { success: false, error: `Failed to create sensor table: ${rpcErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: row, assignedId: newId }, { status: 201 });
  } catch (err: any) {
    console.error("Error in POST /api/admin/transformers:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    await sql.end();
  }
}