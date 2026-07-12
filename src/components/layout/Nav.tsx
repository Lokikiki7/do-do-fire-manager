/**
 * 네비게이션 — 데스크톱 사이드바 + 모바일 하단 탭바.
 * 같은 NAV_ITEMS를 공유하되 화면 크기에 따라 다른 형태로 렌더한다.
 */
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Calculator,
  TrendingUp,
  Map,
  Target,
  Wallet,
  BarChart3,
  Settings as Cog,
  Flame,
} from 'lucide-react';
import type { PageKey } from '@/types';
import { cn } from '@/components/ui';

// 라우트 키 → 아이콘 매핑 (constants와 분리해 아이콘 의존성을 UI 레이어에 격리)
const ICONS: Record<PageKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  calculator: Calculator,
  simulator: TrendingUp,
  roadmap: Map,
  goals: Target,
  budget: Wallet,
  stats: BarChart3,
  settings: Cog,
};

const LABELS: Record<PageKey, string> = {
  dashboard: '대시보드',
  calculator: '계산기',
  simulator: '시뮬레이터',
  roadmap: '로드맵',
  goals: '목표',
  budget: '수입/지출',
  stats: '통계',
  settings: '설정',
};

// 데스크톱 사이드바에 노출할 전체 항목
const FULL_ORDER: PageKey[] = [
  'dashboard',
  'calculator',
  'simulator',
  'roadmap',
  'goals',
  'budget',
  'stats',
  'settings',
];
// 모바일 하단 탭은 5개만 (나머지는 설정에서 접근)
const MOBILE_ORDER: PageKey[] = ['dashboard', 'simulator', 'roadmap', 'budget', 'settings'];

interface NavProps {
  current: PageKey;
  onNavigate: (p: PageKey) => void;
}

// ─────────────────────────────────────────────
// 데스크톱 사이드바
// ─────────────────────────────────────────────
export function Sidebar({ current, onNavigate }: NavProps) {
  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 px-4 py-6 border-r border-line/[0.06]">
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold to-negative grid place-items-center">
          <Flame size={20} className="text-white" fill="white" />
        </div>
        <div>
          <p className="font-bold leading-tight">FIRE Manager</p>
          <p className="text-xs text-ink-faint">경제적 자유</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {FULL_ORDER.map((key) => {
          const Icon = ICONS[key];
          const active = current === key;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active ? 'text-accent' : 'text-ink-soft hover:text-ink hover:bg-line/[0.04]',
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-accent/10 rounded-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon size={19} className="relative z-10" />
              <span className="relative z-10">{LABELS[key]}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

// ─────────────────────────────────────────────
// 모바일 하단 탭바
// ─────────────────────────────────────────────
export function MobileNav({ current, onNavigate }: NavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/80 backdrop-blur-xl border-t border-line/[0.08] pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around">
        {MOBILE_ORDER.map((key) => {
          const Icon = ICONS[key];
          const active = current === key;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              aria-current={active ? 'page' : undefined}
              aria-label={LABELS[key]}
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-3 flex-1 transition-colors',
                active ? 'text-accent' : 'text-ink-faint',
              )}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{LABELS[key]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export { ICONS, LABELS };
