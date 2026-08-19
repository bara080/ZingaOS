import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server Supabase client (Server Components, Route Handlers, Server Actions).
// Reads/writes the auth session via cookies. Uses the publishable key + RLS.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component (read-only cookies). Safe to
            // ignore — the middleware refreshes the session cookie on every request.
          }
        },
      },
    },
  );
}
