import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Serve the 15KB Minesweeper as a static file (no Next.js runtime bundle).
    return [
      { source: '/game', destination: '/game.html' },
      { source: '/game/', destination: '/game.html' },
    ];
  },
};

export default nextConfig;
