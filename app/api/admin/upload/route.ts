import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SOURCE_DIR = path.join(process.cwd(), 'json');
const TARGET_DIR = path.join(process.cwd(), 'public', 'json');

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

    // Validate transformer ID (T1 to T25)
    const match = transformerId.match(/^T(\d+)$/);
    if (!match || parseInt(match[1]) < 1 || parseInt(match[1]) > 25) {
      return NextResponse.json({ success: false, error: 'Invalid transformerId (must be T1 to T25)' }, { status: 400 });
    }

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

    // Ensure directories exist
    if (!fs.existsSync(SOURCE_DIR)) {
      fs.mkdirSync(SOURCE_DIR, { recursive: true });
    }
    if (!fs.existsSync(TARGET_DIR)) {
      fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    // Write source file (all data)
    const sourcePath = path.join(SOURCE_DIR, `${transformerId}.json`);
    fs.writeFileSync(sourcePath, JSON.stringify(parsedData), 'utf8');

    // Slice last 500 records and write optimized public file
    const targetPath = path.join(TARGET_DIR, `${transformerId}.json`);
    const slicedData = parsedData.slice(-500);
    fs.writeFileSync(targetPath, JSON.stringify(slicedData), 'utf8');

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${parsedData.length} records. Sliced ${slicedData.length} records to public store.`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
