/**
 * 금융 계산 유틸 — 전부 순수 함수.
 * UI와 완전히 분리되어 있어 단위 테스트가 쉽고,
 * 계산기/시뮬레이터/대시보드가 같은 로직을 공유한다.
 */
import type { SimulatorInput, SimulationPoint, ReturnRateTier, DailyRecord } from '@/types';
import { normalizeDate } from '@/utils/format';

/**
 * 실질 수익률 (피셔 방정식).
 * 명목 수익률에서 물가상승률을 제거해 "구매력 기준" 수익률을 구한다.
 * 실질 = (1 + 명목) / (1 + 인플레이션) - 1
 * 예) 명목 7%, 인플레 2.5% → 실질 약 4.39%
 */
export function realReturnRate(
  nominalPercent: number,
  inflationPercent: number,
): number {
  return (
    ((1 + nominalPercent / 100) / (1 + inflationPercent / 100) - 1) * 100
  );
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
export function fireNumberByRule(
  annualExpense: number,
  withdrawalRate = 4,
): number {
  if (withdrawalRate <= 0) return Infinity;
  return annualExpense / (withdrawalRate / 100);
}

/** FIRE 달성률 (0~100) */
export function fireProgress(netWorth: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (netWorth / target) * 100));
}

/**
 * 자산 규모에 따라 적용할 월 수익률을 찾는다.
 * 자산 구간별 목표 수익률 시스템의 핵심 엔진.
 */
export function getReturnRateForAsset(
  asset: number,
  tiers: ReturnRateTier[] = [],
): number {
  if (!tiers || tiers.length === 0) return 0;

  const tier = tiers.find((t) => {
    const aboveMin = asset >= t.minAsset;
    const belowMax = t.maxAsset === undefined || asset < t.maxAsset;
    return aboveMin && belowMax;
  });

  return tier ? tier.monthlyReturnRate : 0;
}

/**
 * 투자 시뮬레이션 (월 단위 복리).
 * - 월초에 투자금 납입 → 월말에 수익률 적용
 * - 매년(12개월마다) 월 투자금이 (연봉인상률 + 투자증가율)만큼 증가
 * - NEW: useVariableReturnRate=true면 구간별 수익률 자동 적용
 */
export function simulate(input: SimulatorInput): SimulationPoint[] {
  const {
    initialAmount,
    monthlyInvestment,
    monthlyReturnRate,
    salaryGrowthRate,
    investmentGrowthRate,
    years,
    useVariableReturnRate = false,
    returnRateTiers = [],
  } = input;

  const getRate = useVariableReturnRate
    ? (asset: number) => getReturnRateForAsset(asset, returnRateTiers) / 100
    : () => monthlyReturnRate / 100;

  const growthPerYear =
    1 + (salaryGrowthRate + investmentGrowthRate) / 100;
  const startYear = new Date().getFullYear();

  const points: SimulationPoint[] = [];
  let total = initialAmount;
  let principal = initialAmount;
  let monthly = monthlyInvestment;

  const totalMonths = Math.max(1, Math.min(years, 60)) * 12;

  for (let m = 0; m < totalMonths; m++) {
    if (m > 0 && m % 12 === 0) {
      monthly *= growthPerYear;
    }

    total += monthly;
    const r = getRate(total);
    total *= (1 + r);
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
  monthlyReturnRate: number,
): Date | null {
  if (currentNetWorth >= target) {
    return new Date();
  }

  const r = monthlyReturnRate / 100;
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
export function savingRate(
  income: number,
  investment: number,
  saving: number,
): number {
  if (income <= 0) return 0;
  return ((investment + saving) / income) * 100;
}

/**
 * 그날의 총지출.
 * 새 기록은 expense 하나만 쓰지만, 고정/변동을 나눠 저장하던 시절의 기록이
 * 남아 있으므로 셋을 모두 합산한다. (셋 중 둘은 항상 0이다)
 */
export function totalExpenseOf(
  r: Pick<DailyRecord, 'expense' | 'fixedExpense' | 'variableExpense'>,
): number {
  return (r.expense ?? 0) + r.fixedExpense + r.variableExpense;
}

/**
 * 그날 새로 생긴 돈 = 수입 − 지출 − 부채상환.
 *
 * 지출이 수입보다 크면 음수가 된다. 예전에는 이 값을 0으로 잘라냈는데,
 * 그러면 "투자금 + 저축 = 순저축" 관계가 깨져 누적 분해가 어긋났다.
 * 자산 계산 · 배분 · 검증이 모두 이 정의 하나를 공유한다.
 */
export function netSavingOf(
  r: Pick<DailyRecord, 'income' | 'expense' | 'fixedExpense' | 'variableExpense' | 'debt'>,
): number {
  return r.income - totalExpenseOf(r) - r.debt;
}

/** 자산 추이의 한 지점 (수입/지출 기록에서 파생) */
export interface AssetPoint {
  date: string; // YYYY-MM-DD
  /** 해당 시점 누적 총자산 (현금성 + 투자 자산) */
  totalAssets: number;
  /** 해당 시점 남은 부채 */
  liabilities: number;
  /** 해당 시점 순자산 (총자산 - 부채) */
  netWorth: number;
  /** 그날의 순자산 증감 */
  change: number;
  /** 그 시점까지 누적 투자 원금 (내가 넣은 돈의 합계) */
  investedPrincipal: number;
  /** 그 시점까지 누적 투자 수익 (원금 × 수익률의 합계) */
  investmentGain: number;
  /** 그 시점까지 누적 현금성 저축 (순저축 중 투자로 가지 않고 남은 몫) */
  cashSaving: number;
}

/**
 * 수입/지출 기록에서 자산 성장 추이를 계산한다.
 *
 * 회계 원칙:
 *   총자산 = 초기자산 + Σ(수입 - 고정지출 - 변동지출 - 부채상환 + 투자수익)
 *   부채   = 초기부채 - Σ(부채상환)                        // 0 밑으로는 안 내려감
 *   순자산 = 총자산 - 부채
 *
 * 부채 상환은 현금(자산)과 부채를 같은 금액만큼 줄이므로 순자산은 변하지 않는다.
 * (예전에는 자산만 줄고 부채는 그대로여서, 빚을 갚을수록 순자산이 깎이는 버그가 있었다)
 *
 * 남은 부채보다 많이 상환한 초과분은 순수 지출로 처리한다.
 *
 * 대시보드 차트 / 지표 카드 / 통계가 모두 이 함수 하나를 쓰므로
 * 어느 화면에서도 숫자가 어긋나지 않는다.
 */
export function buildAssetSeries(
  records: DailyRecord[],
  initialAsset: number,
  initialLiability: number,
): AssetPoint[] {
  // 정규화한 날짜로 정렬 — '2026-8-5'가 섞여 있어도 순서가 깨지지 않는다
  const sorted = [...records].sort((a, b) =>
    normalizeDate(a.date).localeCompare(normalizeDate(b.date)),
  );
  let assets = initialAsset;
  let liabilities = Math.max(0, initialLiability);
  let prevNet = assets - liabilities;
  let investedPrincipal = 0;
  let investmentGain = 0;
  let cashSaving = 0;

  return sorted.map((r) => {
    // 실제로 부채를 줄이는 금액 (남은 부채 한도 내)
    const debtPaid = Math.min(Math.max(0, r.debt), liabilities);
    // 투자자산을 헐어 현금화한 날(투자금 음수)에 수익을 매기는 건 의미가 없어 0으로 본다
    const gain = Math.max(0, r.investment) * ((r.investmentReturnRate || 0) / 100);
    const netSaving = netSavingOf(r);

    // 투자 원금은 "현금 → 투자자산" 이동이라 순자산을 늘리지 않지만,
    // 얼마를 넣었는지는 따로 누적해서 보여준다 (수익과 원금을 구분하기 위함).
    //
    // 현금저축은 저장된 r.saving이 아니라 "순저축 − 투자금"으로 직접 구한다.
    // 그래야 기록에 어긋난 값이 들어 있어도 다음 항등식이 항상 성립한다:
    //   totalAssets = 초기자산 + investedPrincipal + cashSaving + investmentGain
    investedPrincipal += r.investment;
    investmentGain += gain;
    cashSaving += netSaving - r.investment;

    assets += netSaving + gain;
    liabilities -= debtPaid;

    const netWorth = assets - liabilities;
    const change = netWorth - prevNet;
    prevNet = netWorth;

    return {
      date: r.date,
      totalAssets: assets,
      liabilities,
      netWorth,
      change,
      investedPrincipal,
      investmentGain,
      cashSaving,
    };
  });
}

/** 특정 시점까지의 누적 집계 (수입/지출 페이지 모달 · 대시보드 · 통계 공용) */
export interface CumulativeTotals {
  /** 누적금액 (부채 제외) = cash + investmentValue */
  totalAssets: number;
  /** 현금성 자산 = 초기자산 + 누적 현금저축 (투자로 빠져나가지 않고 남은 돈) */
  cash: number;
  /** 그 시점 남은 부채 */
  liabilities: number;
  /** 총 누적금액 = totalAssets - liabilities */
  netWorth: number;
  /** 누적 투자 원금 (내가 넣은 돈) */
  investedPrincipal: number;
  /** 누적 투자 수익 (원금 × 수익률) */
  investmentGain: number;
  /** 투자 평가액 = 원금 + 수익 */
  investmentValue: number;
  /** 누적 현금성 저축 (순저축 중 투자로 가지 않은 몫) */
  cashSaving: number;
  /** 누적 원금 대비 평균 수익률(%) — 투자금액 가중평균 */
  averageReturnRate: number;
  /** 합산에 실제로 포함된 기록 수 */
  recordCount: number;
}

/**
 * 선택한 날짜까지의 누적 집계를 구한다 (해당 날짜 포함).
 *
 * 투자금은 누적금액에 "다시" 더하지 않는다.
 * 투자금 + 저축 = 순저축이므로(BudgetPage에서 순저축을 쪼개 저장한다)
 * 이미 수입 - 지출로 잡힌 돈을 또 더하면 이중계산이 된다.
 * 투자가 누적을 늘리는 경로는 오직 `투자금 × 수익률`뿐이고,
 * 원금은 현금 → 투자자산 이동이라 총액을 바꾸지 않는다.
 *
 * 즉 대략 다음 항등식이 성립한다:
 *   totalAssets ≈ 초기자산 + investedPrincipal + cashSaving + investmentGain
 *
 * buildAssetSeries를 그대로 재사용하므로 대시보드/통계와 숫자가 어긋나지 않는다.
 */
export function cumulativeUpTo(
  records: DailyRecord[],
  date: string,
  initialAsset: number,
  initialLiability: number,
): CumulativeTotals {
  // 문자열 비교 전에 양쪽 다 정규화 — '2026-8-5' 같은 값이 섞여도 안전
  const cutoff = normalizeDate(date);
  const upTo = records.filter((r) => normalizeDate(r.date) <= cutoff);

  const series = buildAssetSeries(upTo, initialAsset, initialLiability);
  const last = series[series.length - 1];

  // 기록이 하나도 없으면 초기 설정값이 그대로 누적액이 된다
  const totalAssets = last?.totalAssets ?? initialAsset;
  const liabilities = last?.liabilities ?? Math.max(0, initialLiability);
  const investedPrincipal = last?.investedPrincipal ?? 0;
  const investmentGain = last?.investmentGain ?? 0;

  // 투자자산 평가액 = 누적 원금 × (1 + 평균 수익률)
  //                = 누적 원금 + 누적 수익   ← 평균이 투자금액 가중평균이라 같은 식이다
  const investmentValue = investedPrincipal + investmentGain;

  return {
    totalAssets,
    // 누적금액에서 투자자산을 뺀 나머지가 현금. 초기자산도 여기 포함된다.
    cash: totalAssets - investmentValue,
    liabilities,
    netWorth: totalAssets - liabilities,
    investedPrincipal,
    investmentGain,
    investmentValue,
    cashSaving: last?.cashSaving ?? 0,
    averageReturnRate: investedPrincipal > 0 ? (investmentGain / investedPrincipal) * 100 : 0,
    recordCount: series.length,
  };
}

/**
 * 최근 N일간의 실제 투자액 합계 → 월 환산.
 * FIRE 예상일 계산에 쓰인다.
 * (예전에는 "가장 최근 기록 1건의 투자금"을 월 투자금으로 착각해서
 *  하루 10만원을 기록하면 월 10만원 투자로 계산되는 버그가 있었다)
 */
export function monthlyInvestmentRate(records: DailyRecord[], days = 90): number {
  if (records.length === 0) return 0;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const pad = (n: number) => String(n).padStart(2, '0');
  const cutoffStr = `${cutoff.getFullYear()}-${pad(cutoff.getMonth() + 1)}-${pad(cutoff.getDate())}`;

  const recent = records.filter((r) => r.date >= cutoffStr);
  if (recent.length === 0) return 0;

  // 실제 기록이 걸쳐 있는 기간으로 나눠 월 평균을 낸다
  const dates = recent.map((r) => r.date).sort();
  const first = new Date(dates[0]);
  const last = new Date(dates[dates.length - 1]);
  const spanDays = Math.max(1, Math.round((last.getTime() - first.getTime()) / 86_400_000) + 1);

  // 투자금 + 저축 = 그날의 순저축. 각각을 따로 0으로 클램프하면
  // 지출이 많았던 날(저축 음수)이 사라져 월 적립액이 부풀려진다.
  const total = recent.reduce((s, r) => s + netSavingOf(r), 0);
  return Math.max(0, (total / spanDays) * 30);
}
