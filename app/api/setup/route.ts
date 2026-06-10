import { NextResponse } from 'next/server';
import { supabase, transformersTable } from '@/lib/supabase';

/**
 * GET /api/setup
 *
 * Creates the `transformers` metadata table and all 25 sensor tables.
 *
 * NOTE: Creating tables requires DDL privileges. Use a Supabase RPC function
 * (SECURITY DEFINER) for each operation. Create these in the Supabase SQL editor:
 *
 *   -- 1. Create the main metadata table
 *   CREATE OR REPLACE FUNCTION create_transformers_meta_table()
 *   RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
 *   BEGIN
 *     CREATE TABLE IF NOT EXISTS public.transformers (
 *       id         VARCHAR(50) PRIMARY KEY,
 *       name       VARCHAR(100),
 *       location   VARCHAR(200),
 *       type       VARCHAR(50),
 *       capacity   NUMERIC,
 *       status     VARCHAR(50),
 *       is_active  BOOLEAN DEFAULT true,
 *       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 *     );
 *   END;
 *   $$;
 *
 *   -- 2. Create a sensor data table for one transformer
 *   CREATE OR REPLACE FUNCTION create_transformer_table(p_table_name text)
 *   RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
 *   BEGIN
 *     EXECUTE format($f$
 *       CREATE TABLE IF NOT EXISTS public.%I (
 *         "Timestamp"              timestamp,
 *         "Ambient_Temperature_C"  double precision,
 *         "Age_yr"                 int,
 *         "Maintenance_Count"      int,
 *         "No_of_Short_Circuits"   int,
 *         "Outages_hours_per_year" double precision,
 *         "Current_A"              double precision,
 *         "Voltage_kV"             double precision,
 *         "Temp_score"             double precision,
 *         "Age_score"              double precision,
 *         "Maintenance_score"      double precision,
 *         "ShortCircuit_score"     double precision,
 *         "Outage_score"           double precision,
 *         "Current_score"          double precision,
 *         "Voltage_score"          double precision,
 *         "HI"                     double precision,
 *         "Predicted_HI"           double precision
 *       )
 *     $f$, p_table_name);
 *   END;
 *   $$;
 */
export async function GET() {
  try {
    // ── 1. Create metadata table ───────────────────────────────────
    const { error: metaErr } = await supabase.rpc('create_transformers_meta_table');
    if (metaErr) {
      console.warn('create_transformers_meta_table RPC warning:', metaErr.message);
    }

    // ── 2. Seed dummy transformer rows if table is empty ──────────
    const { count } = await transformersTable()
      .select('*', { count: 'exact', head: true });

    if ((count ?? 0) === 0) {
      const seeds = Array.from({ length: 25 }, (_, i) => ({
        id:        `TR-${String(i + 1).padStart(3, '0')}`,
        name:      `Transformer ${i + 1}`,
        location:  `Station ${i + 1}`,
        type:      'Distribution',
        capacity:  500,
        status:    'GOOD',
        is_active: true,
      }));

      const { error: seedErr } = await transformersTable().insert(seeds);
      if (seedErr) console.warn('Seeding warning:', seedErr.message);
    }

    // ── 3. Create sensor tables 1–25 via RPC ──────────────────────
    for (let i = 1; i <= 25; i++) {
      const { error: tblErr } = await supabase.rpc('create_transformer_table', {
        p_table_name: `transformer_${i}`,
      });
      if (tblErr) {
        console.warn(`create_transformer_table(transformer_${i}) warning:`, tblErr.message);
      }
    }

    return NextResponse.json({ success: true, message: 'Created tables' });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
