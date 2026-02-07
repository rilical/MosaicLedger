import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    // Ensure relative asset URLs in the static game resolve correctly.
    return [{ source: '/game', destination: '/game/', permanent: false }];
  },
  async rewrites() {
    // Serve the 15KB browser game as a static file (no Next.js runtime bundle).
    return [{ source: '/game/', destination: '/game/index.html' }];
  },
};

export default nextConfig;
