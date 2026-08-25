/**
 * 금융 계산 로직 테스트.
 * 돈이 걸린 핵심 로직이므로 정확한 수치와 경계 조건을 모두 검증한다.
 */
import { describe, it, expect } from 'vitest';
import {
  fireNumberByRule,
  fireProgress,
  simulate,
  estimateFireDate,
  savingRate,
  realReturnRate,
  toPresentValue,
  buildAssetSeries,
  monthlyInvestmentRate,
  cumulativeUpTo,
  netSavingOf,
  totalExpenseOf,
} from '@/utils/finance';
import type { SimulatorInput, DailyRecord } from '@/types';

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
    monthlyReturnRate: 0.5,
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

  it('복리 수익이 원금을 초과한다 (월 0.5% 20년)', () => {
    const last = simulate(base).at(-1)!;
    expect(last.total).toBeGreaterThan(last.principal);
    expect(last.profit).toBe(last.total - last.principal);
  });

  it('수익률 0%면 총자산 = 원금 (수익 0)', () => {
    const noReturn = simulate({ ...base, monthlyReturnRate: 0 });
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
    const d = estimateFireDate(2_000_000_000, 1_000_000_000, 1_000_000, 0.5);
    expect(d).toBeInstanceOf(Date);
    // 오늘 날짜와 같은 날
    expect(d!.toDateString()).toBe(new Date().toDateString());
  });

  it('월 투자로 목표에 도달하면 미래 날짜를 반환', () => {
    const d = estimateFireDate(0, 100_000_000, 2_000_000, 0.5);
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

describe('buildAssetSeries — 수입/지출 기록 기반 자산 추이', () => {
  const rec = (date: string, p: Partial<DailyRecord> = {}): DailyRecord => ({
    id: date,
    date,
    income: 0,
    fixedExpense: 0,
    variableExpense: 0,
    debt: 0,
    investment: 0,
    saving: 0,
    ...p,
  });

  it('기록이 없으면 빈 배열', () => {
    expect(buildAssetSeries([], 1000, 0)).toEqual([]);
  });

  it('초기자산에 순저축을 누적한다', () => {
    const s = buildAssetSeries(
      [rec('2026-01-01', { income: 500, fixedExpense: 200 })],
      1000,
      0,
    );
    expect(s[0].change).toBe(300);
    expect(s[0].totalAssets).toBe(1300);
    expect(s[0].netWorth).toBe(1300);
  });

  it('투자 수익률을 반영한다', () => {
    const s = buildAssetSeries(
      [rec('2026-01-01', { income: 100, investment: 1000, investmentReturnRate: 10 })],
      0,
      0,
    );
    // 순저축 100(투자는 자산 내 이동이라 차감 안 함) + 투자수익 100
    expect(s[0].change).toBe(200);
  });

  it('부채를 순자산에서 차감한다', () => {
    const s = buildAssetSeries([rec('2026-01-01', { income: 100 })], 1000, 400);
    expect(s[0].totalAssets).toBe(1100);
    expect(s[0].liabilities).toBe(400);
    expect(s[0].netWorth).toBe(700);
  });

  it('부채 상환은 자산과 부채를 같이 줄여 순자산이 변하지 않는다', () => {
    const s = buildAssetSeries([rec('2026-01-01', { debt: 300 })], 1000, 400);
    expect(s[0].totalAssets).toBe(700); // 현금 300 감소
    expect(s[0].liabilities).toBe(100); // 부채 300 감소
    expect(s[0].netWorth).toBe(600); // 순자산 그대로 (1000 - 400)
    expect(s[0].change).toBe(0);
  });

  it('남은 부채보다 많이 상환하면 초과분은 지출로 처리한다', () => {
    const s = buildAssetSeries([rec('2026-01-01', { debt: 500 })], 1000, 200);
    expect(s[0].totalAssets).toBe(500); // 500 전액 유출
    expect(s[0].liabilities).toBe(0); // 부채는 0에서 멈춤
    expect(s[0].netWorth).toBe(500);
    expect(s[0].change).toBe(-300); // 초과 상환 300은 순손실
  });

  it('부채를 다 갚은 뒤에는 순자산이 초기 자산과 같아진다', () => {
    const s = buildAssetSeries(
      [rec('2026-01-01', { debt: 200 }), rec('2026-01-02', { debt: 200 })],
      1000,
      400,
    );
    expect(s[1].liabilities).toBe(0);
    expect(s[1].netWorth).toBe(600);
  });

  it('날짜순으로 정렬해 누적한다 (입력 순서 무관)', () => {
    const s = buildAssetSeries(
      [rec('2026-01-03', { income: 30 }), rec('2026-01-01', { income: 10 }), rec('2026-01-02', { income: 20 })],
      0,
      0,
    );
    expect(s.map((p) => p.date)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
    expect(s.map((p) => p.totalAssets)).toEqual([10, 30, 60]);
  });
});


describe('누적 투자 원금 / 수익 추적', () => {
  const rec = (date: string, p: Partial<DailyRecord> = {}): DailyRecord => ({
    id: date,
    date,
    income: 0,
    fixedExpense: 0,
    variableExpense: 0,
    debt: 0,
    investment: 0,
    saving: 0,
    ...p,
  });

  it('투자 원금은 날마다 누적된다 (100 + 100 = 200)', () => {
    const s = buildAssetSeries(
      [rec('2026-01-01', { investment: 100 }), rec('2026-01-02', { investment: 100 })],
      0,
      0,
    );
    expect(s[0].investedPrincipal).toBe(100);
    expect(s[1].investedPrincipal).toBe(200);
  });

  it('투자 원금만으로는 순자산이 늘지 않는다 (현금→투자자산 이동)', () => {
    const s = buildAssetSeries([rec('2026-01-01', { investment: 100 })], 1000, 0);
    expect(s[0].investedPrincipal).toBe(100);
    expect(s[0].netWorth).toBe(1000); // 그대로
  });

  it('투자 수익이 누적되어 순자산을 늘린다', () => {
    const s = buildAssetSeries(
      [
        rec('2026-01-01', { investment: 100, investmentReturnRate: 10 }),
        rec('2026-01-02', { investment: 100, investmentReturnRate: 10 }),
      ],
      0,
      0,
    );
    expect(s[1].investedPrincipal).toBe(200);
    // 수익률은 그날 넣은 돈이 아니라 누적 투자금 전체에 붙는다
    expect(s[0].investmentGain).toBe(10); // 100 × 10%
    expect(s[1].investmentGain).toBe(30); // 10 + (200 × 10% = 20)
    expect(s[1].netWorth).toBe(30);
  });

  it('요청 예시: 500만 → +300만 → +200만, 각 10%면 누적수익 230만', () => {
    const s = buildAssetSeries(
      [
        rec('2026-01-01', { investment: 5_000_000, investmentReturnRate: 10 }),
        rec('2026-01-02', { investment: 3_000_000, investmentReturnRate: 10 }),
        rec('2026-01-03', { investment: 2_000_000, investmentReturnRate: 10 }),
      ],
      0,
      0,
    );
    expect(s.map((p) => p.investmentGain)).toEqual([500_000, 1_300_000, 2_300_000]); // 50 / +80 / +100
    expect(s[2].investedPrincipal).toBe(10_000_000);
    expect(s[2].investmentGain).toBe(2_300_000);
  });

  it('투자금을 더 넣지 않아도 누적 투자금에 계속 수익이 붙는다', () => {
    const s = buildAssetSeries(
      [
        rec('2026-01-01', { investment: 1000, investmentReturnRate: 10 }),
        rec('2026-01-02', { investmentReturnRate: 10 }),
      ],
      0,
      0,
    );
    expect(s[1].investedPrincipal).toBe(1000); // 원금은 그대로
    expect(s[1].investmentGain).toBe(200); // 100 + 100
  });

  it('투자 수익은 현금으로 들어온다 (투자 원금은 빠져나가지 않는다)', () => {
    const s = buildAssetSeries(
      [rec('2026-01-01', { income: 1000, investment: 1000, investmentReturnRate: 10 })],
      0,
      0,
    );
    expect(s[0].investedPrincipal).toBe(1000);
    expect(s[0].cashSaving).toBe(0); // 순저축 1000을 전액 투자 → 저축 몫 0
    expect(s[0].investmentGain).toBe(100);
    // 총액 = 원금 1000 + 저축 0 + 수익 100
    expect(s[0].totalAssets).toBe(1100);
  });

  it('음수 투자금(투자자산을 헐어 현금화)도 원금 누적에 그대로 반영한다', () => {
    const s = buildAssetSeries([rec('2026-01-01', { investment: -50 })], 0, 0);
    expect(s[0].investedPrincipal).toBe(-50);
    // 투자에서 뺀 만큼 현금으로 돌아오므로 총액은 그대로
    expect(s[0].cashSaving).toBe(50);
    expect(s[0].totalAssets).toBe(0);
  });

  it('음수 투자금에는 수익률을 매기지 않는다', () => {
    const s = buildAssetSeries(
      [rec('2026-01-01', { investment: -50, investmentReturnRate: 10 })],
      0,
      0,
    );
    expect(s[0].investmentGain).toBe(0);
  });

  it('기록이 어긋나 있어도 원금 + 현금저축 + 수익 = 누적금액이 성립한다', () => {
    // saving 값이 순저축과 맞지 않는(예전 로직이 만든) 기록
    const s = buildAssetSeries(
      [
        rec('2026-01-01', { income: 1000, investment: 600, saving: 900 }),
        rec('2026-01-02', { income: 500, fixedExpense: 800, investment: 0, saving: 0 }),
      ],
      2000,
      0,
    );
    const last = s[s.length - 1];
    expect(last.totalAssets).toBe(
      2000 + last.investedPrincipal + last.cashSaving + last.investmentGain,
    );
  });
});

describe('monthlyInvestmentRate — 월 투자액 환산', () => {
  /** 수입을 전액 투자한 날 — 투자금 + 저축 = 순저축을 만족하는 기록 */
  const rec = (date: string, investment: number): DailyRecord => ({
    id: date,
    date,
    income: investment,
    fixedExpense: 0,
    variableExpense: 0,
    debt: 0,
    investment,
    saving: 0,
  });

  it('기록이 없으면 0', () => {
    expect(monthlyInvestmentRate([])).toBe(0);
  });

  it('오래된 기록만 있으면 0 (최근 90일 밖)', () => {
    expect(monthlyInvestmentRate([rec('2020-01-01', 1000)])).toBe(0);
  });

  it('최근 기록을 월 단위로 환산한다', () => {
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const d1 = new Date(today);
    d1.setDate(d1.getDate() - 9); // 10일 전
    const d2 = new Date(today);

    // 10일에 걸쳐 총 100 투자 → 하루 10 → 월 300
    const result = monthlyInvestmentRate([rec(iso(d1), 50), rec(iso(d2), 50)]);
    expect(result).toBeCloseTo(300, 0);
  });
  it('지출이 많았던 날은 월 적립액을 깎는다 (각각 0으로 자르지 않음)', () => {
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const d1 = new Date(today);
    d1.setDate(d1.getDate() - 9);
    const d2 = new Date(today);

    const spent: DailyRecord = {
      id: 'spent',
      date: iso(d2),
      income: 0,
      fixedExpense: 100,
      variableExpense: 0,
      debt: 0,
      investment: 0,
      saving: -100,
    };
    // 10일간 +100 벌어 투자, -100 지출 → 순 적립 0
    expect(monthlyInvestmentRate([rec(iso(d1), 100), spent])).toBe(0);
  });

  it('순 적립이 음수여도 0 밑으로는 내려가지 않는다', () => {
    const today = new Date();
    const overspent: DailyRecord = {
      id: 'overspent',
      date: today.toISOString().slice(0, 10),
      income: 0,
      fixedExpense: 500,
      variableExpense: 0,
      debt: 0,
      investment: 0,
      saving: -500,
    };
    expect(monthlyInvestmentRate([overspent])).toBe(0);
  });
});

describe('cumulativeUpTo — 선택한 날짜까지 누적', () => {
  const rec = (date: string, p: Partial<DailyRecord> = {}): DailyRecord => ({
    id: date,
    date,
    income: 0,
    fixedExpense: 0,
    variableExpense: 0,
    debt: 0,
    investment: 0,
    saving: 0,
    ...p,
  });

  it('기록이 없으면 초기 설정값이 그대로 누적액', () => {
    const c = cumulativeUpTo([], '2026-01-01', 1000, 400);
    expect(c.totalAssets).toBe(1000);
    expect(c.liabilities).toBe(400);
    expect(c.netWorth).toBe(600);
    expect(c.recordCount).toBe(0);
  });

  it('선택한 날짜 이후 기록은 제외한다', () => {
    const records = [
      rec('2026-01-01', { income: 100 }),
      rec('2026-01-02', { income: 200 }),
      rec('2026-01-03', { income: 400 }),
    ];
    const c = cumulativeUpTo(records, '2026-01-02', 0, 0);
    expect(c.totalAssets).toBe(300); // 100 + 200, 400은 미포함
    expect(c.recordCount).toBe(2);
  });

  it('선택한 날짜 당일 기록은 포함한다', () => {
    const c = cumulativeUpTo([rec('2026-01-02', { income: 200 })], '2026-01-02', 0, 0);
    expect(c.totalAssets).toBe(200);
  });

  it('투자금은 누적금액을 늘리지 않는다 (순저축을 쪼갠 것이라 이중계산 방지)', () => {
    const withInvestment = cumulativeUpTo(
      [rec('2026-01-01', { income: 1000, investment: 600, saving: 400 })],
      '2026-01-01',
      0,
      0,
    );
    const withoutInvestment = cumulativeUpTo(
      [rec('2026-01-01', { income: 1000, saving: 1000 })],
      '2026-01-01',
      0,
      0,
    );
    // 투자로 600을 돌리든 전액 저축하든 누적금액은 수입 1000 그대로
    expect(withInvestment.totalAssets).toBe(1000);
    expect(withoutInvestment.totalAssets).toBe(1000);
  });

  it('투자 수익만 누적금액에 더해진다', () => {
    const c = cumulativeUpTo(
      [rec('2026-01-01', { income: 1000, investment: 1000, investmentReturnRate: 10 })],
      '2026-01-01',
      0,
      0,
    );
    expect(c.investedPrincipal).toBe(1000);
    expect(c.investmentGain).toBe(100);
    expect(c.investmentValue).toBe(1100); // 원금 + 수익
    expect(c.totalAssets).toBe(1100); // 수입 1000 + 수익 100 (원금은 재차 더하지 않음)
  });

  it('원금 + 현금저축 + 수익이 누적금액과 맞아떨어진다', () => {
    const c = cumulativeUpTo(
      [
        rec('2026-01-01', { income: 1000, investment: 600, saving: 400 }),
        rec('2026-01-02', { income: 500, investment: 500, investmentReturnRate: 10 }),
      ],
      '2026-01-02',
      0,
      0,
    );
    expect(c.investedPrincipal).toBe(1100);
    expect(c.cashSaving).toBe(400);
    expect(c.investmentGain).toBe(110); // 누적 투자금 1100 × 10%
    expect(c.totalAssets).toBe(c.investedPrincipal + c.cashSaving + c.investmentGain);
  });

  it('부채는 상환한 만큼 줄고 총 누적금액에서 빠진다', () => {
    const c = cumulativeUpTo([rec('2026-01-01', { debt: 300 })], '2026-01-01', 1000, 400);
    expect(c.liabilities).toBe(100);
    expect(c.totalAssets).toBe(700);
    expect(c.netWorth).toBe(600);
  });

  it('zero-pad 되지 않은 날짜도 올바르게 비교한다', () => {
    const records = [
      rec('2026-8-5', { income: 100 }),
      rec('2026-12-01', { income: 200 }),
    ];
    // 문자열 비교만 하면 '2026-8-5' > '2026-12-01' 이라 12월 기록이 잘려나간다
    const c = cumulativeUpTo(records, '2026-12-31', 0, 0);
    expect(c.totalAssets).toBe(300);
    expect(c.recordCount).toBe(2);

    const august = cumulativeUpTo(records, '2026-8-31', 0, 0);
    expect(august.totalAssets).toBe(100);
  });
});

describe('totalExpenseOf — 통합 지출 + 과거 고정/변동 합산', () => {
  const of = (p: Partial<DailyRecord>) =>
    totalExpenseOf({ expense: 0, fixedExpense: 0, variableExpense: 0, ...p });

  it('통합 지출만 있는 새 기록', () => {
    expect(of({ expense: 500 })).toBe(500);
  });

  it('고정/변동으로 나뉜 과거 기록도 합산한다', () => {
    expect(of({ fixedExpense: 300, variableExpense: 200 })).toBe(500);
  });

  it('expense가 없는(undefined) 과거 기록도 안전하다', () => {
    expect(totalExpenseOf({ fixedExpense: 300, variableExpense: 200 })).toBe(500);
  });

  it('섞여 있어도 전부 더한다', () => {
    expect(of({ expense: 100, fixedExpense: 300, variableExpense: 200 })).toBe(600);
  });
});

describe('netSavingOf — 통합 지출 반영', () => {
  it('수입 − 지출 − 부채상환', () => {
    expect(
      netSavingOf({ income: 1000, expense: 300, fixedExpense: 0, variableExpense: 0, debt: 200 }),
    ).toBe(500);
  });

  it('과거 방식으로 저장된 지출도 똑같이 빠진다', () => {
    expect(
      netSavingOf({ income: 1000, expense: 0, fixedExpense: 200, variableExpense: 100, debt: 200 }),
    ).toBe(500);
  });
});

describe('cumulativeUpTo — 누적금액 구성', () => {
  const rec = (date: string, p: Partial<DailyRecord> = {}): DailyRecord => ({
    id: date,
    date,
    income: 0,
    expense: 0,
    fixedExpense: 0,
    variableExpense: 0,
    debt: 0,
    investment: 0,
    saving: 0,
    ...p,
  });

  it('누적금액 = 초기자산 + 수입 − 지출 − 부채상환 (투자금은 차감하지 않는다)', () => {
    const c = cumulativeUpTo(
      [rec('2026-01-01', { income: 1000, expense: 200, debt: 100, investment: 500 })],
      '2026-01-01',
      300,
      500,
    );
    expect(c.totalIncome).toBe(1000);
    expect(c.totalExpense).toBe(200);
    expect(c.totalDebtPayment).toBe(100);
    // 300 + 1000 − 200 − 100 = 1000. 투자금 500은 빼지 않는다.
    expect(c.cash).toBe(1000);
  });

  it('투자금을 늘려도 누적금액은 줄지 않는다', () => {
    const base = { income: 1000 };
    const noInvest = cumulativeUpTo([rec('2026-01-01', base)], '2026-01-01', 0, 0);
    const invested = cumulativeUpTo(
      [rec('2026-01-01', { ...base, investment: 900 })],
      '2026-01-01',
      0,
      0,
    );
    expect(noInvest.cash).toBe(1000);
    expect(invested.cash).toBe(1000); // 투자에 넣어도 내 돈은 그대로
    expect(invested.investedPrincipal).toBe(900);
  });

  it('과거 방식 고정/변동 지출도 누적지출에 합산된다', () => {
    const c = cumulativeUpTo(
      [rec('2026-01-01', { income: 1000, fixedExpense: 200, variableExpense: 100 })],
      '2026-01-01',
      0,
      0,
    );
    expect(c.totalExpense).toBe(300);
    expect(c.cash).toBe(700);
  });

  it('누적금액 + 누적투자수익 = 총자산', () => {
    const c = cumulativeUpTo(
      [
        rec('2026-01-01', { income: 1000, investment: 600, saving: 400, investmentReturnRate: 5 }),
        rec('2026-01-02', { income: 500, expense: 200, investment: 100, saving: 200 }),
      ],
      '2026-01-02',
      700,
      0,
    );
    expect(c.totalAssets).toBe(c.cash + c.investmentGain);
  });

  it('초기자산은 누적금액에 포함된다', () => {
    const c = cumulativeUpTo([rec('2026-01-01', { income: 100 })], '2026-01-01', 5000, 0);
    expect(c.cash).toBe(5100);
  });

  it('기록이 없으면 누적금액은 초기자산 그대로', () => {
    const c = cumulativeUpTo([], '2026-01-01', 5000, 0);
    expect(c.cash).toBe(5000);
    expect(c.totalIncome).toBe(0);
    expect(c.totalExpense).toBe(0);
    expect(c.totalDebtPayment).toBe(0);
  });

  it('평균 수익률은 투자금액 가중평균이다', () => {
    // 500 @ 10% → 50, 300 @ 0% → 0. 누적 원금 800, 수익 50 → 6.25%
    const c = cumulativeUpTo(
      [
        rec('2026-01-01', { income: 500, investment: 500, investmentReturnRate: 10 }),
        rec('2026-01-02', { income: 300, investment: 300, investmentReturnRate: 0 }),
      ],
      '2026-01-02',
      0,
      0,
    );
    expect(c.investedPrincipal).toBe(800);
    expect(c.investmentGain).toBe(50);
    expect(c.averageReturnRate).toBeCloseTo(6.25, 6);
    // 요청하신 "누적 투자금 × (1 + 평균 수익률)" 공식과 일치한다
    expect(c.investmentValue).toBeCloseTo(800 * (1 + 6.25 / 100), 6);
  });

  it('투자 기록이 없으면 평균 수익률은 0 (0으로 나눔 방어)', () => {
    const c = cumulativeUpTo([rec('2026-01-01', { income: 100 })], '2026-01-01', 0, 0);
    expect(c.averageReturnRate).toBe(0);
  });
});

describe('cumulativeUpTo — 소계 / 총누적금액 구성', () => {
  const rec = (date: string, p: Partial<DailyRecord> = {}): DailyRecord => ({
    id: date,
    date,
    income: 0,
    expense: 0,
    fixedExpense: 0,
    variableExpense: 0,
    debt: 0,
    investment: 0,
    saving: 0,
    ...p,
  });

  it('소계 = 누적금액 − 누적부채상환 (요청 사양: 부채 카드가 상환액이다)', () => {
    const c = cumulativeUpTo([rec('2026-01-01', { income: 1000, debt: 400 })], '2026-01-01', 0, 400);
    expect(c.totalDebtPayment).toBe(400);
    expect(c.cash).toBe(600); // 1000 − 400 (누적금액에서 이미 상환액이 빠짐)
    expect(c.subtotal).toBe(200); // 600 − 400 (소계에서 한 번 더 빠진다)
  });

  it('상환 기록이 없으면 소계는 누적금액과 같다 (남은 부채와 무관)', () => {
    const c = cumulativeUpTo([rec('2026-01-01', { income: 1000 })], '2026-01-01', 0, 400);
    expect(c.totalDebtPayment).toBe(0);
    expect(c.liabilities).toBe(400); // 남은 부채는 있지만
    expect(c.subtotal).toBe(c.cash); // 소계는 상환액 기준이라 그대로
  });

  it('신고된 버그: 누적투자금이 누적금액에서 차감되면 안 된다', () => {
    // 누적수입 10,289,070 · 초기자산 500,000 · 지출/부채상환 0 · 누적투자금 9,300,000
    // 예전 로직은 투자금을 빼서 1,489,070을 보여줬다
    const c = cumulativeUpTo(
      [rec('2027-02-25', { income: 10_289_070, investment: 9_300_000, saving: 989_070 })],
      '2027-02-25',
      500_000,
      0,
    );
    expect(c.cash).toBe(10_789_070);
    expect(c.cash).not.toBe(1_489_070);
    expect(c.investedPrincipal).toBe(9_300_000);
  });

  it('부채가 전혀 없으면 소계는 누적금액과 같다', () => {
    const c = cumulativeUpTo([rec('2026-01-01', { income: 1000 })], '2026-01-01', 0, 0);
    expect(c.totalDebtPayment).toBe(0);
    expect(c.subtotal).toBe(c.cash);
  });

  it('총순자산 = 누적금액 + 누적투자수익', () => {
    const c = cumulativeUpTo(
      [rec('2026-01-01', { income: 2000, investment: 1000, investmentReturnRate: 10 })],
      '2026-01-01',
      0,
      0,
    );
    expect(c.cash).toBe(2000); // 투자금 1000을 빼지 않는다
    expect(c.investmentGain).toBe(100);
    expect(c.totalAssets).toBe(2100); // 2000 + 100
    expect(c.totalAssets).toBe(c.cash + c.investmentGain);
  });

  it('투자수익은 현금이 아니라 별도 항목으로 잡힌다 (누적금액에 섞이지 않음)', () => {
    const withGain = cumulativeUpTo(
      [rec('2026-01-01', { income: 1000, investment: 1000, investmentReturnRate: 10 })],
      '2026-01-01',
      0,
      0,
    );
    const withoutGain = cumulativeUpTo(
      [rec('2026-01-01', { income: 1000, investment: 1000 })],
      '2026-01-01',
      0,
      0,
    );
    // 수익이 나도 '누적금액(투자금·부채 제외)' 카드는 그대로다
    expect(withGain.cash).toBe(withoutGain.cash);
    // 늘어난 건 수익 항목과 총누적금액뿐
    expect(withGain.investmentGain).toBe(100);
    expect(withGain.netWorth - withoutGain.netWorth).toBe(100);
  });
});

describe('cumulativeUpTo — 투자 섹션 (통장잔액 / 총평가액 / 이달수익)', () => {
  const rec = (date: string, p: Partial<DailyRecord> = {}): DailyRecord => ({
    id: date,
    date,
    income: 0,
    expense: 0,
    fixedExpense: 0,
    variableExpense: 0,
    debt: 0,
    investment: 0,
    saving: 0,
    ...p,
  });

  it('요청 예시: 누적금액 12,589,070 · 누적투자금 1,100만 → 통장잔액 1,589,070', () => {
    const c = cumulativeUpTo(
      [rec('2026-08-26', { income: 12_589_070, investment: 11_000_000, saving: 1_589_070 })],
      '2026-08-26',
      0,
      0,
    );
    expect(c.cash).toBe(12_589_070);
    expect(c.investedPrincipal).toBe(11_000_000);
    expect(c.bankBalance).toBe(1_589_070); // 12,589,070 − 11,000,000
  });

  it('투자자산 총평가액 = 누적투자금 + 누적투자수익 (1100 + 110 = 1210만)', () => {
    const c = cumulativeUpTo(
      [
        rec('2026-08-26', {
          income: 12_589_070,
          investment: 11_000_000,
          saving: 1_589_070,
          investmentReturnRate: 10,
        }),
      ],
      '2026-08-26',
      0,
      0,
    );
    expect(c.investedPrincipal).toBe(11_000_000);
    expect(c.investmentGain).toBe(1_100_000);
    expect(c.investmentValue).toBe(12_100_000);
  });

  it('총순자산 = 통장잔액 + 투자자산 총평가액', () => {
    const c = cumulativeUpTo(
      [
        rec('2026-08-26', {
          income: 12_589_070,
          investment: 11_000_000,
          saving: 1_589_070,
          investmentReturnRate: 10,
        }),
      ],
      '2026-08-26',
      0,
      0,
    );
    expect(c.totalAssets).toBe(c.bankBalance + c.investmentValue);
    expect(c.totalAssets).toBe(13_689_070); // 1,589,070 + 12,100,000
  });

  it('이달투자수익은 선택한 달의 수익만 센다', () => {
    const records = [
      rec('2026-07-31', { income: 1000, investment: 1000, investmentReturnRate: 10 }), // 7월: 100
      rec('2026-08-10', { income: 0, investment: 0, saving: 0, investmentReturnRate: 10 }), // 8월: 100
      rec('2026-08-20', { income: 0, investment: 0, saving: 0, investmentReturnRate: 10 }), // 8월: 100
    ];
    const c = cumulativeUpTo(records, '2026-08-26', 0, 0);
    expect(c.investmentGain).toBe(300); // 누적
    expect(c.monthlyGain).toBe(200); // 8월치만
  });

  it('이달투자수익은 선택한 날짜 이후 기록을 세지 않는다', () => {
    const records = [
      rec('2026-08-10', { income: 1000, investment: 1000, investmentReturnRate: 10 }),
      rec('2026-08-28', { investmentReturnRate: 10 }),
    ];
    const c = cumulativeUpTo(records, '2026-08-20', 0, 0);
    expect(c.monthlyGain).toBe(100); // 8/28 기록은 제외
  });

  it('그 달에 수익 기록이 없으면 이달투자수익은 0', () => {
    const c = cumulativeUpTo(
      [rec('2026-07-31', { income: 1000, investment: 1000, investmentReturnRate: 10 })],
      '2026-08-26',
      0,
      0,
    );
    expect(c.investmentGain).toBe(100);
    expect(c.monthlyGain).toBe(0);
  });

  it('투자금이 누적금액을 넘으면 통장잔액이 음수가 된다', () => {
    const c = cumulativeUpTo(
      [rec('2026-08-26', { income: 500, investment: 800, saving: -300 })],
      '2026-08-26',
      0,
      0,
    );
    expect(c.cash).toBe(500);
    expect(c.bankBalance).toBe(-300);
  });
});
