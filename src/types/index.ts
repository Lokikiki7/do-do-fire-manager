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
  /**
   * 통합 지출. 고정/변동을 구분하지 않는다 (구분할 근거가 기록에 없다).
   * 아래 fixedExpense/variableExpense는 구분해서 저장하던 시절의 기록을
   * 그대로 읽기 위해 남겨둔 것으로, 새 기록은 항상 여기에만 쌓인다.
   * 총지출을 구할 때는 반드시 totalExpenseOf()를 써서 셋을 합산할 것.
   */
  expense?: number;
  /** @deprecated 과거 기록 호환용 — 새 기록은 expense를 쓴다 */
  fixedExpense: number;
  /** @deprecated 과거 기록 호환용 — 새 기록은 expense를 쓴다 */
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

/**
 * 자산 구간별 시뮬레이터 설정.
 * 자산이 어느 구간에 있느냐에 따라 월급·투자액·지출·수익률이 달라진다.
 * maxAsset이 없으면 "그 금액 이상" 구간 (보통 마지막 FIRE 구간).
 */
export interface SimulatorTier {
  id: string;
  minAsset: number;
  maxAsset?: number;
  /** 월급 (FIRE 구간은 0) */
  salary: number;
  /** 월 투자액 */
  investment: number;
  /** 월 지출 */
  expense: number;
  /** 월 수익률(%) — 그 달 투자액에 적용된다 */
  monthlyReturnRate: number;
}

export interface AppData {
  version: 1;
  settings: Settings;
  snapshots: AssetSnapshot[];
  records: DailyRecord[];
  milestones: Milestone[];
  goals: Goal[];
  simulator: SimulatorInput;
  /** 구간별 시뮬레이터 설정 (사용자가 편집) */
  simulatorTiers: SimulatorTier[];
}

// 계산기는 제거되고 구간별 시뮬레이터로 대체됐다.
// AppData.simulator(예전 설정값)는 남겨둔다 — 예전 저장 데이터나
// 클라우드 동기화 왕복에서 값이 유실되면 안 된다.
export type PageKey =
  | 'dashboard'
  | 'budget'
  | 'stats'
  | 'goals'
  | 'roadmap'
  | 'simulator'
  | 'settings';
