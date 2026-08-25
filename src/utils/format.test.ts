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
  normalizeDate,
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

describe('normalizeDate (날짜 정규화)', () => {
  it('이미 정규화된 날짜는 그대로', () => {
    expect(normalizeDate('2026-08-05')).toBe('2026-08-05');
  });

  it('zero-pad 되지 않은 월/일을 채운다', () => {
    expect(normalizeDate('2026-8-5')).toBe('2026-08-05');
    expect(normalizeDate('2026-8-15')).toBe('2026-08-15');
    expect(normalizeDate('2026-12-1')).toBe('2026-12-01');
  });

  it('정규화하면 문자열 비교 순서가 바로잡힌다', () => {
    // 정규화 전에는 '2026-8-5' > '2026-12-01' 이라 정렬이 깨진다
    expect('2026-8-5' > '2026-12-01').toBe(true);
    expect(normalizeDate('2026-8-5') > normalizeDate('2026-12-01')).toBe(false);
  });

  it('ISO 타임스탬프는 날짜 부분만 남긴다', () => {
    expect(normalizeDate('2026-08-05T00:00:00Z')).toBe('2026-08-05');
    expect(normalizeDate('2026-8-5T09:30:00+09:00')).toBe('2026-08-05');
  });

  it('앞뒤 공백을 제거한다', () => {
    expect(normalizeDate('  2026-8-5  ')).toBe('2026-08-05');
  });

  it('형식을 알 수 없는 값은 그대로 돌려준다 (데이터를 버리지 않음)', () => {
    expect(normalizeDate('')).toBe('');
    expect(normalizeDate('그날')).toBe('그날');
    expect(normalizeDate('2026/08/05')).toBe('2026/08/05');
  });
});
