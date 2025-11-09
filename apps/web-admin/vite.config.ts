import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  plugins: [react(), svgr()],
  root: __dirname, // đảm bảo Vite không nhảy ra ngoài apps/web-admin
  server: {
    port: parseInt(process.env.PORT || '8081'), // Default 8081 for dev, 8080 for production
    host: true,
    fs: {
      // chỉ cho phép đọc file trong apps/web-admin
      allow: [path.resolve(__dirname)],
      deny: [
        path.resolve(__dirname, '../../services'),
        path.resolve(__dirname, '../../node_modules'),
      ],
    },
    proxy: {
      '/api/suggest': {
        target: 'https://suggestqueries.google.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/suggest/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    commonjsOptions: {
      include: [/node_modules/, /src\/assets\/js/],
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    include: ['jquery'],
    exclude: [
      // 🧱 bỏ qua các service backend
      'services/member-service',
      'services/schedule-service',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
});
