/**
 * 금융 계산 로직 테스트.
 * 돈이 걸린 핵심 로직이므로 정확한 수치와 경계 조건을 모두 검증한다.
 */
import { describe, it, expect } from 'vitest';
import {
  monthlyRate,
  fireNumberByRule,
  fireProgress,
  simulate,
  estimateFireDate,
  savingRate,
  realReturnRate,
  toPresentValue,
} from '@/utils/finance';
import type { SimulatorInput } from '@/types';

describe('realReturnRate (피셔 방정식)', () => {
  it('인플레 0이면 실질 = 명목', () => {
    expect(realReturnRate(7, 0)).toBeCloseTo(7, 6);
  });
  it('명목 7% · 인플레 2.5% → 실질 약 4.39%', () => {
    expect(realReturnRate(7, 2.5)).toBeCloseTo(4.39, 1);
  });
  it('명목 = 인플레면 실질 0', () => {
    expect(realReturnRate(3, 3)).toBeCloseTo(0, 6);
  });
  it('인플레가 명목보다 크면 실질은 음수 (구매력 감소)', () => {
    expect(realReturnRate(2, 5)).toBeLessThan(0);
  });
});

describe('toPresentValue (현재가치 환산)', () => {
  it('인플레 0이면 그대로', () => {
    expect(toPresentValue(1_000_000_000, 0, 30)).toBe(1_000_000_000);
  });
  it('30년 뒤 10억은 인플레 2.5%면 오늘 약 4.77억', () => {
    const pv = toPresentValue(1_000_000_000, 2.5, 30);
    expect(pv).toBeGreaterThan(470_000_000);
    expect(pv).toBeLessThan(480_000_000);
  });
  it('미래 시점이 멀수록 현재가치는 작아진다', () => {
    const near = toPresentValue(1_000_000_000, 2.5, 10);
    const far = toPresentValue(1_000_000_000, 2.5, 30);
    expect(far).toBeLessThan(near);
  });
});

describe('monthlyRate', () => {
  it('연 0%는 월 0%', () => {
    expect(monthlyRate(0)).toBe(0);
  });
  it('연 수익률을 12제곱하면 원래 연 수익률로 복원된다', () => {
    const r = monthlyRate(7);
    const annual = Math.pow(1 + r, 12) - 1;
    expect(annual).toBeCloseTo(0.07, 10);
  });
});

describe('fireNumberByRule (4% 룰)', () => {
  it('연 4천만 지출 · 4% 인출 → 10억', () => {
    expect(fireNumberByRule(40_000_000, 4)).toBe(1_000_000_000);
  });
  it('인출률을 낮추면 필요 자금이 증가한다 (3% → 약 13.3억)', () => {
    expect(fireNumberByRule(40_000_000, 3)).toBeCloseTo(1_333_333_333.33, 0);
  });
  it('기본 인출률은 4%', () => {
    expect(fireNumberByRule(40_000_000)).toBe(1_000_000_000);
  });
  it('인출률 0 이하는 Infinity (0으로 나눔 방어)', () => {
    expect(fireNumberByRule(40_000_000, 0)).toBe(Infinity);
    expect(fireNumberByRule(40_000_000, -1)).toBe(Infinity);
  });
});

describe('fireProgress (달성률)', () => {
  it('절반이면 50%', () => {
    expect(fireProgress(500, 1000)).toBe(50);
  });
  it('목표 초과 시 100으로 clamp', () => {
    expect(fireProgress(2000, 1000)).toBe(100);
  });
  it('음수 순자산은 0으로 clamp', () => {
    expect(fireProgress(-500, 1000)).toBe(0);
  });
  it('목표가 0 이하면 0 (0으로 나눔 방어)', () => {
    expect(fireProgress(500, 0)).toBe(0);
    expect(fireProgress(500, -100)).toBe(0);
  });
});

describe('simulate (월 복리 시뮬레이션)', () => {
  const base: SimulatorInput = {
    initialAmount: 10_000_000,
    monthlyInvestment: 1_000_000,
    annualReturnRate: 7,
    salaryGrowthRate: 0,
    investmentGrowthRate: 0,
    years: 20,
  };

  it('20년이면 240개월치 데이터를 반환한다', () => {
    expect(simulate(base)).toHaveLength(240);
  });

  it('증가율 0일 때 원금 = 초기금 + 월투자 × 개월수', () => {
    const points = simulate(base);
    const last = points[points.length - 1];
    // 10,000,000 + 1,000,000 × 240 = 250,000,000
    expect(last.principal).toBe(250_000_000);
  });

  it('복리 수익이 원금을 초과한다 (7% 20년)', () => {
    const last = simulate(base).at(-1)!;
    expect(last.total).toBeGreaterThan(last.principal);
    expect(last.profit).toBe(last.total - last.principal);
  });

  it('수익률 0%면 총자산 = 원금 (수익 0)', () => {
    const noReturn = simulate({ ...base, annualReturnRate: 0 });
    const last = noReturn.at(-1)!;
    expect(last.total).toBe(last.principal);
    expect(last.profit).toBe(0);
  });

  it('연봉·투자 증가율이 있으면 원금이 더 빨리 쌓인다', () => {
    const flat = simulate(base).at(-1)!.principal;
    const growing = simulate({ ...base, salaryGrowthRate: 3, investmentGrowthRate: 3 }).at(
      -1,
    )!.principal;
    expect(growing).toBeGreaterThan(flat);
  });

  it('60년 초과 입력은 60년으로 clamp (최대 720개월)', () => {
    expect(simulate({ ...base, years: 100 })).toHaveLength(720);
  });

  it('years 0 이하도 최소 1년은 계산한다', () => {
    expect(simulate({ ...base, years: 0 })).toHaveLength(12);
  });
});

describe('estimateFireDate (달성 예상일)', () => {
  it('이미 목표 달성이면 현재 시점(오늘) 반환', () => {
    const d = estimateFireDate(2_000_000_000, 1_000_000_000, 1_000_000, 7);
    expect(d).toBeInstanceOf(Date);
    // 오늘 날짜와 같은 날
    expect(d!.toDateString()).toBe(new Date().toDateString());
  });

  it('월 투자로 목표에 도달하면 미래 날짜를 반환', () => {
    const d = estimateFireDate(0, 100_000_000, 2_000_000, 7);
    expect(d).toBeInstanceOf(Date);
    expect(d!.getTime()).toBeGreaterThan(Date.now());
  });

  it('60년 내 도달 불가능하면 null (월 투자 0 · 초기금 0)', () => {
    expect(estimateFireDate(0, 1_000_000_000, 0, 0)).toBeNull();
  });
});

describe('savingRate (저축률)', () => {
  it('수입 500 중 투자 100 + 저축 100 → 40%', () => {
    expect(savingRate(500, 100, 100)).toBe(40);
  });
  it('수입 0 이하는 0 (0으로 나눔 방어)', () => {
    expect(savingRate(0, 100, 100)).toBe(0);
    expect(savingRate(-100, 100, 100)).toBe(0);
  });
  it('전액 저축 시 100%', () => {
    expect(savingRate(1000, 500, 500)).toBe(100);
  });
});
