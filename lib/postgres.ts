import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

const globalForPostgres = globalThis as unknown as { sql?: postgres.Sql };

export const sql =
  globalForPostgres.sql ??
  postgres(databaseUrl, {
    ssl: 'require',
    // We do not use transform: postgres.camel to preserve the exact column naming from the DB
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPostgres.sql = sql;
}
