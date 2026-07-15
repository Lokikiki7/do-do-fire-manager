/**
 * 네비게이션 — 데스크톱 사이드바 + 모바일 하단 탭바.
 * 같은 NAV_ITEMS를 공유하되 화면 크기에 따라 다른 형태로 렌더한다.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  MoreHorizontal,
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
// 모바일 하단 탭: 자주 쓰는 4개만 노출 (탭이 8개면 터치 타깃이 44px 미만으로 줄어듦)
const MOBILE_PRIMARY: PageKey[] = ['dashboard', 'budget', 'simulator', 'roadmap'];
// 나머지는 "더보기" 시트에서 접근 — 이전에는 링크가 없어 모바일에서 진입 자체가 불가능했다
const MOBILE_MORE: PageKey[] = ['calculator', 'goals', 'stats', 'settings'];

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
// 모바일 하단 탭바 + 더보기 시트
// ─────────────────────────────────────────────
export function MobileNav({ current, onNavigate }: NavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MOBILE_MORE.includes(current);

  // 시트가 열려 있는 동안 배경 스크롤 잠금
  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  // 페이지가 바뀌면 시트를 닫는다
  useEffect(() => setMoreOpen(false), [current]);

  const go = (key: PageKey) => {
    setMoreOpen(false);
    onNavigate(key);
  };

  return (
    <>
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/30 dark:bg-black/50"
            />
            <motion.div
              role="dialog"
              aria-label="더보기 메뉴"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface rounded-t-2xl shadow-lg pb-[calc(env(safe-area-inset-bottom)+5.5rem)]"
            >
              {/* 드래그 핸들 (iOS 시트 관용구) */}
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="w-9 h-1 rounded-full bg-line/20" />
              </div>
              <p className="px-5 pb-3 text-sm font-semibold text-ink-soft">더보기</p>
              <div className="grid grid-cols-4 gap-1 px-3 pb-3">
                {MOBILE_MORE.map((key) => {
                  const Icon = ICONS[key];
                  const active = current === key;
                  return (
                    <button
                      key={key}
                      onClick={() => go(key)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors touch-manipulation active:scale-[0.96]',
                        active ? 'bg-accent/10 text-accent' : 'text-ink-soft hover:bg-line/[0.04]',
                      )}
                    >
                      <Icon size={22} />
                      <span className="text-[11px] font-medium">{LABELS[key]}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/80 backdrop-blur-xl border-t border-line/[0.08] pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around">
          {MOBILE_PRIMARY.map((key) => {
            const Icon = ICONS[key];
            const active = current === key && !moreOpen;
            return (
              <button
                key={key}
                onClick={() => go(key)}
                aria-current={current === key ? 'page' : undefined}
                aria-label={LABELS[key]}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 px-1 flex-1 min-h-[52px] transition-colors touch-manipulation',
                  active ? 'text-accent' : 'text-ink-faint',
                )}
              >
                <Icon size={22} />
                <span className="text-[10px] font-medium">{LABELS[key]}</span>
              </button>
            );
          })}

          <button
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            aria-label="더보기"
            className={cn(
              'flex flex-col items-center gap-1 py-2 px-1 flex-1 min-h-[52px] transition-colors touch-manipulation',
              moreOpen || moreActive ? 'text-accent' : 'text-ink-faint',
            )}
          >
            <MoreHorizontal size={22} />
            <span className="text-[10px] font-medium">더보기</span>
          </button>
        </div>
      </nav>
    </>
  );
}

export { ICONS, LABELS };
