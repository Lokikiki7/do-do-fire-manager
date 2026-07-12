/**
 * 페이지 상단 헤더.
 * 좌: 페이지 제목/설명, 우: 테마 순환 토글 + 우측 액션 슬롯.
 */
import { Sun, Moon, MonitorSmartphone } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ThemeMode } from '@/types';
import { cn } from '@/components/ui';

interface HeaderProps {
  title: string;
  subtitle?: string;
  theme: ThemeMode;
  onThemeChange: (t: ThemeMode) => void;
  /** 우측 커스텀 액션 (예: 저장 버튼) */
  action?: ReactNode;
}

// 테마 순환: light → dark → system → light …
const NEXT: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' };
const ICON: Record<ThemeMode, typeof Sun> = { light: Sun, dark: Moon, system: MonitorSmartphone };

export function Header({ title, subtitle, theme, onThemeChange, action }: HeaderProps) {
  const Icon = ICON[theme];
  return (
    <header className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-ink-soft mt-1 text-sm sm:text-base">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {action}
        <button
          onClick={() => onThemeChange(NEXT[theme])}
          aria-label="테마 전환"
          className={cn(
            'w-10 h-10 rounded-full grid place-items-center',
            'bg-line/[0.06] text-ink-soft hover:text-ink hover:bg-line/[0.1] transition-colors',
          )}
        >
          <Icon size={19} />
        </button>
      </div>
    </header>
  );
}
