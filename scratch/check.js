import postgres from 'postgres';

const sql = postgres('postgresql://postgres:transformer%40034290@db.onropnbpchlhhrdbstns.supabase.co:5432/postgres', {
  ssl: 'require',
});

async function run() {
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Tables in public schema:');
    console.log(tables.map(t => t.table_name));
    
    const count = await sql`SELECT count(*) FROM public.transformers`;
    console.log('Transformers count:', count);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

run();
