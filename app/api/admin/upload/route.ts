import { NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';

function parseCsv(csvText: string) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row: any = {};
    headers.forEach((header, index) => {
      let value: string | number = values[index]?.trim() ?? '';
      if (value !== '' && !isNaN(value as any)) {
        value = Number(value);
      }
      row[header] = value;
    });
    return row;
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transformerId, fileType, fileContent } = body;

    if (!transformerId || !fileType || !fileContent) {
      return NextResponse.json({ success: false, error: 'transformerId, fileType, and fileContent are required' }, { status: 400 });
    }

    const numMatch = transformerId.match(/^T(\d+)$/i);
    if (!numMatch) {
      return NextResponse.json({ success: false, error: 'Invalid transformerId (must be e.g., T1, T8)' }, { status: 400 });
    }
    const tableName = `transformer_${numMatch[1]}`;

    let parsedData: any[] = [];
    if (fileType === 'json') {
      try {
        parsedData = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;
      } catch (err) {
        return NextResponse.json({ success: false, error: 'Invalid JSON format' }, { status: 400 });
      }
    } else if (fileType === 'csv') {
      try {
        parsedData = parseCsv(fileContent);
      } catch (err) {
        return NextResponse.json({ success: false, error: 'Invalid CSV format' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ success: false, error: 'Unsupported file type' }, { status: 400 });
    }

    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      return NextResponse.json({ success: false, error: 'Dataset must be a non-empty array of objects' }, { status: 400 });
    }

    // Insert into DB
    let insertedCount = 0;
    
    // We do batch inserts
    // Format the data to match DB columns
    const records = parsedData.map(row => {
       const record = {
         Timestamp: row.Timestamp || row.Time || new Date().toISOString(),
         Ambient_Temperature_C: row.Ambient_Temperature_C,
         Age_yr: row.Age_yr,
         Maintenance_Count: row.Maintenance_Count,
         No_of_Short_Circuits: row.No_of_Short_Circuits,
         Outages_hours_per_year: row.Outages_hours_per_year,
         Current_A: row.Current_A,
         Voltage_kV: row.Voltage_kV,
         Temp_score: row.Temp_score,
         Age_score: row.Age_score,
         Maintenance_score: row.Maintenance_score,
         ShortCircuit_score: row.ShortCircuit_score,
         Outage_score: row.Outage_score,
         Current_score: row.Current_score,
         Voltage_score: row.Voltage_score,
         HI: row.HI,
         Predicted_HI: row.Predicted_HI
       };
       
       const cleanRecord: any = {};
       for(const key of Object.keys(record)) {
          if ((record as any)[key] !== undefined) {
            cleanRecord[key] = (record as any)[key];
          }
       }
       return cleanRecord;
    });

    // Chunk size for insert to avoid too large query
    const chunkSize = 500;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      await sql`
        INSERT INTO public.${sql(tableName)} ${sql(chunk)}
      `;
      insertedCount += chunk.length;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully inserted ${insertedCount} records into database table ${tableName}.`
    });
  } catch (err: any) {
    if (err.message && err.message.includes('does not exist')) {
      return NextResponse.json({ success: false, error: 'Database table for this transformer does not exist.' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
