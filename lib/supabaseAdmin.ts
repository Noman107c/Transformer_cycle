import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY in .env.local'
  );
}

// Service-role client (server-side only). Do not expose to the browser.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForAdmin = globalThis as unknown as { supabaseAdmin?: any };

export const supabaseAdmin: any =
  globalForAdmin.supabaseAdmin ??
  createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForAdmin.supabaseAdmin = supabaseAdmin;
}

