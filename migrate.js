require('dotenv').config();
const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });

async function migrate() {
  try {
    console.log('Creating transformer_readings table...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.transformer_readings (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        transformer_id varchar NOT NULL REFERENCES public.transformers(id) ON DELETE CASCADE,
        "Timestamp" timestamp NOT NULL,
        "Ambient_Temperature_C" double precision,
        "Age_yr" double precision,
        "Maintenance_Count" double precision,
        "No_of_Short_Circuits" double precision,
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
    `;

    console.log('Creating index...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_transformer_readings_trf_time 
      ON public.transformer_readings(transformer_id, "Timestamp" DESC);
    `;

    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sql.end();
  }
}

migrate();
