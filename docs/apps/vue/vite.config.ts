import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import qiankun from 'vite-plugin-qiankun'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
const deployBase = process.env.DEPLOY_BASE

export default defineConfig({
  base: deployBase ? `${deployBase}micro-apps/vue/` : '/',
  plugins: [vue(), vueJsx(), qiankun('vueDemo', { useDevMode: true })],
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
        find: '@src',
        replacement: fileURLToPath(new URL('../../src', import.meta.url)),
      },
      {
        find: '@virt-list/core',
        replacement: fileURLToPath(new URL('../../../packages/core/src/index.ts', import.meta.url)),
      },
      {
        find: '@virt-list/vue',
        replacement: fileURLToPath(new URL('../../../packages/vue/src/index.ts', import.meta.url)),
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
    outDir: '../../public/micro-apps/vue',
    emptyOutDir: true,
  },
})
