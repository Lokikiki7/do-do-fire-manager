import type { AppData, PageKey } from '@/types';

/** LocalStorage 키 (버전 변경 시 마이그레이션 지점) */
export const STORAGE_KEY = 'fire-manager:v1';

/** 자동 백업 키 접두사 (일별 롤링 스냅샷: fire-manager:backup:YYYY-MM-DD) */
export const BACKUP_PREFIX = 'fire-manager:backup:';

/** 보관할 자동 백업 최대 개수 (초과 시 오래된 것부터 삭제) */
export const MAX_BACKUPS = 7;

/** 첫 실행 시 기본 데이터 */
export const DEFAULT_DATA: AppData = {
  version: 1,
  settings: {
    name: '',
    fireTarget: 1_000_000_000, // 10억
    annualExpense: 40_000_000, // 연 4천만원
    defaultReturnRate: 7,
    currency: 'KRW',
    theme: 'system',
    withdrawalRate: 4,
    inflationRate: 2.5,
  },
  snapshots: [],
  records: [],
  milestones: [
    { id: 'm1', year: 2026, title: '유럽여행', done: false },
    { id: 'm2', year: 2027, title: '자동차 구매', done: false },
    { id: 'm3', year: 2028, title: '연봉 5천 달성', done: false },
    { id: 'm4', year: 2029, title: '순자산 1억 달성', done: false },
    { id: 'm5', year: 2032, title: '순자산 2억 달성', done: false },
    { id: 'm6', year: 2037, title: '순자산 5억 달성', done: false },
    { id: 'm7', year: 2045, title: 'FIRE 달성 🔥', done: false },
  ],
  goals: [],
  simulator: {
    initialAmount: 10_000_000,
    monthlyInvestment: 1_000_000,
    monthlyReturnRate: 0.5,
    salaryGrowthRate: 3,
    investmentGrowthRate: 3,
    years: 20,
    // ─── 자산 구간별 수익률 시스템 (NEW)
    useVariableReturnRate: false,
    returnRateTiers: [],
  },
};

/** 사이드바 네비게이션 정의 (아이콘은 2단계에서 매핑) */
export const NAV_ITEMS: { key: PageKey; label: string }[] = [
  { key: 'dashboard', label: '대시보드' },
  { key: 'calculator', label: 'FIRE 계산기' },
  { key: 'simulator', label: '투자 시뮬레이터' },
  { key: 'roadmap', label: '인생 로드맵' },
  { key: 'goals', label: '목표 관리' },
  { key: 'budget', label: '수입 / 지출' },
  { key: 'stats', label: '통계' },
  { key: 'settings', label: '설정' },
];
