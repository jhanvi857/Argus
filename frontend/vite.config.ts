import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env from both the current frontend directory and the parent project root
  const rootDir = path.resolve(__dirname, '..')
  const envCurrent = loadEnv(mode, process.cwd(), '')
  const envRoot = loadEnv(mode, rootDir, '')

  const backendUrl =
    process.env.VITE_BACKEND_URL ||
    process.env.BACKEND_URL ||
    envCurrent.VITE_BACKEND_URL ||
    envCurrent.BACKEND_URL ||
    envRoot.VITE_BACKEND_URL ||
    envRoot.BACKEND_URL ||
    'http://127.0.0.1:8000'

  return {
    plugins: [react()],
    define: {
      __BACKEND_URL__: JSON.stringify(backendUrl)
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  }
})

