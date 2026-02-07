import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Monorepo packages are authored in TS but use ESM-style ".js" specifiers so Node can run
    // the compiled output without experimental flags. Teach Next/Webpack to resolve those
    // specifiers back to TS sources during dev/build.
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };
    return config;
  },
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
