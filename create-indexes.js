require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require'
});

async function createIndexes() {
  try {
    for (let i = 1; i <= 25; i++) {
      const tableName = `transformer_${i}`;
      console.log(`Checking table ${tableName}...`);
      
      const exists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        )
      `;
      
      if (exists[0].exists) {
        console.log(`Creating index on "Timestamp" for ${tableName}...`);
        await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_${tableName}_timestamp ON ${tableName} ("Timestamp" DESC)`);
      }
    }
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

createIndexes();
