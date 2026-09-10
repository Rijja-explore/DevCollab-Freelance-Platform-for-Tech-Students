import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/projects': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/api/matches': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/api/profiles': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/api/auth': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/graphql': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/api/workspaces': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/comments': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/messages': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
