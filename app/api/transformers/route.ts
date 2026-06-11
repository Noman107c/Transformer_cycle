import sql from '@/lib/postgres';

export async function GET() {
  try {
    const transformers = await sql`
      SELECT * FROM public.transformers 
      WHERE is_active = true 
      ORDER BY id ASC;
    `;
    
    const data = await Promise.all(transformers.map(async (t) => {
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
        // Table might not exist or be empty
      }
      
      const padId = String(num).padStart(2, '0');
      
      let status = t.status || 'GOOD';
      if (latest && latest.HI !== null && latest.HI !== undefined) {
        const hi = latest.HI;
        if (hi < 0.55) status = 'CRITICAL';
        else if (hi < 0.70) status = 'WARNING';
        else if (hi < 0.80) status = 'MONITOR';
        else status = 'GOOD';
      }

      return {
        _id: `T${num}`,
        id: t.id,
        name: t.name,
        location: t.location,
        type: t.type,
        capacity: t.capacity,
        status: status,
        is_active: t.is_active,
        created_at: t.created_at,
        updated_at: t.updated_at,
        transformerId: `TRF-${padId}`,
        healthIndex: latest ? latest.HI : 0.85,
        ambientTemperatureC: latest ? latest.Ambient_Temperature_C : 25.0,
        ageYr: latest ? latest.Age_yr : 5.0,
        lastMaintenance: latest ? latest.Timestamp : new Date().toISOString()
      };
    }));

    return Response.json({ success: true, data });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
