import type { AppData, Settings, AssetSnapshot, DailyRecord, Milestone, Goal, SimulatorInput, Currency, ThemeMode, GoalTerm } from '@/types';
import { DEFAULT_DATA } from '@/constants';

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
    date: v.date,
    totalAssets: num(v.totalAssets),
    liabilities: num(v.liabilities),
    memo: typeof v.memo === 'string' ? v.memo : undefined,
  };
}

function normalizeRecord(v: Record<string, unknown>): DailyRecord | null {
  if (typeof v.id !== 'string' || typeof v.date !== 'string') return null;
  return {
    id: v.id,
    date: v.date,
    income: num(v.income),
    fixedExpense: num(v.fixedExpense),
    variableExpense: num(v.variableExpense),
    debt: num(v.debt),
    investment: num(v.investment),
    saving: num(v.saving),
    investmentReturnRate: typeof v.investmentReturnRate === 'number' ? v.investmentReturnRate : undefined,
  };
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
