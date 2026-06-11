import dotenv from 'dotenv';
import postgres from 'postgres';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not defined in .env.local');
  process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: 'require' });

async function verifyDb() {
  try {
    console.log('Connecting to database...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Tables found:', tables.map(t => t.table_name));

    const table11Exists = tables.some(t => t.table_name === 'transformer_11');
    console.log('transformer_11 table exists:', table11Exists);

    if (table11Exists) {
      const countResult = await sql`SELECT COUNT(*)::int as total FROM transformer_11`;
      console.log('Total records in transformer_11:', countResult[0]?.total);

      const sample = await sql`SELECT * FROM transformer_11 LIMIT 1`;
      console.log('Sample record from transformer_11:', sample[0]);
    } else {
      console.log('WARNING: transformer_11 table was not found in the database!');
    }
  } catch (error) {
    console.error('Database connection or query failed:', error);
  } finally {
    await sql.end();
  }
}

verifyDb();
