import { type NextRequest, NextResponse } from 'next/server';
import { transformersTable, sensorTable } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/admin/transformers
export async function GET(_request: NextRequest) {
  try {
    const { data: metaRows, error: metaErr } = await transformersTable()
      .select('*')
      .order('id', { ascending: true });

    if (metaErr) throw metaErr;
    if (!metaRows || metaRows.length === 0) return NextResponse.json({ success: true, data: [] });

    const enriched = await Promise.all(
      (metaRows as any[]).map(async (meta: any) => {
        try {
          // Map ID 'T18' to table 'transformer_18'
          const tableNum = meta.id.replace(/\D/g, '');
          const tableName = `transformer_${tableNum}`;

          const { data: rows, error: sensorErr } = await (supabaseAdmin as any)
            .from(tableName)
            .select('Timestamp, HI, Ambient_Temperature_C, Age_yr, Current_A, Voltage_kV, Predicted_HI, Maintenance_Count, No_of_Short_Circuits, Outages_hours_per_year, Temp_score, Age_score, Maintenance_score, ShortCircuit_score, Outage_score, Current_score, Voltage_score')
            .order('Timestamp', { ascending: false })
            .limit(1);

          if (sensorErr || !rows || rows.length === 0) return meta;

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
            status:                 liveStatus,
            healthIndex:            hi !== null ? hi * 100 : 0,
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
  }
}

// POST /api/admin/transformers
// Auto-generates transformer ID, inserts metadata row,
// creates the sensor data table via RPC, enables RLS, and adds the allow-read policy.
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
    const { data: existing } = await transformersTable().select('id');
    const nums = (existing ?? [])
      .map((r: any) => parseInt(String(r.id).replace(/\D/g, ''), 10))
      .filter((n: number) => !isNaN(n));
    const nextNum   = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    const newId     = `T${nextNum}`;
    const tableName = `transformer_${nextNum}`;

    // ── 2. Insert metadata row ─────────────────────────────────────
    const { data: row, error: insertErr } = await transformersTable()
      .insert({
        id:        newId,
        name:      name.trim(),
        location:  location?.trim() || '',
        type:      type || 'Distribution',
        capacity:  Number(capacity) || 50,
        status:    status || 'GOOD',
        is_active: true,
      })
      .select('id, name, location, type, capacity, status, is_active, created_at, updated_at')
      .single();

    if (insertErr) {
      if (insertErr.message?.includes('duplicate') || insertErr.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'A transformer with this ID already exists' },
          { status: 409 }
        );
      }
      throw insertErr;
    }

    // ── 3. Create the sensor data table via SQL (requires service-role or RPC) ──
    // Calls a SECURITY DEFINER RPC function. See walkthrough.md for SQL to create it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcErr } = await (supabaseAdmin as any).rpc('create_transformer_table', {
      p_table_name: tableName,
    });

    // also keep explicit reference if RPC fails due to missing privileges
    if (rpcErr) {
      return NextResponse.json(
        { success: false, error: `Failed to create sensor table: ${rpcErr.message}` },
        { status: 500 }
      );
    }

    /* unreachable */
    if (false) {
      // kept to preserve previous console.warn block structure
      console.warn('create_transformer_table RPC failed (table may already exist or RPC not set up)');
    }

    return NextResponse.json({ success: true, data: row, assignedId: newId }, { status: 201 });
  } catch (err: any) {
    console.error("Error in POST /api/admin/transformers:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}