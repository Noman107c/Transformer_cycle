require('dotenv').config();
const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:NOMAN03429037282@db.dmdwapogtgwdapohnoaf.supabase.co:5432/postgres';

const sql = postgres(connectionString, { ssl: 'require' });

const locations = [
  'Substation Alpha', 'Substation Beta', 'Substation Gamma', 'Substation Delta',
  'Main Grid North', 'West Distribution Hub', 'East Industrial Park', 'South Grid Terminal'
];
const types = ['Distribution', 'Step-up', 'Step-down', 'Power', 'Auto'];
const capacities = [50, 100, 150, 250, 500];

async function setup() {
  try {
    console.log('Starting database setup...');

    // 1. Create transformers metadata table
    console.log('Creating transformers metadata table...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.transformers (
        id text PRIMARY KEY,
        name text NOT NULL,
        location text,
        type text,
        capacity double precision,
        status text DEFAULT 'GOOD',
        is_active boolean DEFAULT true,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
    `;

    // 2. Loop and create transformer_1 to transformer_25
    for (let i = 1; i <= 25; i++) {
      const tableName = `transformer_${i}`;
      console.log(`Creating table public.${tableName}...`);
      
      await sql`
        CREATE TABLE IF NOT EXISTS public.${sql(tableName)} (
          "Timestamp" timestamp PRIMARY KEY,
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
        );
      `;

      // Create descending index on Timestamp
      const indexName = `${tableName}_timestamp_idx`;
      console.log(`Creating index public.${indexName}...`);
      await sql`
        CREATE INDEX IF NOT EXISTS ${sql(indexName)} 
        ON public.${sql(tableName)} ("Timestamp" DESC);
      `;
    }

    // 3. Seed metadata for 25 transformers
    console.log('Seeding initial 25 transformers into metadata table...');
    for (let i = 1; i <= 25; i++) {
      const id = `transformer_${i}`;
      const name = `Transformer ${i}`;
      const location = locations[(i - 1) % locations.length];
      const type = types[(i - 1) % types.length];
      const capacity = capacities[(i - 1) % capacities.length];

      await sql`
        INSERT INTO public.transformers (id, name, location, type, capacity, status, is_active)
        VALUES (${id}, ${name}, ${location}, ${type}, ${capacity}, 'GOOD', true)
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    console.log('Database setup completed successfully!');
  } catch (err) {
    console.error('Error setting up database:', err.message);
  } finally {
    await sql.end();
  }
}

setup();
