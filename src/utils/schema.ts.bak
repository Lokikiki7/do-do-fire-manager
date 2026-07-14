/**
 * 런타임 스키마 검증 및 정규화.
 *
 * 왜 필요한가:
 * - LocalStorage/백업 JSON은 외부 입력이나 마찬가지다. `as AppData` 단언만으로는
 *   필드 타입이 실제로 맞는지 보장되지 않는다(손상된 백업이 부분 통과 가능).
 * - 여기서 각 배열·필드를 실제로 검사·정제해 항상 안전한 AppData를 만든다.
 * - zod 같은 라이브러리 없이 순수 함수로 구현해 번들 증가를 피한다.
 */
import type {
  AppData,
  Settings,
  AssetSnapshot,
  MonthlyRecord,
  Milestone,
  Goal,
  SimulatorInput,
  Currency,
  ThemeMode,
  GoalTerm,
} from '@/types';
import { DEFAULT_DATA } from '@/constants';

// ── 원시 타입 가드 ──
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback);

const CURRENCIES: Currency[] = ['KRW', 'USD'];
const THEMES: ThemeMode[] = ['light', 'dark', 'system'];
const TERMS: GoalTerm[] = ['short', 'mid', 'long'];

// ── 필드별 정규화 (알 수 없는 값은 기본값으로 대체) ──

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
  };
}

/** 배열 필드를 아이템별로 검증·필터. id 없는 항목은 버린다. */
function normalizeArray<T>(v: unknown, mapItem: (raw: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const item of v) {
    if (!isObj(item)) continue;
    const mapped = mapItem(item);
    if (mapped) out.push(mapped);
  }
  return out;
}

function normalizeSnapshot(v: Record<string, unknown>): AssetSnapshot | null {
  if (typeof v.id !== 'string' || typeof v.date !== 'string') return null;
  return {
    id: v.id,
    date: v.date,
    totalAssets: num(v.totalAssets),
    liabilities: num(v.liabilities),
    memo: typeof v.memo === 'string' ? v.memo : undefined,
  };
}

function normalizeRecord(v: Record<string, unknown>): MonthlyRecord | null {
  if (typeof v.id !== 'string' || typeof v.month !== 'string') return null;
  return {
    id: v.id,
    month: v.month,
    income: num(v.income),
    fixedExpense: num(v.fixedExpense),
    variableExpense: num(v.variableExpense),
    debt: num(v.debt),
    investment: num(v.investment),
    saving: num(v.saving),
  };
}

function normalizeMilestone(v: Record<string, unknown>): Milestone | null {
  if (typeof v.id !== 'string') return null;
  return {
    id: v.id,
    year: num(v.year, new Date().getFullYear()),
    title: str(v.title, '(제목 없음)'),
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
    createdAt: str(v.createdAt, new Date().toISOString().slice(0, 10)),
    doneAt: typeof v.doneAt === 'string' ? v.doneAt : undefined,
  };
}

/**
 * 알 수 없는 입력을 항상 유효한 AppData로 정규화한다.
 * 손상된 필드는 조용히 기본값으로 대체하되, 살릴 수 있는 데이터는 최대한 보존한다.
 * @returns 유효한 AppData, 또는 최소 요건(version/settings)조차 없으면 null
 */
export function normalizeAppData(input: unknown): AppData | null {
  if (!isObj(input)) return null;
  if (input.version !== 1 || !isObj(input.settings)) return null;

  return {
    version: 1,
    settings: normalizeSettings(input.settings),
    simulator: normalizeSimulator(input.simulator),
    snapshots: normalizeArray(input.snapshots, normalizeSnapshot),
    records: normalizeArray(input.records, normalizeRecord),
    milestones: normalizeArray(input.milestones, normalizeMilestone),
    goals: normalizeArray(input.goals, normalizeGoal),
  };
}
