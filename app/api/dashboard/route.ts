import sql from '@/lib/postgres';

type TransformerStatus = 'GOOD' | 'MONITOR' | 'WARNING' | 'CRITICAL';

function statusFromHI(hi01: number): TransformerStatus {
  if (hi01 < 0.55) return 'CRITICAL';
  if (hi01 < 0.7) return 'WARNING';
  if (hi01 < 0.8) return 'MONITOR';
  return 'GOOD';
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeNumber(v: any, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toTransformerId(idxOrId: number | string) {
  if (typeof idxOrId === 'string') {
    const t = idxOrId.trim();
    if (/^TRF-\d+$/i.test(t)) return t.toUpperCase();
    if (/^T\d+$/i.test(t)) {
      const n = Number(t.slice(1));
      return `TRF-${String(n).padStart(2, '0')}`;
    }
    const match = t.match(/\d+/);
    if (match) {
      return `TRF-${String(match[0]).padStart(2, '0')}`;
    }
    return t;
  }
  return `TRF-${String(idxOrId).padStart(2, '0')}`;
}

export async function GET() {
  try {
    // 1. Fetch active transformers metadata
    const activeTransformers = await sql`
      SELECT * FROM public.transformers 
      WHERE is_active = true 
      ORDER BY id ASC;
    `;

    const loadedTransformers: any[] = [];
    const allHistory: any[] = [];

    // 2. Fetch readings for each transformer in parallel
    await Promise.all(
      activeTransformers.map(async (t) => {
        const num = t.id.replace(/\D/g, '');
        const tableName = `transformer_${num}`;
        const trfId = toTransformerId(t.id);

        try {
          // Fetch up to 500 rows to calculate statistics
          const readings = await sql`
            SELECT * FROM public.${sql(tableName)}
            ORDER BY "Timestamp" ASC;
          `;

          if (readings.length > 0) {
            // Find maxTime and filter last 365 days
            const times = readings.map((r) => new Date(r.Timestamp).getTime());
            const maxTime = Math.max(...times.filter((time) => !isNaN(time)));
            const oneYearAgo = maxTime - 365 * 24 * 60 * 60 * 1000;

            const filteredReadings = readings.filter(
              (r) => new Date(r.Timestamp).getTime() >= oneYearAgo
            );

            if (filteredReadings.length > 0) {
              const latest = filteredReadings[filteredReadings.length - 1];
              const hi01 = safeNumber(latest.HI, 0.85);
              const status = statusFromHI(hi01);

              const mappedReadings = filteredReadings.slice(-120).map((r) => ({
                Transformer: trfId,
                Time: r.Timestamp,
                HI: safeNumber(r.HI, hi01),
                Ambient_Temperature_C: safeNumber(r.Ambient_Temperature_C, safeNumber(latest.Ambient_Temperature_C)),
                Age_yr: safeNumber(r.Age_yr, safeNumber(latest.Age_yr)),
                Outages_hours_per_year: safeNumber(r.Outages_hours_per_year, safeNumber(latest.Outages_hours_per_year)),
                Current_A: safeNumber(r.Current_A, safeNumber(latest.Current_A)),
                Voltage_kV: safeNumber(r.Voltage_kV, safeNumber(latest.Voltage_kV)),
                Predicted_HI: safeNumber(r.Predicted_HI, safeNumber(latest.Predicted_HI)),
                Maintenance_Count: safeNumber(r.Maintenance_Count, safeNumber(latest.Maintenance_Count)),
                Short_Circuits: safeNumber(r.No_of_Short_Circuits, safeNumber(latest.No_of_Short_Circuits)),
                No_of_Short_Circuits: safeNumber(r.No_of_Short_Circuits, safeNumber(latest.No_of_Short_Circuits)),
                Temp_score: safeNumber(r.Temp_score, safeNumber(latest.Temp_score)),
                Age_score: safeNumber(r.Age_score, safeNumber(latest.Age_score)),
                Maintenance_score: safeNumber(r.Maintenance_score, safeNumber(latest.Maintenance_score)),
                ShortCircuit_score: safeNumber(r.ShortCircuit_score, safeNumber(latest.ShortCircuit_score)),
                Outage_score: safeNumber(r.Outage_score, safeNumber(latest.Outage_score)),
                Current_score: safeNumber(r.Current_score, safeNumber(latest.Current_score)),
                Voltage_score: safeNumber(r.Voltage_score, safeNumber(latest.Voltage_score)),
              }));

              allHistory.push(...mappedReadings);

              const ambient = safeNumber(latest.Ambient_Temperature_C, 25);
              const ageYr = safeNumber(latest.Age_yr, 5);
              const weightageOverall = clamp(100 - hi01 * 100 + ageYr * 1.5 + ambient * 0.1, 0, 100);
              const rulYears = clamp((hi01 * 0.2 + (1 - ageYr) * 0.02) * 10, 0.1, 20);
              const rulDays = rulYears * 365;

              loadedTransformers.push({
                id: trfId,
                name: t.name || trfId,
                status,
                healthIndex: hi01 * 100,
                ambientTemperatureC: ambient,
                ageYr,
                capacity: safeNumber(t.capacity, 50),
                location: t.location || 'N/A',
                type: t.type || 'N/A',
                lastMaintenance: String(latest.Timestamp),
                readings: mappedReadings,
                weightageOverall,
                rulDays,
                rulYears,
              });
            }
          }
        } catch (err) {
          // Table empty or error reading
        }
      })
    );

    // Sort combined history DESC
    allHistory.sort((a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime());
    loadedTransformers.sort((a, b) => a.id.localeCompare(b.id));

    return Response.json({
      success: true,
      transformers: loadedTransformers,
      history: allHistory,
    });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
