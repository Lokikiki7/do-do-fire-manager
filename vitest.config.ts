import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vitest 설정.
 * - '@/...' 경로 별칭을 테스트에서도 인식하도록 alias를 재선언한다.
 * - 컴포넌트 테스트를 위해 jsdom 환경 + @testing-library/jest-dom matcher를 로드.
 *   순수 함수 테스트도 jsdom에서 문제없이 동작한다.
 * - React 컴포넌트를 렌더하므로 @vitejs/plugin-react를 사용한다.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
