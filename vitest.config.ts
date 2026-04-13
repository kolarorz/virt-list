import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@virt-list\/core$/,
        replacement: fileURLToPath(
          new URL('./packages/core/src/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@virt-list\/vanilla$/,
        replacement: fileURLToPath(
          new URL('./packages/vanilla/src/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@virt-list\/vanilla\/(.*)$/,
        replacement: fileURLToPath(
          new URL('./packages/vanilla/$1', import.meta.url),
        ),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    include: ['packages/**/__tests__/**/*.test.ts'],
    coverage: {
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/index.ts'],
    },
  },
});
