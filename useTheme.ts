/**
 * 페이지 헤더 — 제목/부제 + 동기화 상태 + 테마 전환.
 * 모바일: 제목 축소, 부제 숨김, 컨트롤을 오른쪽에 컴팩트하게 배치.
 */
import { Sun, Moon, Monitor } from 'lucide-react';
import { SyncStatusBadge } from '@/components/layout/SyncStatus';
import type { ThemeMode } from '@/types';
import { cn } from '@/utils/cn';

interface HeaderProps {
  title: string;
  subtitle: string;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'system'];
const THEME_ICON = { light: Sun, dark: Moon, system: Monitor } as const;
const THEME_LABEL = { light: '라이트', dark: '다크', system: '시스템' } as const;

export function Header({ title, subtitle, theme, onThemeChange }: HeaderProps) {
  const ThemeIcon = THEME_ICON[theme];
  const nextTheme = () => {
    const idx = THEME_CYCLE.indexOf(theme);
    onThemeChange(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]);
  };

  return (
    <div className="flex items-start justify-between gap-3 mb-6 lg:mb-8">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-ink truncate">{title}</h1>
        <p className="hidden sm:block text-ink-faint mt-1">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0 pt-0.5">
        <SyncStatusBadge />
        <button
          onClick={nextTheme}
          aria-label={`테마 변경 (현재: ${THEME_LABEL[theme]})`}
          title={`테마: ${THEME_LABEL[theme]} (탭하여 변경)`}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium',
            'bg-line/[0.06] text-ink-soft hover:bg-line/[0.1] transition-colors',
          )}
        >
          <ThemeIcon size={13} />
          <span className="hidden sm:inline">{THEME_LABEL[theme]}</span>
        </button>
      </div>
    </div>
  );
}
