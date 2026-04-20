import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import qiankun from 'vite-plugin-qiankun'
import { fileURLToPath, URL } from 'node:url'

const deployBase = process.env.DEPLOY_BASE

export default defineConfig({
  base: deployBase ? `${deployBase}micro-apps/react-legacy/` : '/',
  plugins: [react(), qiankun('reactLegacyDemo', { useDevMode: true })],
  resolve: {
    dedupe: ['react', 'react-dom'],
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
      {
        find: '@virt-list/react-legacy',
        replacement: fileURLToPath(new URL('../../../packages/react-legacy/src/index.ts', import.meta.url)),
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
    outDir: '../../public/micro-apps/react-legacy',
    emptyOutDir: true,
  },
})
