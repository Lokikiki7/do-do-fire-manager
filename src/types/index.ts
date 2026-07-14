/**
 * 도메인 타입 정의
 * 앱의 모든 데이터는 AppData 하나로 수렴한다.
 * → LocalStorage 저장/JSON 백업이 직렬화 한 번으로 끝난다.
 */

/** 지원 통화 */
export type Currency = 'KRW' | 'USD';

/** 테마 모드 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** 목표 기간 분류 */
export type GoalTerm = 'short' | 'mid' | 'long';

// ─────────────────────────────────────────────
// 설정
// ─────────────────────────────────────────────
export interface Settings {
  /** 사용자 이름 (대시보드 인사말에 사용) */
  name: string;
  /** FIRE 목표 금액 (원) */
  fireTarget: number;
  /** 연간 지출 (4% 룰 계산용) */
  annualExpense: number;
  /** 기본 월 수익률 (%, 예: 7) */
  defaultReturnRate: number;
  currency: Currency;
  theme: ThemeMode;
  /** 안전 인출률 (%, 기본 4) */
  withdrawalRate: number;
  /** 예상 연 물가상승률 (%, 기본 2.5) — 실질 수익률 계산에 사용 */
  inflationRate: number;
  /** 초기 자산 (기존 자산) */
  initialAsset: number;
  /** 초기 부채 (기존 부채) */
  initialLiability: number;
}

// ─────────────────────────────────────────────
// 자산 스냅샷 — 대시보드 / 자산 성장 그래프의 원천
// ─────────────────────────────────────────────
export interface AssetSnapshot {
  id: string;
  /** ISO 날짜 (YYYY-MM-DD) */
  date: string;
  /** 총 자산 */
  totalAssets: number;
  /** 부채 */
  liabilities: number;
  /** 메모 (선택) */
  memo?: string;
}

// ─────────────────────────────────────────────
// 월별 수입/지출 기록
// ─────────────────────────────────────────────
export interface MonthlyRecord {
  id: string;
  /** YYYY-MM */
  month: string;
  income: number; // 수입
  fixedExpense: number; // 고정지출
  variableExpense: number; // 변동지출
  debt: number; // 부채 상환 (선택)
  investment: number; // 투자금
  saving: number; // 저축
}

// ─────────────────────────────────────────────
// 인생 로드맵 마일스톤
// ─────────────────────────────────────────────
export interface Milestone {
  id: string;
  /** 목표 연도 */
  year: number;
  title: string; // 예: "1억 달성", "유럽여행"
  targetAmount?: number;
  done: boolean;
  /** 완료한 날짜 (done=true일 때) */
  doneAt?: string;
}


// ─────────────────────────────────────────────
// 자산 구간별 목표 수익률 (새로운 코어 엔진)
// ─────────────────────────────────────────────
export interface ReturnRateTier {
  id: string;
  minAsset: number;
  maxAsset?: number;
  monthlyReturnRate: number;
  label?: string;
}

// ─────────────────────────────────────────────
// 목표 관리 (단기/중기/장기)
// ─────────────────────────────────────────────
export interface Goal {
  id: string;
  term: GoalTerm;
  title: string;
  done: boolean;
  createdAt: string;
  doneAt?: string;
}

// ─────────────────────────────────────────────
// 투자 시뮬레이터 입력값 (마지막 설정을 저장해 둠)
// ─────────────────────────────────────────────
export interface SimulatorInput {
  initialAmount: number; // 초기 투자금
  monthlyInvestment: number; // 월 투자금
  monthlyReturnRate: number; // 연 수익률 (%)
  salaryGrowthRate: number; // 연봉 인상률 (%) → 투자금 증가에 반영
  investmentGrowthRate: number; // 연간 투자금 증가율 (%)
  years: number; // 시뮬레이션 기간 (년)
  useVariableReturnRate?: boolean;
  returnRateTiers?: ReturnRateTier[];
}

/** 시뮬레이션 월별 결과 한 행 */
export interface SimulationPoint {
  monthIndex: number; // 0부터 시작
  year: number; // 실제 연도
  /** 해당 월까지 납입한 원금 누계 */
  principal: number;
  /** 복리 반영 총 자산 */
  total: number;
  /** 수익 (total - principal) */
  profit: number;
}

// ─────────────────────────────────────────────
// 앱 전체 데이터 (LocalStorage에 이 형태 그대로 저장)
// ─────────────────────────────────────────────
export interface AppData {
  /** 백업 파일 호환성 검증용 스키마 버전 */
  version: 1;
  settings: Settings;
  snapshots: AssetSnapshot[];
  records: MonthlyRecord[];
  milestones: Milestone[];
  goals: Goal[];
  simulator: SimulatorInput;
}

/** 페이지 라우트 키 */
export type PageKey =
  'dashboard' | 'calculator' | 'simulator' | 'roadmap' | 'goals' | 'budget' | 'stats' | 'settings';
