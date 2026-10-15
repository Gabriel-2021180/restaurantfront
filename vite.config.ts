import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // La API se sirve desde el mismo origen que la app (como en producción con Vercel):
  // así la cookie de sesión httpOnly y SameSite=Strict funciona también en desarrollo.
  server: {
    proxy: {
      '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:3001', changeOrigin: false },
      '/socket.io': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:3001', ws: true },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
