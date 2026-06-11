import sql from '@/lib/postgres';

export async function GET() {
  try {
    const transformers = await sql`
      SELECT * FROM public.transformers 
      ORDER BY id ASC;
    `;

    const data = await Promise.all(
      transformers.map(async (t) => {
        const num = t.id.replace(/\D/g, '');
        const tableName = `transformer_${num}`;

        let latest = null;
        try {
          const readings = await sql`
            SELECT * FROM public.${sql(tableName)}
            ORDER BY "Timestamp" DESC
            LIMIT 1;
          `;
          if (readings.length > 0) {
            latest = readings[0];
          }
        } catch (err) {
          // Table may not exist or be empty
        }

        return {
          id: t.id,
          name: t.name,
          location: t.location || '',
          type: t.type || 'Distribution',
          capacity: t.capacity || 50,
          status: t.status || 'GOOD',
          is_active: t.is_active,
          created_at: t.created_at,
          updated_at: t.updated_at,
          // Live readings fields
          Timestamp: latest ? latest.Timestamp : null,
          Ambient_Temperature_C: latest ? latest.Ambient_Temperature_C : null,
          Age_yr: latest ? latest.Age_yr : null,
          Maintenance_Count: latest ? latest.Maintenance_Count : null,
          No_of_Short_Circuits: latest ? latest.No_of_Short_Circuits : null,
          Outages_hours_per_year: latest ? latest.Outages_hours_per_year : null,
          Current_A: latest ? latest.Current_A : null,
          Voltage_kV: latest ? latest.Voltage_kV : null,
          Temp_score: latest ? latest.Temp_score : null,
          Age_score: latest ? latest.Age_score : null,
          Maintenance_score: latest ? latest.Maintenance_score : null,
          ShortCircuit_score: latest ? latest.ShortCircuit_score : null,
          Outage_score: latest ? latest.Outage_score : null,
          Current_score: latest ? latest.Current_score : null,
          Voltage_score: latest ? latest.Voltage_score : null,
          HI: latest ? latest.HI : null,
          Predicted_HI: latest ? latest.Predicted_HI : null,
        };
      })
    );

    return Response.json({ success: true, data });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, location, type, capacity, status } = await request.json();

    if (!name || !name.trim()) {
      return Response.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    let assignedId = '';
    
    // Perform transactional table creation and metadata persistence
    await sql.begin(async (tx) => {
      // 1. Fetch count or max number to determine the next transformer number
      // We check existing tables in the database or in metadata to make it extremely robust.
      const existingTables = await tx`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name LIKE 'transformer_%';
      `;
      
      let maxNum = 0;
      existingTables.forEach(row => {
        const num = parseInt(row.table_name.replace(/\D/g, ''), 10);
        if (num > maxNum) maxNum = num;
      });

      const nextNum = maxNum + 1;
      assignedId = `transformer_${nextNum}`;
      const tableName = `transformer_${nextNum}`;

      // 2. Create the table matching the schema
      await tx`
        CREATE TABLE public.${tx(tableName)} (
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

      // 3. Create indices
      const indexName = `${tableName}_timestamp_idx`;
      await tx`
        CREATE INDEX ${tx(indexName)} 
        ON public.${tx(tableName)} ("Timestamp" DESC);
      `;

      // 4. Enable Row Level Security (RLS)
      await tx`
        ALTER TABLE public.${tx(tableName)} ENABLE ROW LEVEL SECURITY;
      `;

      // 5. Create SELECT policy
      // In Supabase, TO public USING (true) allows everyone to read
      await tx`
        CREATE POLICY "allow read" ON public.${tx(tableName)}
        FOR SELECT TO public USING (true);
      `;

      // 6. Insert metadata into public.transformers
      await tx`
        INSERT INTO public.transformers (id, name, location, type, capacity, status, is_active)
        VALUES (${assignedId}, ${name}, ${location || ''}, ${type || 'Distribution'}, ${capacity || 50}, ${status || 'GOOD'}, true);
      `;
    });

    return Response.json({ success: true, assignedId, data: { id: assignedId } });
  } catch (err: any) {
    console.error('Error creating transformer:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
