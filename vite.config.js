import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import history from 'connect-history-api-fallback';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'custom-dev-middleware',
      configureServer(server) {
        server.middlewares.use(
          history({
            disableDotRule: true,
            htmlAcceptHeaders: ['text/html'],
            // ✅ API 경로는 fallback 제외
            rewrites: [
              { from: /^\/apim\/.*$/, to: (ctx) => ctx.parsedUrl.pathname }
            ],
          })
        );
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  base: '/',
  build: {
    outDir: 'dist',
  },
  server: {
    proxy: {
      '/apim': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
});
