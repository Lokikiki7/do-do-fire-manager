/**
 * 테마 훅 — settings.theme('light'|'dark'|'system')를 실제 DOM 클래스에 반영.
 * system 모드면 OS 설정을 따라가고, 변경도 실시간 반영한다.
 */
import { useEffect } from 'react';
import type { ThemeMode } from '@/types';

export function useTheme(mode: ThemeMode) {
  useEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && mql.matches);
      root.classList.toggle('dark', dark);
    };

    apply();
    if (mode === 'system') {
      mql.addEventListener('change', apply);
      return () => mql.removeEventListener('change', apply);
    }
  }, [mode]);
}
