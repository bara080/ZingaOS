import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { LoginSchema } from '@/lib/zodSchema';
import { isSameOrigin } from '@/lib/security/origin';

// Brute-force protection: cap failed logins per (IP + email) within a window.
// Backed by ops.auth_events via SECURITY DEFINER RPCs (no external store).
// Fail-OPEN: if the limiter/logger errors, login still proceeds (availability > a
// brief gap in protection). The failure log is awaited so the counter is accurate.
const MAX_FAILS = 5;
const WINDOW_SECS = 900; // 15 minutes

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: Request) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const ip = clientIp(req);
    const ua = req.headers.get('user-agent') || '';
    const key = `${ip}|${email.toLowerCase()}`;

    const admin = createServiceClient();

    // --- Rate limit (fail-open) ---
    try {
      const { data: fails } = await admin.rpc('auth_recent_count', {
        p_kind: 'login_fail',
        p_key: key,
        p_window_secs: WINDOW_SECS,
      });
      if (typeof fails === 'number' && fails >= MAX_FAILS) {
        return NextResponse.json(
          { error: 'Too many attempts. Please try again in a few minutes.' },
          { status: 429, headers: { 'Retry-After': String(WINDOW_SECS) } },
        );
      }
    } catch {
      /* limiter unavailable → allow the attempt */
    }

    // SERVER client so Supabase sets the session cookie on the response.
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    const ok = !error && !!data?.user;

    // Audit + rate-limit signal. Await so a failure is counted before we respond.
    try {
      await admin.rpc('auth_log_event', {
        p_kind: ok ? 'login' : 'login_fail',
        p_key: key,
        p_email: email,
        p_ip: ip,
        p_ua: ua,
        p_ok: ok,
      });
    } catch {
      /* logging is best-effort */
    }

    if (!ok) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const user = data.user;
    return NextResponse.json({
      ok: true,
      user: {
        _id: user.id,
        email: user.email,
        displayName: user.user_metadata?.display_name ?? '',
        role: user.app_metadata?.role,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
