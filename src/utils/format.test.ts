/**
 * 포맷 유틸 테스트.
 * 통화·한국식 축약(억/만)·퍼센트·월 포맷의 정확성을 확인한다.
 */
import { describe, it, expect } from 'vitest';
import {
  formatMoney,
  formatKoreanShort,
  formatShort,
  formatPercent,
  formatMonth,
} from '@/utils/format';

describe('formatMoney', () => {
  it('원화는 천단위 콤마 + 원', () => {
    expect(formatMoney(1_234_567, 'KRW')).toBe('1,234,567원');
  });
  it('달러는 $ 접두', () => {
    expect(formatMoney(1_234_567, 'USD')).toBe('$1,234,567');
  });
  it('소수는 반올림', () => {
    expect(formatMoney(1000.7, 'KRW')).toBe('1,001원');
  });
});

describe('formatKoreanShort (억/만 축약)', () => {
  it('10억', () => {
    expect(formatKoreanShort(1_000_000_000)).toBe('10억');
  });
  it('1.2억 (억 단위 소수 1자리)', () => {
    expect(formatKoreanShort(123_000_000)).toBe('1.2억');
  });
  it('4,500만', () => {
    expect(formatKoreanShort(45_000_000)).toBe('4,500만');
  });
  it('만 미만은 그대로', () => {
    expect(formatKoreanShort(5000)).toBe('5,000');
  });
  it('음수 부호 유지', () => {
    expect(formatKoreanShort(-45_000_000)).toBe('-4,500만');
  });
});

describe('formatShort (통화별 축약)', () => {
  it('KRW는 한국식', () => {
    expect(formatShort(1_000_000_000, 'KRW')).toBe('10억');
  });
  it('USD는 M/K 축약', () => {
    expect(formatShort(1_500_000, 'USD')).toBe('$1.5M');
    expect(formatShort(5000, 'USD')).toBe('$5K');
  });
});

describe('formatPercent', () => {
  it('기본 소수 1자리', () => {
    expect(formatPercent(12.345)).toBe('12.3%');
  });
  it('자릿수 지정', () => {
    expect(formatPercent(12.345, 0)).toBe('12%');
  });
});

describe('formatMonth', () => {
  it('YYYY-MM → 한국어 표기', () => {
    expect(formatMonth('2026-07')).toBe('2026년 7월');
  });
  it('앞자리 0 제거', () => {
    expect(formatMonth('2026-01')).toBe('2026년 1월');
  });
});
