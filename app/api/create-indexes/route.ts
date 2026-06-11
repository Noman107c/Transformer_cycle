import { NextResponse } from 'next/server';
import { sql } from '@/lib/postgres';

export async function GET() {
  try {
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'transformer_%'
    `;

    const created = [];

    for (const t of tables) {
      const tableName = t.table_name;
      await sql.unsafe(`CREATE INDEX IF NOT EXISTS "idx_${tableName}_timestamp" ON ${tableName} ("Timestamp" DESC)`);
      created.push(tableName);
    }

    return NextResponse.json({ success: true, created });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
