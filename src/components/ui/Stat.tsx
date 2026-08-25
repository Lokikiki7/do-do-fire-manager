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
}: StatCardProps) {
  const deltaColor =
    deltaType === 'up'
      ? 'text-positive'
      : deltaType === 'down'
        ? 'text-negative'
        : 'text-ink-faint';
  return (
    <Card delay={delay} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-soft font-medium">{label}</span>
        {icon && (
          <span className={cn('w-8 h-8 rounded-full grid place-items-center', accentMap[accent])}>
            {icon}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold tabular tracking-tight">{value}</p>
        {delta && <p className={cn('text-sm font-medium mt-0.5 tabular', deltaColor)}>{delta}</p>}
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
