import { NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });
  try {
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
    return NextResponse.json(tables.map(t => t.table_name));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    await sql.end();
  }
}
