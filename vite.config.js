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
      '/ask': {
        target: 'http://localhost:8003',
        changeOrigin: true, // CORS 문제를 해결하기 위해 필요
      },
    },
  },
});

//git history 삭제 ( 중요정보 잘못 올리면 사용 )
//git filter-branch --force --index-filter "git rm --cached --ignore-unmatch vite.config.js"
//git push --force origin
