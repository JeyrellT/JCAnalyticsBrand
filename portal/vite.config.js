import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// En desarrollo, Vite (5173) reenvía la API al servidor del portal (3002):
//   terminal 1 → npm run dev:api      terminal 2 → npm run dev
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3002',
      '/health': 'http://127.0.0.1:3002',
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: { manualChunks: { 'vendor-charts': ['recharts'] } },
    },
  },
})
