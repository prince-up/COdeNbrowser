import { defineConfig } from 'vitest/config';
import * as path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.test.ts', 'tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@seb/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@seb/platform-windows': path.resolve(__dirname, 'packages/platform-windows/src/index.ts'),
    },
  },
});
