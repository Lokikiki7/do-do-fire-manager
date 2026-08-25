import type { AppData, Settings, AssetSnapshot, DailyRecord, Milestone, Goal, SimulatorInput, Currency, ThemeMode, GoalTerm } from '@/types';
import { DEFAULT_DATA } from '@/constants';
import { normalizeDate } from '@/utils/format';
import { netSavingOf } from '@/utils/finance';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback = 0): number => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback);

const CURRENCIES: Currency[] = ['KRW', 'USD'];
const THEMES: ThemeMode[] = ['light', 'dark', 'system'];
const TERMS: GoalTerm[] = ['short', 'mid', 'long'];

function normalizeSettings(v: unknown): Settings {
  const d = DEFAULT_DATA.settings;
  if (!isObj(v)) return { ...d };
  return {
    name: str(v.name, d.name),
    fireTarget: num(v.fireTarget, d.fireTarget),
    annualExpense: num(v.annualExpense, d.annualExpense),
    defaultReturnRate: num(v.defaultReturnRate, d.defaultReturnRate),
    currency: CURRENCIES.includes(v.currency as Currency) ? (v.currency as Currency) : d.currency,
    theme: THEMES.includes(v.theme as ThemeMode) ? (v.theme as ThemeMode) : d.theme,
    withdrawalRate: num(v.withdrawalRate, d.withdrawalRate),
    inflationRate: num(v.inflationRate, d.inflationRate),
    initialAsset: num(v.initialAsset, d.initialAsset),
    initialLiability: num(v.initialLiability, d.initialLiability),
  };
}

function normalizeSnapshot(v: Record<string, unknown>): AssetSnapshot | null {
  if (typeof v.id !== 'string' || typeof v.date !== 'string') return null;
  return {
    id: v.id,
    date: normalizeDate(v.date),
    totalAssets: num(v.totalAssets),
    liabilities: num(v.liabilities),
    memo: typeof v.memo === 'string' ? v.memo : undefined,
  };
}

/**
 * 투자금 + 저축 = 순저축 을 보장한다.
 *
 * 저축은 "순저축 중 투자로 가지 않고 남은 몫"이라는 파생값인데,
 * 예전 입력 로직은 투자금과 저축을 각각 따로 계산해서
 *   - 둘 다 직접 입력하면 합이 순저축을 넘어가고
 *   - 둘 다 비워두면 순저축이 어디에도 잡히지 않았다.
 * 그 결과 저축률과 누적 분해(원금/현금저축)가 실제 자산과 어긋났다.
 *
 * 투자금은 사용자가 명시적으로 정한 값이므로 그대로 두고,
 * 파생값인 저축만 다시 계산해 맞춘다. 지출이 수입보다 컸거나
 * 기존 현금을 헐어 투자한 날은 저축이 음수가 되는데, 이는 정상이다.
 */
function reconcileAllocation(r: DailyRecord): DailyRecord {
  const saving = netSavingOf(r) - r.investment;
  return saving === r.saving ? r : { ...r, saving };
}

function normalizeRecord(v: Record<string, unknown>): DailyRecord | null {
  if (typeof v.id !== 'string' || typeof v.date !== 'string') return null;
  return reconcileAllocation({
    id: v.id,
    // 임포트/동기화로 들어온 '2026-8-5'를 여기서 한 번에 교정한다.
    // 이후 코드는 전부 문자열 비교라 정규화되지 않은 날짜가 섞이면 정렬이 깨진다.
    date: normalizeDate(v.date),
    income: num(v.income),
    expense: num(v.expense),
    // 고정/변동으로 나눠 저장하던 시절의 기록은 값을 그대로 보존한다 (합산해서 쓴다)
    fixedExpense: num(v.fixedExpense),
    variableExpense: num(v.variableExpense),
    debt: num(v.debt),
    investment: num(v.investment),
    saving: num(v.saving),
    investmentReturnRate: typeof v.investmentReturnRate === 'number' ? v.investmentReturnRate : undefined,
  });
}

function normalizeMilestone(v: Record<string, unknown>): Milestone | null {
  if (typeof v.id !== 'string') return null;
  return {
    id: v.id,
    year: num(v.year, new Date().getFullYear()),
    title: str(v.title, '(제목 없음)'),
    targetAmount: typeof v.targetAmount === 'number' ? v.targetAmount : undefined,
    done: bool(v.done),
    doneAt: typeof v.doneAt === 'string' ? v.doneAt : undefined,
  };
}

function normalizeGoal(v: Record<string, unknown>): Goal | null {
  if (typeof v.id !== 'string') return null;
  return {
    id: v.id,
    term: TERMS.includes(v.term as GoalTerm) ? (v.term as GoalTerm) : 'short',
    title: str(v.title, '(제목 없음)'),
    done: bool(v.done),
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : new Date().toISOString(),
    doneAt: typeof v.doneAt === 'string' ? v.doneAt : undefined,
  };
}

function normalizeSimulator(v: unknown): SimulatorInput {
  const d = DEFAULT_DATA.simulator;
  if (!isObj(v)) return { ...d };
  return {
    initialAmount: num(v.initialAmount, d.initialAmount),
    monthlyInvestment: num(v.monthlyInvestment, d.monthlyInvestment),
    monthlyReturnRate: num(v.monthlyReturnRate, d.monthlyReturnRate),
    salaryGrowthRate: num(v.salaryGrowthRate, d.salaryGrowthRate),
    investmentGrowthRate: num(v.investmentGrowthRate, d.investmentGrowthRate),
    years: num(v.years, d.years),
    // 클라우드 왕복 시 손실되지 않도록 구간별 수익률 설정도 보존
    useVariableReturnRate: typeof v.useVariableReturnRate === 'boolean' ? v.useVariableReturnRate : undefined,
    returnRateTiers: Array.isArray(v.returnRateTiers)
      ? (v.returnRateTiers as SimulatorInput['returnRateTiers'])
      : undefined,
  };
}

function normalizeArray<T>(v: unknown, fn: (x: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === 'object' && x !== null && !Array.isArray(x))
    .map((x) => fn(x as Record<string, unknown>))
    .filter((x): x is T => x !== null);
}

export function normalizeAppData(v: unknown): AppData | null {
  if (!isObj(v)) return null;
  return {
    version: 1,
    settings: normalizeSettings(v.settings),
    simulator: normalizeSimulator(v.simulator),
    snapshots: normalizeArray(v.snapshots, normalizeSnapshot),
    records: normalizeArray(v.records, normalizeRecord),
    milestones: normalizeArray(v.milestones, normalizeMilestone),
    goals: normalizeArray(v.goals, normalizeGoal),
  };
}
