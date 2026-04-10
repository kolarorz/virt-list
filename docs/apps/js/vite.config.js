import { defineConfig } from 'vite';
import qiankun from 'vite-plugin-qiankun';
import { fileURLToPath, URL } from 'node:url';

const deployBase = process.env.VITE_DEPLOY_BASE;

export default defineConfig({
  base: deployBase ? `${deployBase}micro-apps/js/` : '/',
  plugins: [qiankun('jsDemo', { useDevMode: true })],
  resolve: {
    alias: [
      {
        find: /^@virt-list\/dom$/,
        replacement: fileURLToPath(new URL('../../../packages/dom/src/index.ts', import.meta.url)),
      },
      {
        find: /^@virt-list\/dom\/(.*)$/,
        replacement: fileURLToPath(new URL('../../../packages/dom/$1', import.meta.url)),
      },
      {
        find: '@virt-list/core',
        replacement: fileURLToPath(new URL('../../../packages/core/src/index.ts', import.meta.url)),
      },
      {
        find: '@virt-table/js',
        replacement: fileURLToPath(new URL('../../../packages/js/src/index.ts', import.meta.url)),
      },
    ],
  },
  server: {
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  build: {
    outDir: '../../public/micro-apps/js',
    emptyOutDir: true,
  },
});
