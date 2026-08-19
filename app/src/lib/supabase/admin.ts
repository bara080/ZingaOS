import { createClient } from '@supabase/supabase-js';

// Service-role Supabase client — SERVER ONLY. Bypasses RLS. Never import this into
// a Client Component or expose the secret key to the browser. Use for admin actions
// (inviting users, listing all profiles, forcing password/role/status changes).
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
