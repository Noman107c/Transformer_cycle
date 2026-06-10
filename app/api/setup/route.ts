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
import { NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });
  try {
    // ── 1. Create metadata table ───────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS public.transformers (
        id         VARCHAR(50) PRIMARY KEY,
        name       VARCHAR(100),
        location   VARCHAR(200),
        type       VARCHAR(50),
        capacity   NUMERIC,
        status     VARCHAR(50),
        is_active  BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // ── 2. Seed dummy transformer rows if table is empty ──────────
    const existing = await sql`SELECT COUNT(*)::int as count FROM public.transformers`;
    const count = existing[0]?.count ?? 0;

    if (count === 0) {
      const locations = [
        'Substation Alpha', 'Substation Beta', 'Substation Gamma', 'Substation Delta',
        'Main Grid North', 'West Distribution Hub', 'East Industrial Park', 'South Grid Terminal'
      ];
      
      const seeds = Array.from({ length: 25 }, (_, i) => ({
        id:        `TR-${String(i + 1).padStart(3, '0')}`,
        name:      `Transformer ${i + 1}`,
        location:  locations[i % locations.length],
        type:      i % 3 === 0 ? 'Step-up' : i % 3 === 1 ? 'Step-down' : 'Distribution',
        capacity:  [50, 100, 150, 250, 500][i % 5],
        status:    'GOOD',
        is_active: true,
      }));

      for (const seed of seeds) {
        await sql`
          INSERT INTO public.transformers (id, name, location, type, capacity, status, is_active)
          VALUES (${seed.id}, ${seed.name}, ${seed.location}, ${seed.type}, ${seed.capacity}, ${seed.status}, ${seed.is_active})
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }

    // ── 3. Create sensor tables 1–25 ──────────────────────
    for (let i = 1; i <= 25; i++) {
      const tableName = `transformer_${i}`;
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS public.${tableName} (
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
        );
      `);
    }

    // ── 4. Reload PostgREST schema cache ──────────────────────
    await sql`NOTIFY pgrst, 'reload schema'`;

    return NextResponse.json({ 
      success: true, 
      message: 'Created tables and reloaded PostgREST cache successfully' 
    });
  } catch (error: any) {
    console.error("Error in GET /api/setup:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    await sql.end();
  }
}
