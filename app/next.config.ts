import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The Zinga OS console is served as static files from `public/console/`.
  // Requests to `/console` (and `/console/`, which Next normalizes to
  // `/console`) rewrite to the console's index.html so the trailing-slash
  // landing serves the app. Auth is enforced first by middleware
  // (matcher includes `/console/:path*`); rewrites run after middleware.
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
