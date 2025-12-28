import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const apiBaseUrl = env.VITE_API_BASE_URL

  return {
    plugins: [vue()],
    server: apiBaseUrl
      ? {
          proxy: {
            '/api': {
              target: apiBaseUrl,
              changeOrigin: true,
            },
          },
        }
      : undefined,
  }
})
