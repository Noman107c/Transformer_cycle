import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local'
  );
}

// Singleton — reuse the same client across hot-reloads in dev
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForSupabase = globalThis as unknown as { supabase: any };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any =
  globalForSupabase.supabase ??
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,   // server-side: no cookie/localStorage
      autoRefreshToken: false,
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.supabase = supabase;
}

// ─── Table helpers ────────────────────────────────────────────────────────────
// Return type is `any` so all column names, insert payloads, and RPC args work
// without needing Supabase-generated schema types.

/**
 * Query builder for the `transformers` metadata table.
 *
 * SELECT:  await transformersTable().select('id, name, status').order('id')
 * INSERT:  await transformersTable().insert({ id: 'T1', name: 'Main' }).select().single()
 * UPDATE:  await transformersTable().update({ status: 'GOOD' }).eq('id', 'T1').select().single()
 * DELETE:  await transformersTable().delete().eq('id', 'T1')
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const transformersTable = (): any => supabase.from('transformers');

/**
 * Query builder for a dynamic transformer sensor-data table.
 * Table names: transformer_1 … transformer_25
 *
 * SELECT latest: await sensorTable('T3').select('*').order('Timestamp', { ascending: false }).limit(1)
 * INSERT:        await sensorTable('T3').insert({ Timestamp: '…', HI: 0.82 })
 * UPDATE:        await sensorTable('T3').update({ HI: 0.75 }).eq('Timestamp', ts)
 * DELETE:        await sensorTable('T3').delete().eq('Timestamp', ts)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sensorTable = (transformerId: string): any => {
  const num = transformerId.replace(/\D/g, '');
  return supabase.from(`transformer_${num}`);
};
