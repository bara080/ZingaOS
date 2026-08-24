import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { buildAuthorizeUrl, oauthConfigured } from '@/lib/operator/meta_oauth';
import { requireIgDemo } from '@/lib/operator/guard';

// GET /api/meta/oauth/start
// Kicks off Business Login for Instagram. Operator-gated (only a signed-in
// superadmin/admin can connect an account). Sets a CSRF `state` cookie and
// 302-redirects the browser to instagram.com/oauth/authorize.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireIgDemo();
  if ('response' in gate) return gate.response;

  const cfg = oauthConfigured();
  if (!cfg.ok) {
    return NextResponse.json({ error: `Instagram login not configured: ${cfg.error}` }, { status: 503 });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const authUrl = buildAuthorizeUrl(state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set('ig_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes to complete the flow
  });
  return res;
}
