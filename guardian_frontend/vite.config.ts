import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:6061', '/actuator': 'http://localhost:6061', '/ws': { target: 'http://localhost:6062', ws: true } } },
  define: {
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      output: {
        // Keep Recharts' mutually importing modules together across lazy routes.
        // Shared framework chunks can then be cached independently of page changes.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts-vendor': ['recharts'],
          'motion-vendor': ['framer-motion'],
        },
      },
    },
  },
})
