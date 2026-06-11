import dotenv from 'dotenv';
import postgres from 'postgres';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function checkSchema() {
  try {
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'transformers'
    `;
    console.log('Columns of table "transformers":', columns);

    const rows = await sql`SELECT * FROM transformers LIMIT 5`;
    console.log('Sample rows from "transformers":', rows);
  } catch (error) {
    console.error('Failed to get schema:', error);
  } finally {
    await sql.end();
  }
}

checkSchema();
