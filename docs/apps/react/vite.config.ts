import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import qiankun from 'vite-plugin-qiankun'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
const deployBase = process.env.DEPLOY_BASE

export default defineConfig({
  base: deployBase ? `${deployBase}micro-apps/react/` : '/',
  plugins: [react(), qiankun('reactDemo', { useDevMode: true })],
  resolve: {
    dedupe: ['react', 'react-dom'],
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
        find: '@virt-list/react',
        replacement: fileURLToPath(new URL('../../../packages/react/src/index.ts', import.meta.url)),
      },
    ],
  },
  server: {
    cors: true,
    hmr: false,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  build: {
    outDir: '../../public/micro-apps/react',
    emptyOutDir: true,
  },
})
