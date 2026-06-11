import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:NOMAN03429037282@db.dmdwapogtgwdapohnoaf.supabase.co:5432/postgres';

// Prevent multiple connections in Next.js hot-reloads during development
const globalForPostgres = globalThis as unknown as { sql: ReturnType<typeof postgres> };

export const sql = globalForPostgres.sql ?? postgres(connectionString, {
  ssl: 'require',
  // Keep connection pool active for quick parallel/sequential queries
  max: 20,
  idle_timeout: 30,
});

if (process.env.NODE_ENV !== 'production') {
  globalForPostgres.sql = sql;
}

export default sql;
