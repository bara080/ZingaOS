// Session lifetime policy — shared by the middleware (server-side enforcement)
// and the client idle watcher. Supabase refresh tokens rotate indefinitely, so
// without this a session never ends ("logged in forever"). We layer two caps on
// top of Supabase auth:
//   • idle timeout    — sign out after N minutes with no activity
//   • absolute cap    — sign out N hours after the session first started,
//                       regardless of activity
//
// Both are overridable via env (minutes / hours) so ops can tune without a code
// change. Client-safe: reads only NEXT_PUBLIC_* + plain constants (no secrets).

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Idle timeout in minutes (default 30). NEXT_PUBLIC_ so the client watcher can
// read the same value the middleware enforces.
export const IDLE_TIMEOUT_MIN = num(process.env.NEXT_PUBLIC_SESSION_IDLE_MIN, 30);
// Absolute session cap in hours (default 12).
export const ABSOLUTE_TIMEOUT_HOURS = num(process.env.NEXT_PUBLIC_SESSION_MAX_HOURS, 12);

export const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MIN * 60 * 1000;
export const ABSOLUTE_TIMEOUT_MS = ABSOLUTE_TIMEOUT_HOURS * 60 * 60 * 1000;

// httpOnly activity cookies, written by the middleware on each request (no
// secrets — just epoch-ms timestamps). The client watcher tracks idle on its
// own timer; it never needs to read these.
export const SEEN_COOKIE = 'zinga_seen'; // last-activity timestamp
export const START_COOKIE = 'zinga_start'; // session-start timestamp

// Where to send an expired session, with a reason the login page can surface.
export const TIMEOUT_REDIRECT = '/login?reason=timeout';
