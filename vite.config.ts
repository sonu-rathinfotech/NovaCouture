import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // The import rules live in tools/lib and are shared with the CLI
      // importer. One source of truth: the browser must not be able to accept
      // a sheet the command-line importer would reject, or vice versa.
      '@shared': fileURLToPath(new URL('../tools/lib', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // tools/lib sits outside the Vite root.
    fs: { allow: ['..'] },
  },
})
