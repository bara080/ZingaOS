import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Role } from '@/lib/roles';
import { isRouteAllowed } from '@/lib/auth/guards/isRouteAllowed';
import {
  IDLE_TIMEOUT_MS,
  ABSOLUTE_TIMEOUT_MS,
  SEEN_COOKIE,
  START_COOKIE,
} from '@/lib/auth/session/policy';

// Build a redirect to /login and hard-expire the session: clear every Supabase
// auth cookie (sb-*) plus our activity cookies. Used when an idle/absolute
// timeout fires so the stale session can't be reused.
function expireAndRedirect(request: NextRequest, reason: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?reason=${reason}`;
  const res = NextResponse.redirect(url);
  for (const c of request.cookies.getAll()) {
    if (c.name.startsWith('sb-')) res.cookies.delete(c.name);
  }
  res.cookies.delete(SEEN_COOKIE);
  res.cookies.delete(START_COOKIE);
  return res;
}

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

  // Session lifetime enforcement (idle + absolute). Supabase would otherwise
  // keep the session alive forever by rotating the refresh token.
  const now = Date.now();
  const seen = Number(request.cookies.get(SEEN_COOKIE)?.value) || 0;
  const start = Number(request.cookies.get(START_COOKIE)?.value) || 0;

  if (seen && now - seen > IDLE_TIMEOUT_MS) {
    await supabase.auth.signOut();
    return expireAndRedirect(request, 'timeout');
  }
  if (start && now - start > ABSOLUTE_TIMEOUT_MS) {
    await supabase.auth.signOut();
    return expireAndRedirect(request, 'expired');
  }

  // Role is the admin-controlled app_metadata claim (never user_metadata).
  const role = user.app_metadata?.role as Role | undefined;

  if (!role || !isRouteAllowed(request.nextUrl.pathname, role)) {
    const url = request.nextUrl.clone();
    url.pathname = '/unauthorized';
    return NextResponse.redirect(url);
  }

  // Refresh activity markers on the response. httpOnly so client JS can't forge
  // them; sameSite lax; secure in production.
  const secure = process.env.NODE_ENV === 'production';
  const cookieOpts = { httpOnly: true, sameSite: 'lax' as const, secure, path: '/' };
  supabaseResponse.cookies.set(SEEN_COOKIE, String(now), cookieOpts);
  if (!start) supabaseResponse.cookies.set(START_COOKIE, String(now), cookieOpts);

  return supabaseResponse;
}
