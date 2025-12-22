import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Important for Electron to find assets in dist
  server: {
    port: 5173,
    strictPort: true,
  }
})
