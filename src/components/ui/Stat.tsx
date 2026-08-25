/**
 * 지표 표시 전용 컴포넌트: StatCard(숫자 카드), ProgressRing(원형 진행률).
 * 대시보드/계산기/통계에서 공통 사용.
 */
import { motion } from 'framer-motion';
import { memo, type ReactNode } from 'react';
import { Card, cn } from '@/components/ui';

// ─────────────────────────────────────────────
// StatCard — 라벨 + 큰 숫자 + 증감 표시
// ─────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  /** 증감 텍스트 (예: "+1.2%") */
  delta?: string;
  /** 증감 방향 색상 */
  deltaType?: 'up' | 'down' | 'neutral';
  accent?: 'blue' | 'green' | 'gold' | 'red';
  delay?: number;
  /** 좁은 칸에 4개를 나란히 놓을 때 — 글자와 여백을 줄이고 아이콘은 넓은 화면에서만 */
  compact?: boolean;
}

const accentMap = {
  blue: 'text-accent bg-accent/10',
  green: 'text-positive bg-positive/10',
  gold: 'text-gold bg-gold/10',
  red: 'text-negative bg-negative/10',
};

export const StatCard = memo(function StatCard({
  label,
  value,
  icon,
  delta,
  deltaType = 'neutral',
  accent = 'blue',
  delay = 0,
  compact = false,
}: StatCardProps) {
  const deltaColor =
    deltaType === 'up'
      ? 'text-positive'
      : deltaType === 'down'
        ? 'text-negative'
        : 'text-ink-faint';
  return (
    <Card delay={delay} className={cn('flex flex-col', compact ? 'gap-2 p-3 sm:p-5' : 'gap-3')}>
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            'text-ink-soft font-medium leading-tight',
            compact ? 'text-[11px] sm:text-sm' : 'text-sm',
          )}
        >
          {label}
        </span>
        {icon && (
          <span
            className={cn(
              'w-8 h-8 rounded-full grid place-items-center shrink-0',
              accentMap[accent],
              // 좁은 화면에서는 아이콘이 숫자 자리를 뺏으므로 감춘다
              compact && 'hidden sm:grid',
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div>
        <p
          className={cn(
            'font-bold tabular tracking-tight',
            compact ? 'text-base sm:text-2xl' : 'text-2xl',
          )}
        >
          {value}
        </p>
        {delta && (
          <p
            className={cn(
              'font-medium mt-0.5 tabular leading-tight',
              compact ? 'text-[10px] sm:text-sm' : 'text-sm',
              deltaColor,
            )}
          >
            {delta}
          </p>
        )}
      </div>
    </Card>
  );
});

// ─────────────────────────────────────────────
// ProgressRing — 원형 진행률 (FIRE 달성률)
// ─────────────────────────────────────────────
interface RingProps {
  /** 0~100 */
  percent: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
  color?: string; // CSS 색상, 기본 gold
}
export function ProgressRing({
  percent,
  size = 160,
  stroke = 12,
  label,
  color = 'rgb(var(--gold))',
}: RingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--line) / 0.08)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{label}</div>
    </div>
  );
}
