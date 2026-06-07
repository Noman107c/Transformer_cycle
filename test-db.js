require('dotenv').config();
const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require'
});

async function test() {
  try {
    const result = await sql`
      SELECT *
      FROM public.transformer_1
      LIMIT 1
    `;

    console.log(result);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

test();