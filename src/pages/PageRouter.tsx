/**
 * 페이지 라우터 — React.lazy로 각 페이지를 코드 스플리팅.
 * 초기 번들에는 대시보드만 포함되고, 나머지는 진입 시 로드된다(6단계 최적화).
 */
import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import type { PageKey } from '@/types';
import type { User } from '@supabase/supabase-js';

// 대시보드는 첫 화면이라 직접 import (LCP 최적화), 나머지는 lazy
import { DashboardPage } from '@/pages/DashboardPage';
const CalculatorPage = lazy(() =>
  import('@/pages/CalculatorPage').then((m) => ({ default: m.CalculatorPage })),
);
const SimulatorPage = lazy(() =>
  import('@/pages/SimulatorPage').then((m) => ({ default: m.SimulatorPage })),
);
const RoadmapPage = lazy(() =>
  import('@/pages/RoadmapPage').then((m) => ({ default: m.RoadmapPage })),
);
const GoalsPage = lazy(() => import('@/pages/GoalsPage').then((m) => ({ default: m.GoalsPage })));
const BudgetPage = lazy(() =>
  import('@/pages/BudgetPage').then((m) => ({ default: m.BudgetPage })),
);
const StatsPage = lazy(() => import('@/pages/StatsPage').then((m) => ({ default: m.StatsPage })));
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

/** 페이지 제목/부제 (헤더에 표시). 라우터와 강결합된 메타데이터라 같은 파일에 둔다. */
// eslint-disable-next-line react-refresh/only-export-components
export const PAGE_META: Record<PageKey, { title: string; subtitle: string }> = {
  dashboard: { title: '대시보드', subtitle: '한눈에 보는 나의 경제적 자유 현황' },
  calculator: { title: 'FIRE 계산기', subtitle: '4% 룰로 필요한 자금과 달성 시점을 계산해요' },
  simulator: { title: '투자 시뮬레이터', subtitle: '복리의 힘으로 미래 자산을 예측해요' },
  roadmap: { title: '인생 로드맵', subtitle: '연도별 목표를 세우고 하나씩 달성해요' },
  goals: { title: '목표 관리', subtitle: '단기·중기·장기 목표를 나눠 관리해요' },
  budget: { title: '수입 / 지출', subtitle: '매달 현금 흐름을 기록하고 저축률을 확인해요' },
  stats: { title: '통계', subtitle: '나의 재정 습관을 데이터로 돌아봐요' },
  settings: { title: '설정', subtitle: '프로필과 데이터를 관리해요' },
};

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-line/20 border-t-accent rounded-full animate-spin" />
    </div>
  );
}

export function PageRouter({ page, user }: { page: PageKey; user: User | null }) {
  const render = () => {
    switch (page) {
      case 'dashboard':
        return <DashboardPage />;
      case 'calculator':
        return <CalculatorPage />;
      case 'simulator':
        return <SimulatorPage />;
      case 'roadmap':
        return <RoadmapPage />;
      case 'goals':
        return <GoalsPage />;
      case 'budget':
        return <BudgetPage />;
      case 'stats':
        return <StatsPage />;
      case 'settings':
        return <SettingsPage user={user} />;
    }
  };

  return (
    // key={page}: 페이지 이동 시 ErrorBoundary가 리마운트되어 에러 상태가 자동 초기화됨.
    // 한 페이지에서 에러가 나도 사이드바/헤더는 유지되고 해당 페이지만 폴백된다.
    <ErrorBoundary key={page}>
      <Suspense fallback={<PageFallback />}>
        {/* 페이지 전환 애니메이션 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {render()}
        </motion.div>
      </Suspense>
    </ErrorBoundary>
  );
}
