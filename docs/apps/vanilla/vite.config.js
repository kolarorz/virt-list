import { defineConfig } from 'vite';
import qiankun from 'vite-plugin-qiankun';
import { fileURLToPath, URL } from 'node:url';
import { highlightSource } from '../_shared/vitePluginHighlightSource';

const deployBase = process.env.DEPLOY_BASE;

export default defineConfig({
  base: deployBase ? `${deployBase}micro-apps/vanilla/` : '/',
  plugins: [highlightSource(), qiankun('vanillaDemo', { useDevMode: true })],
  resolve: {
    alias: [
      {
        find: /^@virt-list\/vanilla$/,
        replacement: fileURLToPath(new URL('../../../packages/vanilla/src/index.ts', import.meta.url)),
      },
      {
        find: /^@virt-list\/vanilla\/(.*)$/,
        replacement: fileURLToPath(new URL('../../../packages/vanilla/$1', import.meta.url)),
      },
      {
        find: '@virt-list/core',
        replacement: fileURLToPath(new URL('../../../packages/core/src/index.ts', import.meta.url)),
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
    outDir: '../../public/micro-apps/vanilla',
    emptyOutDir: true,
  },
});
