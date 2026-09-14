import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The Zinga OS console is served as static files from `public/console/`.
  // Requests to `/console` (and `/console/`, which Next normalizes to
  // `/console`) rewrite to the console's index.html so the trailing-slash
  // landing serves the app. Auth is enforced first by middleware
  // (matcher includes `/console/:path*`); rewrites run after middleware.
  // Baseline security headers on every response. These are the "safe" set that
  // won't break the app. A full script/style CSP (with per-request nonce) is a
  // deliberate follow-up (see authSecurity.md P0.2) — here we ship HSTS, anti-
  // clickjacking (frame-ancestors + X-Frame-Options), MIME-sniff protection,
  // Referrer-Policy and Permissions-Policy.
  async headers() {
    const securityHeaders = [
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
      },
      { key: 'X-DNS-Prefetch-Control', value: 'off' },
    ];
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    return [
      // The static operator console was replaced by the React /operator route.
      // Redirects run before the filesystem, so this wins over the (now
      // meta-refresh) public/console/operator.html.
      { source: '/console/operator.html', destination: '/operator', permanent: false },
    ];
  },
  async rewrites() {
    return [
      { source: '/console', destination: '/console/index.html' },
      // Public legal pages for Meta App Review (Privacy Policy + Data Deletion).
      // Served as static HTML from `public/legal/`; these clean URLs map to the
      // `.html` files. NOT in the middleware matcher, so they stay un-auth-gated
      // and reachable by Meta's crawler without login.
      { source: '/legal/privacy', destination: '/legal/privacy.html' },
      { source: '/legal/data-deletion', destination: '/legal/data-deletion.html' },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'zingaapp-admin.vercel.app',
      },
      {
        protocol: 'https',
        hostname: 'zinga-nine.vercel.app',
      },
    ],
  },
};

export default nextConfig;
