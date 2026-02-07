import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Serve the 15KB browser game as a static file (no Next.js runtime bundle).
    return [
      { source: '/game', destination: '/game/index.html' },
      { source: '/game/', destination: '/game/index.html' },
    ];
  },
};

export default nextConfig;
