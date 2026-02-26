import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- 1. Import the v4 plugin
import path from "path"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- 2. Add it here
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8888', // (Or whatever your backend port is)
        changeOrigin: true,
      },
    },
  },
})