import sql from '@/lib/postgres';

function parseCSV(text: string) {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const headers = splitCSVLine(lines[0]).map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = splitCSVLine(line);
    const rowObj: any = {};
    headers.forEach((header, index) => {
      rowObj[header] = values[index] !== undefined ? values[index].trim().replace(/^["']|["']$/g, '') : '';
    });
    rows.push({ lineNum: i + 1, data: rowObj });
  }
  
  return { headers, rows };
}

function splitCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function normalizeHeader(h: string): string | null {
  const norm = h.toLowerCase().trim().replace(/[\s_-]+/g, '');
  if (norm === 'timestamp' || norm === 'time') return 'Timestamp';
  if (norm === 'ambienttemp' || norm === 'ambienttempc' || norm === 'ambienttemperature' || norm === 'ambienttemperaturec') return 'Ambient_Temperature_C';
  if (norm === 'age' || norm === 'ageyr' || norm === 'ageyrs') return 'Age_yr';
  if (norm === 'maintenancecount' || norm === 'totalmaintenance') return 'Maintenance_Count';
  if (norm === 'shortcircuits' || norm === 'noofshortcircuits' || norm === 'numberofshortcircuits') return 'No_of_Short_Circuits';
  if (norm === 'outages' || norm === 'outageshoursperyear') return 'Outages_hours_per_year';
  if (norm === 'current' || norm === 'currenta') return 'Current_A';
  if (norm === 'voltage' || norm === 'voltagekv') return 'Voltage_kV';
  if (norm === 'tempscore') return 'Temp_score';
  if (norm === 'agescore') return 'Age_score';
  if (norm === 'maintenancescore') return 'Maintenance_score';
  if (norm === 'shortcircuitscore') return 'ShortCircuit_score';
  if (norm === 'outagescore' || norm === 'outagescore') return 'Outage_score';
  if (norm === 'currentscore') return 'Current_score';
  if (norm === 'voltagescore') return 'Voltage_score';
  if (norm === 'hi' || norm === 'healthindex') return 'HI';
  if (norm === 'predictedhi' || norm === 'predictedhealthindex') return 'Predicted_HI';
  return null;
}

function parseNum(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const transformerId = formData.get('transformerId') as string;
    const duplicateAction = (formData.get('duplicateAction') as string) || 'update'; // 'update' or 'ignore'

    if (!file) {
      return Response.json({ success: false, error: 'CSV file is required' }, { status: 400 });
    }
    if (!transformerId) {
      return Response.json({ success: false, error: 'transformerId is required' }, { status: 400 });
    }

    // 1. Validate target table name regex (transformer_1 to transformer_25)
    const num = transformerId.replace(/\D/g, '');
    const tableName = `transformer_${num}`;
    
    if (!/^transformer_(?:[1-9]|1[0-9]|2[0-5])$/.test(tableName)) {
      return Response.json({ success: false, error: `Invalid table name '${tableName}'. Only transformer_1 to transformer_25 tables are allowed.` }, { status: 400 });
    }

    // 2. Read and parse CSV text
    const fileContent = await file.text();
    const { headers, rows } = parseCSV(fileContent);

    if (rows.length === 0) {
      return Response.json({ success: false, error: 'CSV file is empty' }, { status: 400 });
    }

    // Map headers to schema columns
    const mappedHeaders: Record<string, string> = {};
    headers.forEach(h => {
      const col = normalizeHeader(h);
      if (col) mappedHeaders[h] = col;
    });

    const validRows: any[] = [];
    const failedRows: any[] = [];

    // 3. Row-by-row validation
    for (const row of rows) {
      const data = row.data;
      const lineNum = row.lineNum;

      // Extract normalized values
      const record: any = {};
      let hasError = false;
      const errors: string[] = [];

      // Map headers to target columns
      Object.keys(data).forEach(h => {
        const col = mappedHeaders[h];
        if (col) {
          record[col] = data[h];
        }
      });

      // Validate Timestamp
      const tsVal = record.Timestamp;
      if (!tsVal || isNaN(Date.parse(tsVal))) {
        hasError = true;
        errors.push(`Invalid timestamp value: "${tsVal || ''}"`);
      } else {
        // format to PostgreSQL timestamp format: YYYY-MM-DD HH:MM:SS
        try {
          record.Timestamp = new Date(tsVal).toISOString().slice(0, 19).replace('T', ' ');
        } catch {
          hasError = true;
          errors.push(`Timestamp parsing failed: "${tsVal}"`);
        }
      }

      // Validate Numeric fields
      const numericCols = [
        'Ambient_Temperature_C', 'Age_yr', 'Maintenance_Count', 'No_of_Short_Circuits',
        'Outages_hours_per_year', 'Current_A', 'Voltage_kV', 'Temp_score', 'Age_score',
        'Maintenance_score', 'ShortCircuit_score', 'Outage_score', 'Current_score', 'Voltage_score',
        'HI', 'Predicted_HI'
      ];

      numericCols.forEach(col => {
        const val = record[col];
        if (val !== undefined && val !== null && val !== '') {
          const parsed = Number(val);
          if (isNaN(parsed)) {
            hasError = true;
            errors.push(`Invalid numeric value for ${col}: "${val}"`);
          } else {
            record[col] = parsed;
          }
        } else {
          record[col] = null;
        }
      });

      if (hasError) {
        failedRows.push({ line: lineNum, timestamp: tsVal, errors });
      } else {
        validRows.push(record);
      }
    }

    if (validRows.length === 0) {
      return Response.json({
        success: false,
        error: 'No valid rows found in CSV',
        failedCount: failedRows.length,
        failedRows
      }, { status: 400 });
    }

    // 4. Bulk insert using transactions and ON CONFLICT handling
    let insertedCount = 0;
    try {
      await sql.begin(async (tx) => {
        // Insert in batches of 1000 for safety and speed
        const batchSize = 1000;
        for (let i = 0; i < validRows.length; i += batchSize) {
          const batch = validRows.slice(i, i + batchSize);
          
          for (const row of batch) {
            if (duplicateAction === 'update') {
              await tx`
                INSERT INTO public.${tx(tableName)} (
                  "Timestamp", "Ambient_Temperature_C", "Age_yr", "Maintenance_Count", "No_of_Short_Circuits",
                  "Outages_hours_per_year", "Current_A", "Voltage_kV", "Temp_score", "Age_score",
                  "Maintenance_score", "ShortCircuit_score", "Outage_score", "Current_score", "Voltage_score",
                  "HI", "Predicted_HI"
                ) VALUES (
                  ${row.Timestamp}, ${row.Ambient_Temperature_C}, ${row.Age_yr}, ${row.Maintenance_Count}, ${row.No_of_Short_Circuits},
                  ${row.Outages_hours_per_year}, ${row.Current_A}, ${row.Voltage_kV}, ${row.Temp_score}, ${row.Age_score},
                  ${row.Maintenance_score}, ${row.ShortCircuit_score}, ${row.Outage_score}, ${row.Current_score}, ${row.Voltage_score},
                  ${row.HI}, ${row.Predicted_HI}
                )
                ON CONFLICT ("Timestamp") DO UPDATE SET
                  "Ambient_Temperature_C" = EXCLUDED."Ambient_Temperature_C",
                  "Age_yr" = EXCLUDED."Age_yr",
                  "Maintenance_Count" = EXCLUDED."Maintenance_Count",
                  "No_of_Short_Circuits" = EXCLUDED."No_of_Short_Circuits",
                  "Outages_hours_per_year" = EXCLUDED."Outages_hours_per_year",
                  "Current_A" = EXCLUDED."Current_A",
                  "Voltage_kV" = EXCLUDED."Voltage_kV",
                  "Temp_score" = EXCLUDED."Temp_score",
                  "Age_score" = EXCLUDED."Age_score",
                  "Maintenance_score" = EXCLUDED."Maintenance_score",
                  "ShortCircuit_score" = EXCLUDED."ShortCircuit_score",
                  "Outage_score" = EXCLUDED."Outage_score",
                  "Current_score" = EXCLUDED."Current_score",
                  "Voltage_score" = EXCLUDED."Voltage_score",
                  "HI" = EXCLUDED."HI",
                  "Predicted_HI" = EXCLUDED."Predicted_HI";
              `;
            } else {
              await tx`
                INSERT INTO public.${tx(tableName)} (
                  "Timestamp", "Ambient_Temperature_C", "Age_yr", "Maintenance_Count", "No_of_Short_Circuits",
                  "Outages_hours_per_year", "Current_A", "Voltage_kV", "Temp_score", "Age_score",
                  "Maintenance_score", "ShortCircuit_score", "Outage_score", "Current_score", "Voltage_score",
                  "HI", "Predicted_HI"
                ) VALUES (
                  ${row.Timestamp}, ${row.Ambient_Temperature_C}, ${row.Age_yr}, ${row.Maintenance_Count}, ${row.No_of_Short_Circuits},
                  ${row.Outages_hours_per_year}, ${row.Current_A}, ${row.Voltage_kV}, ${row.Temp_score}, ${row.Age_score},
                  ${row.Maintenance_score}, ${row.ShortCircuit_score}, ${row.Outage_score}, ${row.Current_score}, ${row.Voltage_score},
                  ${row.HI}, ${row.Predicted_HI}
                )
                ON CONFLICT ("Timestamp") DO NOTHING;
              `;
            }
            insertedCount++;
          }
        }
      });

      return Response.json({
        success: true,
        message: `Successfully imported CSV.`,
        insertedCount,
        failedCount: failedRows.length,
        failedRows
      });
    } catch (err: any) {
      console.error('Database transaction error during import:', err);
      return Response.json({ success: false, error: `Database insert failed: ${err.message}` }, { status: 500 });
    }
  } catch (err: any) {
    console.error('Import API error:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
