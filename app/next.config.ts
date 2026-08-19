import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The Zinga OS console is served as static files from `public/console/`.
  // Requests to `/console` (and `/console/`, which Next normalizes to
  // `/console`) rewrite to the console's index.html so the trailing-slash
  // landing serves the app. Auth is enforced first by middleware
  // (matcher includes `/console/:path*`); rewrites run after middleware.
  async rewrites() {
    return [{ source: '/console', destination: '/console/index.html' }];
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
