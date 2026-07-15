/**
 * Vitest 전역 셋업.
 * - @testing-library/jest-dom의 커스텀 matcher(toBeInTheDocument 등)를 등록한다.
 * - 각 테스트 후 렌더된 DOM을 정리해 테스트 간 간섭을 막는다.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
