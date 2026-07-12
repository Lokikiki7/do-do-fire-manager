import type { Config } from 'tailwindcss';

/**
 * 디자인 토큰 — Apple Human Interface 색상 체계 기반.
 * 모든 색상은 CSS 변수를 참조하므로 다크모드 전환 시
 * 클래스 하나(html.dark)로 전체 테마가 바뀐다.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 시맨틱 색상 — 컴포넌트에서는 반드시 이 이름만 사용
        canvas: 'rgb(var(--canvas) / <alpha-value>)',      // 페이지 배경
        surface: 'rgb(var(--surface) / <alpha-value>)',    // 카드 배경
        elevated: 'rgb(var(--elevated) / <alpha-value>)',  // 팝오버/모달
        line: 'rgb(var(--line) / <alpha-value>)',          // 구분선
        ink: 'rgb(var(--ink) / <alpha-value>)',            // 본문 텍스트
        'ink-soft': 'rgb(var(--ink-soft) / <alpha-value>)',// 보조 텍스트
        'ink-faint': 'rgb(var(--ink-faint) / <alpha-value>)', // 캡션
        accent: 'rgb(var(--accent) / <alpha-value>)',      // 브랜드 블루
        positive: 'rgb(var(--positive) / <alpha-value>)',  // 상승/수익
        negative: 'rgb(var(--negative) / <alpha-value>)',  // 하락/지출
        gold: 'rgb(var(--gold) / <alpha-value>)',          // FIRE 달성 강조
      },
      fontFamily: {
        sans: [
          'Pretendard Variable',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '1.25rem', // Apple 카드 곡률
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px rgb(0 0 0 / 0.04)',
        'card-dark': '0 0 0 1px rgb(255 255 255 / 0.06)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
