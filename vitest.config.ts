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
    benchmark: {
      include: ['packages/**/__bench__/**/*.bench.ts'],
    },
    coverage: {
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        // 纯 re-export 与纯类型声明文件，没有可执行语句
        'packages/*/src/index.ts',
        'packages/*/src/tree/index.ts',
        'packages/*/src/tree/types.ts',
      ],
      reporter: ['text', 'html', 'lcov'],
      // 阈值按当前实测值向下留出缓冲：不为了好看拔高，只用来拦住明显的覆盖倒退
      thresholds: {
        statements: 85,
        branches: 84,
        functions: 78,
        lines: 85,
      },
    },
  },
});
