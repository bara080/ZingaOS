import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Role } from '@/lib/roles';
import { isRouteAllowed } from '@/lib/auth/guards/isRouteAllowed';

// Runs in middleware: refreshes the Supabase session cookie AND enforces RBAC.
// Replaces the old jose `zinga_session` JWT verification.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() (not getSession()) — it revalidates the token with Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not signed in -> login.
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Role is the admin-controlled app_metadata claim (never user_metadata).
  const role = user.app_metadata?.role as Role | undefined;

  if (!role || !isRouteAllowed(request.nextUrl.pathname, role)) {
    const url = request.nextUrl.clone();
    url.pathname = '/unauthorized';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
