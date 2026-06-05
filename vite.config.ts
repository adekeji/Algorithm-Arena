import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const foundryTarget =
    env.VITE_FOUNDRY_PROXY_TARGET ??
    'https://ai-account-skldjimkph5a6.cognitiveservices.azure.com'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        // Dev-only proxy to bypass CORS when calling the Foundry / Azure OpenAI data plane.
        // In the app, set VITE_FOUNDRY_IQ_ENDPOINT_URL=/foundry to route through this.
        '/foundry': {
          target: foundryTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/foundry/, ''),
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            recharts: ['recharts'],
            react: ['react', 'react-dom'],
          },
        },
      },
    },
  }
})
