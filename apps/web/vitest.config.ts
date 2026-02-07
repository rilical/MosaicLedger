import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      // Use source entrypoints in tests to avoid depending on prebuilt dist/*.
      '@mosaicledger/banking': path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../packages/banking/src/index.ts',
      ),
      '@mosaicledger/core': path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../packages/core/src/index.ts',
      ),
      '@mosaicledger/mosaic': path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../packages/mosaic/src/index.ts',
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
