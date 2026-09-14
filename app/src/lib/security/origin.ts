// CSRF defense-in-depth for state-changing requests. Browsers always attach an
// `Origin` header on POST/PUT/PATCH/DELETE; we accept it only when it matches the
// request's own host or a known Zinga host (+ Vercel preview domains). This blocks
// cross-site form/fetch attacks (login CSRF, password-change CSRF) on top of the
// SameSite=Lax cookies. Use on public/auth mutation routes.

function hostOf(u: string | null): string | null {
  if (!u) return null;
  try {
    return new URL(u).host;
  } catch {
    return null;
  }
}

function allowedHosts(reqHost: string | null): Set<string> {
  const hosts = new Set<string>();
  if (reqHost) hosts.add(reqHost);
  for (const u of [process.env.NEXT_PUBLIC_APP_URL, 'https://www.zingaapp.ai', 'https://zingaapp.ai']) {
    const h = hostOf(u ?? null);
    if (h) hosts.add(h);
  }
  return hosts;
}

/** true if the request is same-site (safe to process a state change). */
export function isSameOrigin(req: Request): boolean {
  const reqHost = req.headers.get('host');
  const allow = allowedHosts(reqHost);
  const check = (val: string | null): boolean | null => {
    const h = hostOf(val);
    if (!h) return null; // header absent/unparseable → inconclusive
    return allow.has(h) || /\.vercel\.app$/.test(h);
  };
  // Prefer Origin; fall back to Referer. Reject only when a header is present and
  // does NOT match — never reject purely for a missing header on same-origin GETs
  // (this helper is meant for mutations where the browser always sends Origin).
  const byOrigin = check(req.headers.get('origin'));
  if (byOrigin !== null) return byOrigin;
  const byReferer = check(req.headers.get('referer'));
  if (byReferer !== null) return byReferer;
  return false; // state-changing request with no Origin/Referer → reject
}
