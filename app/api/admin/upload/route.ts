import { NextResponse } from 'next/server';
import { transformersTable, sensorTable } from '@/lib/supabase';

function parseCsv(csvText: string) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());

  return lines.slice(1).map((line) => {
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
      return NextResponse.json(
        { success: false, error: 'transformerId, fileType, and fileContent are required' },
        { status: 400 }
      );
    }

    const numMatch = transformerId.match(/^T(\d+)$/i);
    if (!numMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid transformerId (must be e.g., T1, T8)' },
        { status: 400 }
      );
    }

    let parsedData: any[] = [];
    if (fileType === 'json') {
      try {
        parsedData = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;
      } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON format' }, { status: 400 });
      }
    } else if (fileType === 'csv') {
      try {
        parsedData = parseCsv(fileContent);
      } catch {
        return NextResponse.json({ success: false, error: 'Invalid CSV format' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ success: false, error: 'Unsupported file type' }, { status: 400 });
    }

    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Dataset must be a non-empty array of objects' },
        { status: 400 }
      );
    }

    // Map each parsed row to the exact DB column structure
    const records = parsedData.map((row) => {
      const record: any = {};
      const val = (k: string) => {
        const v = row[k];
        return v !== undefined ? v : null;
      };
      record.Timestamp              = val('Timestamp') || val('Time') || new Date().toISOString();
      record.Ambient_Temperature_C  = val('Ambient_Temperature_C');
      record.Age_yr                 = val('Age_yr');
      record.Maintenance_Count      = val('Maintenance_Count');
      record.No_of_Short_Circuits   = val('No_of_Short_Circuits');
      record.Outages_hours_per_year = val('Outages_hours_per_year');
      record.Current_A              = val('Current_A');
      record.Voltage_kV             = val('Voltage_kV');
      record.Temp_score             = val('Temp_score');
      record.Age_score              = val('Age_score');
      record.Maintenance_score      = val('Maintenance_score');
      record.ShortCircuit_score     = val('ShortCircuit_score');
      record.Outage_score           = val('Outage_score');
      record.Current_score          = val('Current_score');
      record.Voltage_score          = val('Voltage_score');
      record.HI                     = val('HI');
      record.Predicted_HI           = val('Predicted_HI');
      return record;
    });

    // Chunk inserts to avoid hitting Supabase request size limits
    const CHUNK = 500;
    let insertedCount = 0;
    const tableName = `transformer_${numMatch[1]}`;

    for (let i = 0; i < records.length; i += CHUNK) {
      const chunk = records.slice(i, i + CHUNK);
      const { error } = await sensorTable(transformerId).insert(chunk);
      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          return NextResponse.json(
            { success: false, error: 'Database table for this transformer does not exist.' },
            { status: 400 }
          );
        }
        throw error;
      }
      insertedCount += chunk.length;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully inserted ${insertedCount} records into database table ${tableName}.`,
    });
  } catch (err: any) {
    if (err.message?.includes('does not exist')) {
      return NextResponse.json(
        { success: false, error: 'Database table for this transformer does not exist.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
