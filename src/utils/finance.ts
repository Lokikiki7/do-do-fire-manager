/**
 * 금융 계산 유틸 — 전부 순수 함수.
 * UI와 완전히 분리되어 있어 단위 테스트가 쉽고,
 * 계산기/시뮬레이터/대시보드가 같은 로직을 공유한다.
 */
import type { SimulatorInput, SimulationPoint } from '@/types';

/** 연 수익률(%) → 월 복리 수익률로 변환 */
export function monthlyRate(annualPercent: number): number {
  return Math.pow(1 + annualPercent / 100, 1 / 12) - 1;
}

/**
 * 실질 수익률 (피셔 방정식).
 * 명목 수익률에서 물가상승률을 제거해 "구매력 기준" 수익률을 구한다.
 * 실질 = (1 + 명목) / (1 + 인플레이션) - 1
 * 예) 명목 7%, 인플레 2.5% → 실질 약 4.39%
 */
export function realReturnRate(nominalPercent: number, inflationPercent: number): number {
  return ((1 + nominalPercent / 100) / (1 + inflationPercent / 100) - 1) * 100;
}

/**
 * 미래 금액을 현재 구매력으로 환산 (인플레이션 할인).
 * 예) 30년 뒤 10억은 인플레 2.5%면 오늘 기준 약 4.77억의 가치.
 */
export function toPresentValue(
  futureAmount: number,
  inflationPercent: number,
  years: number,
): number {
  return futureAmount / Math.pow(1 + inflationPercent / 100, years);
}

/**
 * 4% 룰: 연간 지출을 안전 인출률로 나눠 필요한 은퇴 자금을 계산.
 * 예) 연 4천만원 지출, 4% 인출 → 10억 필요
 */
export function fireNumberByRule(annualExpense: number, withdrawalRate = 4): number {
  if (withdrawalRate <= 0) return Infinity;
  return annualExpense / (withdrawalRate / 100);
}

/** FIRE 달성률 (0~100, 초과 시 100 초과값 그대로 반환하지 않고 clamp) */
export function fireProgress(netWorth: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (netWorth / target) * 100));
}

/**
 * 투자 시뮬레이션 (월 단위 복리).
 * - 월초에 투자금 납입 → 월말에 수익률 적용
 * - 매년(12개월마다) 월 투자금이 (연봉인상률 + 투자증가율)만큼 증가
 */
export function simulate(input: SimulatorInput): SimulationPoint[] {
  const {
    initialAmount,
    monthlyInvestment,
    annualReturnRate,
    salaryGrowthRate,
    investmentGrowthRate,
    years,
  } = input;
  const r = monthlyRate(annualReturnRate);
  const growthPerYear = 1 + (salaryGrowthRate + investmentGrowthRate) / 100;
  const startYear = new Date().getFullYear();

  const points: SimulationPoint[] = [];
  let total = initialAmount;
  let principal = initialAmount;
  let monthly = monthlyInvestment;

  const totalMonths = Math.max(1, Math.min(years, 60)) * 12; // 최대 60년 안전장치

  for (let m = 0; m < totalMonths; m++) {
    // 매년 초 투자금 인상 (첫 해 제외)
    if (m > 0 && m % 12 === 0) monthly *= growthPerYear;

    total = (total + monthly) * (1 + r);
    principal += monthly;

    points.push({
      monthIndex: m,
      year: startYear + Math.floor(m / 12),
      principal: Math.round(principal),
      total: Math.round(total),
      profit: Math.round(total - principal),
    });
  }
  return points;
}

/**
 * FIRE 목표 달성 예상일 계산.
 * 현재 순자산에서 시작해 목표 금액에 도달하는 첫 달을 찾는다.
 * @returns 도달하는 Date, 60년 내 미도달 시 null
 */
export function estimateFireDate(
  currentNetWorth: number,
  target: number,
  monthlyInvestment: number,
  annualReturnRate: number,
): Date | null {
  if (currentNetWorth >= target) return new Date();
  const r = monthlyRate(annualReturnRate);
  let total = currentNetWorth;

  for (let m = 1; m <= 60 * 12; m++) {
    total = (total + monthlyInvestment) * (1 + r);
    if (total >= target) {
      const d = new Date();
      d.setMonth(d.getMonth() + m);
      return d;
    }
  }
  return null;
}

/** 저축률(%) = (투자 + 저축) / 수입 */
export function savingRate(income: number, investment: number, saving: number): number {
  if (income <= 0) return 0;
  return ((investment + saving) / income) * 100;
}
