import { createBrowserClient } from '@supabase/ssr';

// Browser Supabase client. Uses the publishable key (safe to expose client-side).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
