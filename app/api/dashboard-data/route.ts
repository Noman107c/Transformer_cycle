import { NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';
import { tableExists } from '@/lib/transformerService';


function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeNumber(v: any, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function statusFromHI(hi: number) {
  if (hi < 0.55) return 'CRITICAL';
  if (hi < 0.70) return 'WARNING';
  if (hi < 0.80) return 'MONITOR';
  return 'GOOD';
}

function toTransformerId(idxOrId: number | string) {
  if (typeof idxOrId === 'string') {
    const t = idxOrId.trim();
    if (/^TRF-\d+$/i.test(t)) return t.toUpperCase();
    if (/^T\d+$/i.test(t)) {
      const n = Number(t.slice(1));
      return `TRF-${String(n).padStart(2, '0')}`;
    }
    return t;
  }
  return `TRF-${String(idxOrId).padStart(2, '0')}`;
}

export async function GET() {
  try {
    // 1. Get metadata for all active transformers from information_schema
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'transformer_%'
      ORDER BY table_name ASC
    `;

    const loadedTransformers: any[] = [];
    const allHistory: any[] = [];

    // 2. Fetch data sequentially (safer, prevents connection exhaustion)
    for (const t of tables) {
      const tableName = t.table_name;
      const numMatch = tableName.match(/transformer_(\d+)/);
      if (!numMatch) continue;
      
      const tableNum = parseInt(numMatch[1], 10);
      const trfId = `TRF-${String(tableNum).padStart(2, '0')}`;

      const readings = await sql.unsafe(`
        SELECT * FROM ${tableName}
        ORDER BY "Timestamp" DESC
        LIMIT 120
      `);

      if (readings.length > 0) {
        // Reversing because we got them DESC but want chronologically ascending for the dashboard slice
        const chronologicalReadings = [...readings].reverse();
        const latest = readings[0];

        const hi01 = safeNumber(latest.HI, 0);
        const status = statusFromHI(hi01);

        const mappedReadings = chronologicalReadings.map((r: any) => ({
          ...r,
          Transformer: trfId,
          Time: r.Timestamp,
        }));

        allHistory.push(...mappedReadings);

        const ambient = safeNumber(latest.Ambient_Temperature_C, 0);
        const ageYr = safeNumber(latest.Age_yr, 0);
        const weightageOverall = clamp(100 - hi01 * 100 + ageYr * 1.5 + ambient * 0.1, 0, 100);
        const rulYears = clamp((hi01 * 0.2 + (1 - ageYr) * 0.02) * 10, 0.1, 20);
        const rulDays = rulYears * 365;

        loadedTransformers.push({
          id: trfId, 
          name: `Transformer ${tableNum}`, 
          status, 
          healthIndex: hi01 * 100, 
          ambientTemperatureC: ambient,
          ageYr, 
          capacity: 50,
          location: 'N/A', 
          type: 'Distribution',
          lastMaintenance: String(latest.Timestamp), 
          readings: mappedReadings,
          weightageOverall, 
          rulDays, 
          rulYears,
        });
      }
    }

    allHistory.sort((a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime());
    loadedTransformers.sort((a, b) => a.id.localeCompare(b.id));

    return NextResponse.json({
      success: true,
      data: {
        transformers: loadedTransformers,
        history: allHistory
      }
    });
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
