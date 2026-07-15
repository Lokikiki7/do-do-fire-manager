export type Currency = 'KRW' | 'USD';
export type ThemeMode = 'light' | 'dark' | 'system';
export type GoalTerm = 'short' | 'mid' | 'long';

export interface Settings {
  name: string;
  fireTarget: number;
  annualExpense: number;
  defaultReturnRate: number;
  currency: Currency;
  theme: ThemeMode;
  withdrawalRate: number;
  inflationRate: number;
  initialAsset: number;
  initialLiability: number;
}

export interface AssetSnapshot {
  id: string;
  date: string;
  totalAssets: number;
  liabilities: number;
  memo?: string;
}

export interface DailyRecord {
  id: string;
  date: string;
  income: number;
  fixedExpense: number;
  variableExpense: number;
  debt: number;
  investment: number;
  saving: number;
  investmentReturnRate?: number;
}

export interface Milestone {
  id: string;
  year: number;
  title: string;
  targetAmount?: number;
  done: boolean;
  doneAt?: string;
}

export interface ReturnRateTier {
  id: string;
  minAsset: number;
  maxAsset?: number;
  monthlyReturnRate: number;
  label?: string;
}

export interface Goal {
  id: string;
  term: GoalTerm;
  title: string;
  done: boolean;
  createdAt: string;
  doneAt?: string;
}

export interface SimulatorInput {
  initialAmount: number;
  monthlyInvestment: number;
  monthlyReturnRate: number;
  salaryGrowthRate: number;
  investmentGrowthRate: number;
  years: number;
  useVariableReturnRate?: boolean;
  returnRateTiers?: ReturnRateTier[];
}

export interface SimulationPoint {
  monthIndex: number;
  year: number;
  principal: number;
  total: number;
  profit: number;
}

export interface AppData {
  version: 1;
  settings: Settings;
  snapshots: AssetSnapshot[];
  records: DailyRecord[];
  milestones: Milestone[];
  goals: Goal[];
  simulator: SimulatorInput;
}

export type PageKey =
  | 'dashboard'
  | 'calculator'
  | 'simulator'
  | 'roadmap'
  | 'goals'
  | 'budget'
  | 'stats'
  | 'settings';
