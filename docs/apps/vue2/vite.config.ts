import { defineConfig } from 'vite'
import vue2 from '@vitejs/plugin-vue2'
import vue2Jsx from '@vitejs/plugin-vue2-jsx'
import qiankun from 'vite-plugin-qiankun'
import { fileURLToPath, URL } from 'node:url'

const deployBase = process.env.DEPLOY_BASE

export default defineConfig({
  base: deployBase ? `${deployBase}micro-apps/vue2/` : '/',
  plugins: [vue2(), vue2Jsx(), qiankun('vue2Demo', { useDevMode: true })],
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
        find: '@src',
        replacement: fileURLToPath(new URL('../../src', import.meta.url)),
      },
      {
        find: '@virt-list/core',
        replacement: fileURLToPath(new URL('../../../packages/core/src/index.ts', import.meta.url)),
      },
      {
        find: '@virt-list/vue2',
        replacement: fileURLToPath(new URL('../../../packages/vue2/src/index.ts', import.meta.url)),
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
    outDir: '../../public/micro-apps/vue2',
    emptyOutDir: true,
  },
})
