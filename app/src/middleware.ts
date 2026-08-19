import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Supabase session refresh + RBAC. (Was: jose JWT verification of `zinga_session`.)
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // The Zinga OS console — the default authenticated destination.
    '/console/:path*',
    // Keep team / user management reachable.
    '/admin-users/:path*',
    '/settings/:path*',
    '/api-doc/:path*',
  ],
};
