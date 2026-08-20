import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForProfile, oauthConfig } from '@/lib/operator/meta_oauth';

// GET /api/meta/oauth/callback?code=...&state=...
// Instagram redirects the browser here after the user authorizes. We verify the
// CSRF state, exchange the code for a long-lived token + profile, stash the
// profile (username/user_id) in a readable-by-server cookie and the token in an
// httpOnly cookie, then bounce back to /operator?ig=connected.
//
// NOT auth-gated by middleware (matcher excludes /api/meta). We still only act
// on a valid state cookie set by our own /start route.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function backTo(appUrl: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return NextResponse.redirect(`${appUrl}/operator?${qs}`);
}

export async function GET(req: Request) {
  const { appUrl } = oauthConfig();
  const base = appUrl || new URL(req.url).origin;
  const { searchParams } = new URL(req.url);

  const err = searchParams.get('error');
  if (err) {
    const desc = searchParams.get('error_description') || err;
    return backTo(base, { ig: 'error', msg: desc.slice(0, 160) });
  }

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  if (!code) return backTo(base, { ig: 'error', msg: 'missing code' });

  const jar = await cookies();
  const expectedState = jar.get('ig_oauth_state')?.value;
  if (!expectedState || !state || state !== expectedState) {
    return backTo(base, { ig: 'error', msg: 'state mismatch — retry connect' });
  }

  const result = await exchangeCodeForProfile(code);
  if ('error' in result) {
    return backTo(base, { ig: 'error', msg: result.error.slice(0, 160) });
  }

  const { profile, token, expiresIn } = result;
  const res = backTo(base, { ig: 'connected', user: profile.username });

  // Clear the one-time state cookie.
  res.cookies.set('ig_oauth_state', '', { path: '/', maxAge: 0 });

  // Profile is non-secret (username + numeric id) — the UI reads it via
  // /api/operator/ig/profile. httpOnly still, read server-side only.
  res.cookies.set('ig_profile', JSON.stringify(profile), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: expiresIn,
  });
  // The connected user token — httpOnly, server-only, never exposed to the browser.
  res.cookies.set('ig_user_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: expiresIn,
  });
  return res;
}
