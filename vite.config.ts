import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_HAI_PROXY_API_KEY': JSON.stringify(process.env.HAI_PROXY_API_KEY ?? ''),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:6655/litellm/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
