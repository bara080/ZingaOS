// Client-safe barrel: exposes the `useCurrentUser` hook only.
//
// `readSession` is SERVER-ONLY (it imports the Supabase server client, which
// pulls in `next/headers`). Import it directly from
// `@/lib/auth/session/session` in server code — never re-export it here, or it
// leaks `next/headers` into client bundles that import this barrel (or the
// `@/lib/auth` barrel that re-exports it).
export * from './useCurrentUser';
