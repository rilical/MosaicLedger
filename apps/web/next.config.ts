import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Serve the Minesweeper and Mosaic Sprint games as static files (no Next.js runtime bundle).
    return [
      { source: '/game', destination: '/game.html' },
      { source: '/game/', destination: '/game.html' },
      { source: '/mosaic-game', destination: '/game/index.html' },
      { source: '/mosaic-game/', destination: '/game/index.html' },
    ];
  },
};

export default nextConfig;
