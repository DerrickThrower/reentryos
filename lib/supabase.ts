import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Lazy-initialized so client component imports don't crash the browser bundle
let _supabaseServer: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  if (!_supabaseServer) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    _supabaseServer = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseServer;
}

// Backwards-compatible export (getter)
export const supabaseServer: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseServer() as any)[prop];
  },
});

export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}
