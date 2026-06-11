import { sql } from './postgres';
import { TransformerReading, StatsData, HealthMetrics } from './types';

// Helper to validate and get safe table name
export function getSafeTableName(transformerId: string): string {
  const cleanId = String(transformerId).trim();
  const match = cleanId.match(/^(?:transformer_)?(\d+)$/);
  if (!match || !match[1]) {
    throw new Error('Invalid transformer ID format. Must contain digits only or be in transformer_N format.');
  }
  return `transformer_${match[1]}`;
}

// Helper to check if a table exists in public schema
export async function tableExists(tableName: string): Promise<boolean> {
  const result = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ${tableName}
    )
  `;
  return result[0]?.exists || false;
}

export async function getReadings(
  transformerId: string,
  page: number,
  limit: number
): Promise<{ readings: TransformerReading[]; total: number } | null> {
  const tableName = getSafeTableName(transformerId);
  const exists = await tableExists(tableName);
  if (!exists) return null;

  const offset = (page - 1) * limit;

  // Fetch count
  const countResult = await sql`
    SELECT COUNT(*)::int as total FROM ${sql(tableName)}
  `;
  const total = countResult[0]?.total || 0;

  // Fetch paginated readings
  const readings = await sql<TransformerReading[]>`
    SELECT * FROM ${sql(tableName)}
    ORDER BY "Timestamp" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return { readings, total };
}

export async function getLatestReading(transformerId: string): Promise<TransformerReading | null> {
  const tableName = getSafeTableName(transformerId);
  const exists = await tableExists(tableName);
  if (!exists) return null;

  const result = await sql<TransformerReading[]>`
    SELECT * FROM ${sql(tableName)}
    ORDER BY "Timestamp" DESC
    LIMIT 1
  `;

  return result[0] || null;
}

export async function getChartData(transformerId: string, limit = 100): Promise<TransformerReading[] | null> {
  const tableName = getSafeTableName(transformerId);
  const exists = await tableExists(tableName);
  if (!exists) return null;

  // Fetch latest N records first, then sort them in ascending order for charting
  const result = await sql<TransformerReading[]>`
    SELECT "Timestamp", "HI", "Predicted_HI", "Ambient_Temperature_C", "Current_A", "Voltage_kV"
    FROM ${sql(tableName)}
    ORDER BY "Timestamp" DESC
    LIMIT ${limit}
  `;

  return result.reverse();
}

export async function getStats(transformerId: string): Promise<StatsData | null> {
  const tableName = getSafeTableName(transformerId);
  const exists = await tableExists(tableName);
  if (!exists) return null;

  const result = await sql`
    SELECT 
      AVG("HI")::double precision as avg_hi, 
      AVG("Predicted_HI")::double precision as avg_predicted_hi, 
      MAX("HI")::double precision as max_hi, 
      MIN("HI")::double precision as min_hi, 
      COUNT(*)::int as count 
    FROM ${sql(tableName)}
  `;

  const stats = result[0];
  if (!stats) return null;

  return {
    avgHI: stats.avg_hi,
    avgPredictedHI: stats.avg_predicted_hi,
    maxHI: stats.max_hi,
    minHI: stats.min_hi,
    recordCount: stats.count || 0,
  };
}

export async function getHealthMetrics(transformerId: string): Promise<HealthMetrics | null> {
  const latest = await getLatestReading(transformerId);
  if (!latest) return null;

  const hi = latest.HI;
  let status: HealthMetrics['status'] = 'UNKNOWN';
  if (hi !== null && hi !== undefined) {
    if (hi < 0.55) status = 'CRITICAL';
    else if (hi < 0.70) status = 'WARNING';
    else if (hi < 0.80) status = 'MONITOR';
    else status = 'GOOD';
  }

  return {
    status,
    healthIndex: hi,
    ageYr: latest.Age_yr,
    ambientTemp: latest.Ambient_Temperature_C,
    currentA: latest.Current_A,
    voltageKV: latest.Voltage_kV,
    lastUpdated: latest.Timestamp,
  };
}

export async function getAllTransformersWithMeanData() {
  const metaRows = await sql`
    SELECT * FROM transformer
    ORDER BY Timestamp ASC
  `;

  const enriched = await Promise.all(
    metaRows.map(async (meta: any) => {
      const match = meta.id.match(/\d+/);
      if (!match) return { ...meta, avg_hi: null, avg_temp: null, record_count: 0 };
      const tableNum = match[0];
      const tableName = `transformer_${tableNum}`;
      
      const exists = await tableExists(tableName);
      if (!exists) {
        return { ...meta, avg_hi: null, avg_temp: null, record_count: 0 };
      }

      const stats = await sql`
        SELECT 
          AVG("HI")::double precision as avg_hi,
          AVG("Ambient_Temperature_C")::double precision as avg_temp,
          COUNT(*)::int as count
        FROM ${sql(tableName)}
      `;

      return {
        ...meta,
        avg_hi: stats[0]?.avg_hi || null,
        avg_temp: stats[0]?.avg_temp || null,
        record_count: stats[0]?.count || 0,
      };
    })
  );

  return enriched;
}

export async function addSensorReading(transformerId: string, reading: any): Promise<any> {
  const tableName = getSafeTableName(transformerId);
  const exists = await tableExists(tableName);
  if (!exists) throw new Error(`Table ${tableName} does not exist`);

  const result = await sql`
    INSERT INTO ${sql(tableName)} (
      "Timestamp", "Ambient_Temperature_C", "Age_yr", "Maintenance_Count", 
      "No_of_Short_Circuits", "Outages_hours_per_year", "Current_A", "Voltage_kV", 
      "Temp_score", "Age_score", "Maintenance_score", "ShortCircuit_score", 
      "Outage_score", "Current_score", "Voltage_score", "HI", "Predicted_HI"
    ) VALUES (
      ${reading.Timestamp}, ${reading.Ambient_Temperature_C}, ${reading.Age_yr}, ${reading.Maintenance_Count}, 
      ${reading.No_of_Short_Circuits}, ${reading.Outages_hours_per_year}, ${reading.Current_A}, ${reading.Voltage_kV}, 
      ${reading.Temp_score}, ${reading.Age_score}, ${reading.Maintenance_score}, ${reading.ShortCircuit_score}, 
      ${reading.Outage_score}, ${reading.Current_score}, ${reading.Voltage_score}, ${reading.HI}, ${reading.Predicted_HI}
    )
    RETURNING *
  `;
  return result[0];
}

export async function updateSensorReading(transformerId: string, originalTimestamp: string, reading: any): Promise<boolean> {
  const tableName = getSafeTableName(transformerId);
  const exists = await tableExists(tableName);
  if (!exists) throw new Error(`Table ${tableName} does not exist`);

  const result = await sql`
    UPDATE ${sql(tableName)} SET
      "Timestamp" = ${reading.Timestamp},
      "Ambient_Temperature_C" = ${reading.Ambient_Temperature_C},
      "Age_yr" = ${reading.Age_yr},
      "Maintenance_Count" = ${reading.Maintenance_Count},
      "No_of_Short_Circuits" = ${reading.No_of_Short_Circuits},
      "Outages_hours_per_year" = ${reading.Outages_hours_per_year},
      "Current_A" = ${reading.Current_A},
      "Voltage_kV" = ${reading.Voltage_kV},
      "Temp_score" = ${reading.Temp_score},
      "Age_score" = ${reading.Age_score},
      "Maintenance_score" = ${reading.Maintenance_score},
      "ShortCircuit_score" = ${reading.ShortCircuit_score},
      "Outage_score" = ${reading.Outage_score},
      "Current_score" = ${reading.Current_score},
      "Voltage_score" = ${reading.Voltage_score},
      "HI" = ${reading.HI},
      "Predicted_HI" = ${reading.Predicted_HI}
    WHERE "Timestamp" = ${originalTimestamp}
  `;
  return result.count > 0;
}

export async function deleteSensorReading(transformerId: string, timestamp: string): Promise<boolean> {
  const tableName = getSafeTableName(transformerId);
  const exists = await tableExists(tableName);
  if (!exists) throw new Error(`Table ${tableName} does not exist`);

  const result = await sql`
    DELETE FROM ${sql(tableName)}
    WHERE "Timestamp" = ${timestamp}
  `;
  return result.count > 0;
}

