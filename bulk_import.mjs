/**
 * bulk_import.mjs  —  Direct CSV → Postgres streaming importer
 *
 * Usage:
 *   node bulk_import.mjs <csvFile> <transformerNumber>
 *
 * Example:
 *   node bulk_import.mjs "Transformer_1_Predicted_HI.csv" 1
 *
 * • Reads DATABASE_URL from .env.local automatically
 * • Streams CSV line-by-line (handles 100k+ rows without OOM)
 * • Inserts in batches of 1000 rows at a time
 * • Creates the table if it does not exist
 */

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import postgres from 'postgres';

// ─── Load .env.local ──────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath   = resolve(__dirname, '.env.local');
let DATABASE_URL = '';

try {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DATABASE_URL=')) {
      DATABASE_URL = trimmed.slice('DATABASE_URL='.length).trim();
    }
  }
} catch (e) {
  console.error('Could not read .env.local:', e.message);
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

// ─── CLI args ─────────────────────────────────────────────────────────────
const [, , csvArg, numArg] = process.argv;
if (!csvArg || !numArg) {
  console.error('Usage:   node bulk_import.mjs <csvFile> <transformerNumber>');
  console.error('Example: node bulk_import.mjs Transformer_1_Predicted_HI.csv 1');
  process.exit(1);
}

const csvFile  = resolve(__dirname, csvArg);
const tableNum = parseInt(numArg, 10);
const TABLE    = `transformer_${tableNum}`;
const COLUMNS  = [
  'Timestamp', 'Ambient_Temperature_C', 'Age_yr', 'Maintenance_Count',
  'No_of_Short_Circuits', 'Outages_hours_per_year', 'Current_A', 'Voltage_kV',
  'Temp_score', 'Age_score', 'Maintenance_score', 'ShortCircuit_score',
  'Outage_score', 'Current_score', 'Voltage_score', 'HI', 'Predicted_HI',
];
const CHUNK_SIZE = 1000;

// ─── DB connection ────────────────────────────────────────────────────────
const sql = postgres(DATABASE_URL, { ssl: 'require', max: 3 });

// ─── Ensure table exists ──────────────────────────────────────────────────
async function ensureTable() {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS public.${TABLE} (
      "Timestamp"              timestamp,
      "Ambient_Temperature_C"  double precision,
      "Age_yr"                 int,
      "Maintenance_Count"      int,
      "No_of_Short_Circuits"   int,
      "Outages_hours_per_year" double precision,
      "Current_A"              double precision,
      "Voltage_kV"             double precision,
      "Temp_score"             double precision,
      "Age_score"              double precision,
      "Maintenance_score"      double precision,
      "ShortCircuit_score"     double precision,
      "Outage_score"           double precision,
      "Current_score"          double precision,
      "Voltage_score"          double precision,
      "HI"                     double precision,
      "Predicted_HI"           double precision
    );
  `);
  console.log(`✅ Table public.${TABLE} is ready.`);
}

// ─── Insert one batch ─────────────────────────────────────────────────────
async function insertChunk(rows) {
  // Build flat parameter array + placeholders
  const numCols = COLUMNS.length; // 17
  const placeholders = rows
    .map((_, ri) =>
      '(' + COLUMNS.map((__, ci) => `$${ri * numCols + ci + 1}`).join(',') + ')'
    )
    .join(',');

  const flat = rows.flatMap(row =>
    COLUMNS.map(col => {
      const v = row[col];
      if (v === null || v === undefined || v === '') return null;
      if (col === 'Timestamp') return String(v);
      const n = Number(v);
      return isNaN(n) ? null : n;
    })
  );

  const colList = COLUMNS.map(c => `"${c}"`).join(',');
  await sql.unsafe(
    `INSERT INTO public.${TABLE} (${colList}) VALUES ${placeholders}`,
    flat
  );
}

// ─── Main streaming import ────────────────────────────────────────────────
async function importCsv() {
  await ensureTable();

  const rl = createInterface({
    input: createReadStream(csvFile, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let headers = null;
  let chunk   = [];
  let total   = 0;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!headers) {
      headers = trimmed.split(',').map(h => h.trim());
      console.log(`📋 Headers detected: ${headers.join(', ')}`);
      continue;
    }

    const values = trimmed.split(',');
    const row    = {};
    headers.forEach((h, i) => {
      const v = values[i]?.trim() ?? '';
      row[h]  = (v === '' || v.toLowerCase() === 'null') ? null : v;
    });
    chunk.push(row);

    if (chunk.length >= CHUNK_SIZE) {
      await insertChunk(chunk);
      total += chunk.length;
      process.stdout.write(`\r📦 Inserted: ${total.toLocaleString()} rows...`);
      chunk = [];
    }
  }

  if (chunk.length > 0) {
    await insertChunk(chunk);
    total += chunk.length;
  }

  console.log(`\n\n🎉 Import complete!`);
  console.log(`   Table  : public.${TABLE}`);
  console.log(`   Total  : ${total.toLocaleString()} rows`);
  await sql.end();
}

importCsv().catch(async err => {
  console.error('\n❌ Import failed:', err.message);
  await sql.end();
  process.exit(1);
});
