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
    initialAsset: 0,
    initialLiability: 0,
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
  },
  // 자산이 커질수록 벌이도 투자도 늘어난다는 가정의 기본 구간.
  // 마지막 구간은 월급 없이 지출만 있는 FIRE 이후 상태다.
  simulatorTiers: [
    { id: 'tier-1', minAsset: 0, maxAsset: 100_000_000, salary: 3_000_000, investment: 1_000_000, expense: 500_000, monthlyReturnRate: 5 },
    { id: 'tier-2', minAsset: 100_000_000, maxAsset: 500_000_000, salary: 4_000_000, investment: 1_500_000, expense: 700_000, monthlyReturnRate: 7 },
    { id: 'tier-3', minAsset: 500_000_000, maxAsset: 1_000_000_000, salary: 4_500_000, investment: 2_000_000, expense: 800_000, monthlyReturnRate: 8 },
    { id: 'tier-4', minAsset: 1_000_000_000, salary: 0, investment: 0, expense: 2_000_000, monthlyReturnRate: 0 },
  ],
};

/**
 * 사이드바 네비게이션 정의 (아이콘은 Nav에서 매핑).
 * 이 배열이 유효한 라우트 목록도 겸하므로(useHashRoute), 여기서 빠진 키의
 * 해시(#/simulator 같은 옛 북마크)는 자동으로 대시보드로 넘어간다.
 */
export const NAV_ITEMS: { key: PageKey; label: string }[] = [
  { key: 'dashboard', label: '대시보드' },
  { key: 'budget', label: '수입 / 지출' },
  { key: 'stats', label: '통계' },
  { key: 'goals', label: '목표 관리' },
  { key: 'roadmap', label: '인생 로드맵' },
  { key: 'simulator', label: '시뮬레이터' },
  { key: 'settings', label: '설정' },
];
