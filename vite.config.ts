import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // GitHub Pages는 https://user.github.io/<repo>/ 경로로 서비스됨.
  // 배포 워크플로우에서 VITE_BASE=/repo-name/ 를 주입한다. 로컬은 '/'.
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  resolve: {
    // "@/..." 로 src 내부를 절대경로처럼 import
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    // 무거운 라이브러리를 별도 청크로 분리 → 앱 코드 수정 시에도 벤더는 캐시 유지
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
