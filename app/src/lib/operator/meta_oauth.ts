// Business Login for Instagram — OAuth connect flow.
//
// This is the "Instagram API with Instagram Login" authorization flow (NOT the
// old Facebook Login). A user (e.g. a Meta App reviewer) connects THEIR own
// Instagram professional account to Zinga, and we read basic profile info
// (username + user_id) via `instagram_business_basic`. This is the end-to-end
// experience the App Review screencast must demonstrate.
//
// Flow:
//   1. /api/meta/oauth/start   → 302 to https://www.instagram.com/oauth/authorize
//   2. user authorizes on instagram.com, Meta redirects back with ?code=
//   3. /api/meta/oauth/callback → exchange code → short-lived token → long-lived
//      token → GET /me?fields=user_id,username → store in httpOnly cookies.
//
// Server-only. Secrets (client_secret) and the resulting token never reach the
// browser — only the username/user_id are surfaced (via the ig_profile cookie).

// Scopes requested — EXACTLY the two permissions in the App Review submission.
export const IG_SCOPES = ['instagram_business_basic', 'instagram_business_manage_messages'];

const AUTHORIZE_URL = 'https://www.instagram.com/oauth/authorize';
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const GRAPH = 'https://graph.instagram.com';

export function oauthConfig() {
  // Instagram App ID / Secret come from the app's *Instagram* product settings
  // (App dashboard → Instagram → API setup with Instagram login). These are
  // distinct from the Facebook App ID / META_APP_SECRET; fall back to the FB
  // secret only if the IG-specific one is not set.
  // .trim() every value — env vars pasted into dashboards often carry stray
  // leading/trailing whitespace, which silently corrupts the client_id /
  // redirect_uri and makes Instagram reject the authorize request.
  const appId = (process.env.META_IG_APP_ID ?? '').trim();
  const appSecret = (process.env.META_IG_APP_SECRET ?? process.env.META_APP_SECRET ?? '').trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/$/, '');
  const redirectUri = `${appUrl}/api/meta/oauth/callback`;
  return { appId, appSecret, appUrl, redirectUri };
}

export function oauthConfigured(): { ok: true } | { ok: false; error: string } {
  const c = oauthConfig();
  if (!c.appId) return { ok: false, error: 'META_IG_APP_ID not set' };
  if (!c.appSecret) return { ok: false, error: 'META_IG_APP_SECRET / META_APP_SECRET not set' };
  if (!c.appUrl) return { ok: false, error: 'NEXT_PUBLIC_APP_URL not set' };
  return { ok: true };
}

// Build the Instagram authorization URL. `state` is an opaque CSRF token the
// caller also stores in a cookie and re-checks on callback.
export function buildAuthorizeUrl(state: string): string {
  const c = oauthConfig();
  const params = new URLSearchParams({
    client_id: c.appId,
    redirect_uri: c.redirectUri,
    response_type: 'code',
    scope: IG_SCOPES.join(','),
    state,
    // force_reauth makes the reviewer see the account chooser each time —
    // useful for a clean screencast.
    force_reauth: 'true',
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export type IgProfile = { userId: string; username: string };

// Exchange the authorization `code` for a long-lived token and fetch profile.
export async function exchangeCodeForProfile(
  code: string,
): Promise<{ profile: IgProfile; token: string; expiresIn: number } | { error: string }> {
  const c = oauthConfig();

  // 1) code → short-lived token (+ user_id). This endpoint wants form-encoded body.
  const form = new URLSearchParams({
    client_id: c.appId,
    client_secret: c.appSecret,
    grant_type: 'authorization_code',
    redirect_uri: c.redirectUri,
    code,
  });
  let shortToken = '';
  let userId = '';
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok) return { error: json?.error_message ?? json?.error?.message ?? `token HTTP ${res.status}` };
    // Newer responses may nest under data[0]; older return flat.
    const node = Array.isArray(json?.data) ? json.data[0] : json;
    shortToken = String(node?.access_token ?? '');
    userId = String(node?.user_id ?? '');
    if (!shortToken) return { error: 'no access_token in token response' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'token exchange failed' };
  }

  // 2) short-lived → long-lived (60 days).
  let longToken = shortToken;
  let expiresIn = 3600;
  try {
    const url =
      `${GRAPH}/access_token?grant_type=ig_exchange_token` +
      `&client_secret=${encodeURIComponent(c.appSecret)}` +
      `&access_token=${encodeURIComponent(shortToken)}`;
    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json();
    if (res.ok && json?.access_token) {
      longToken = String(json.access_token);
      expiresIn = Number(json.expires_in ?? 5184000);
    }
    // If the long-lived exchange fails, keep the short-lived token (still works).
  } catch {
    /* keep short-lived token */
  }

  // 3) fetch profile (username + user_id) via instagram_business_basic.
  try {
    const url = `${GRAPH}/me?fields=user_id,username&access_token=${encodeURIComponent(longToken)}`;
    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) return { error: json?.error?.message ?? `profile HTTP ${res.status}` };
    const profile: IgProfile = {
      userId: String(json?.user_id ?? userId ?? ''),
      username: String(json?.username ?? ''),
    };
    return { profile, token: longToken, expiresIn };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'profile fetch failed' };
  }
}
