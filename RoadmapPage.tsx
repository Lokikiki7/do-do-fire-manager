/**
 * 입력 검증 유틸 테스트.
 * 음수·NaN·비현실적 값이 조용히 통과하지 않는지 확인한다.
 */
import { describe, it, expect } from 'vitest';
import {
  parseAmount,
  parsePercent,
  parseYear,
  checkAmount,
  checkRequired,
  MAX_AMOUNT,
} from '@/utils/validate';

describe('parseAmount', () => {
  it('정상 금액은 정수로 반환', () => {
    expect(parseAmount('1000000')).toBe(1_000_000);
    expect(parseAmount(1_000_000)).toBe(1_000_000);
  });
  it('소수는 반올림', () => {
    expect(parseAmount('1000.6')).toBe(1001);
  });
  it('음수는 0으로 방어', () => {
    expect(parseAmount('-500')).toBe(0);
    expect(parseAmount(-500)).toBe(0);
  });
  it('빈 문자열·NaN·비숫자는 0', () => {
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('abc')).toBe(0);
    expect(parseAmount(NaN)).toBe(0);
    expect(parseAmount(Infinity)).toBe(0);
  });
  it('상한 초과는 MAX_AMOUNT로 clamp', () => {
    expect(parseAmount(MAX_AMOUNT * 10)).toBe(MAX_AMOUNT);
  });
});

describe('parsePercent', () => {
  it('범위 내 값은 그대로', () => {
    expect(parsePercent('7')).toBe(7);
  });
  it('기본 범위(0~100) 밖은 clamp', () => {
    expect(parsePercent('-5')).toBe(0);
    expect(parsePercent('150')).toBe(100);
  });
  it('커스텀 범위 적용', () => {
    expect(parsePercent('20', 1, 15)).toBe(15);
    expect(parsePercent('0', 1, 15)).toBe(1);
  });
  it('NaN은 하한값', () => {
    expect(parsePercent('abc', 1, 15)).toBe(1);
  });
});

describe('parseYear', () => {
  it('정상 연도는 그대로', () => {
    expect(parseYear('2030')).toBe(2030);
  });
  it('합리적 범위(1900~2200) 밖은 clamp', () => {
    expect(parseYear('1800')).toBe(1900);
    expect(parseYear('3000')).toBe(2200);
  });
  it('NaN은 올해로 폴백', () => {
    expect(parseYear('abc')).toBe(new Date().getFullYear());
  });
});

describe('checkAmount (제출 전 검사)', () => {
  it('빈 값은 유효 (0으로 처리 허용)', () => {
    expect(checkAmount('')).toEqual({ valid: true });
    expect(checkAmount('   ')).toEqual({ valid: true });
  });
  it('정상 금액은 유효', () => {
    expect(checkAmount('50000').valid).toBe(true);
  });
  it('음수는 무효 + 메시지', () => {
    const r = checkAmount('-100');
    expect(r.valid).toBe(false);
    expect(r.message).toBeTruthy();
  });
  it('숫자 아니면 무효', () => {
    expect(checkAmount('abc').valid).toBe(false);
  });
  it('상한 초과는 무효', () => {
    expect(checkAmount(String(MAX_AMOUNT + 1)).valid).toBe(false);
  });
});

describe('checkRequired', () => {
  it('빈 값은 무효 + 라벨 포함 메시지', () => {
    const r = checkRequired('', '제목');
    expect(r.valid).toBe(false);
    expect(r.message).toContain('제목');
  });
  it('공백만 있어도 무효', () => {
    expect(checkRequired('   ').valid).toBe(false);
  });
  it('내용 있으면 유효', () => {
    expect(checkRequired('1억 달성').valid).toBe(true);
  });
});
