'use client';

// Client-side idle watcher. Complements the server-side idle enforcement in
// middleware.ts: this proactively signs out an inactive tab (and clears cached
// query state) instead of waiting for the next navigation/fetch to trip the
// middleware. Mounted globally but only arms itself on authenticated app
// surfaces — it no-ops on /login, /invite, /unauthorized, and the root.
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { IDLE_TIMEOUT_MS, TIMEOUT_REDIRECT } from '@/lib/auth/session/policy';

const PUBLIC_PREFIXES = ['/login', '/invite', '/unauthorized'];
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'visibilitychange'] as const;

export function IdleLogout() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firing = useRef(false);

  // Only arm on authenticated surfaces.
  const armed = !!pathname && pathname !== '/' && !PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!armed) return;

    async function logout() {
      if (firing.current) return;
      firing.current = true;
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {
        /* fall through to redirect regardless */
      }
      queryClient.clear(); // drop all cached data — no stale state after sign-out
      router.replace(TIMEOUT_REDIRECT);
    }

    function reset() {
      if (document.visibilityState === 'hidden') return; // ignore tab-hide noise
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(logout, IDLE_TIMEOUT_MS);
    }

    reset();
    for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, reset, { passive: true });
    return () => {
      if (timer.current) clearTimeout(timer.current);
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, reset);
    };
  }, [armed, pathname, router, queryClient]);

  return null;
}
