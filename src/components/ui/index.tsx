/**
 * 공용 UI 프리미티브 모음.
 * 페이지 전역에서 재사용해 스타일 일관성과 코드 중복 제거를 담당한다.
 * 전부 시맨틱 색상 토큰(surface/ink/accent…)만 사용 → 다크모드 자동 대응.
 */
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type {
  ReactNode,
  InputHTMLAttributes,
  ButtonHTMLAttributes,
  SelectHTMLAttributes,
} from 'react';
import { cn } from '@/utils/cn';

// cn은 순수 함수라 별도 유틸로 분리했다. 기존 import 경로(@/components/ui)를
// 유지하기 위해 여기서 그대로 재수출한다 → 사용처 코드 변경 불필요.
// (barrel 파일의 의도적 re-export이므로 fast-refresh 규칙 예외)
// eslint-disable-next-line react-refresh/only-export-components
export { cn };

// ─────────────────────────────────────────────
// Card — 대시보드 카드 기본 컨테이너
// ─────────────────────────────────────────────
interface CardProps {
  children: ReactNode;
  className?: string;
  /** 등장 애니메이션 지연(초) — 스태거 연출용 */
  delay?: number;
}
export function Card({ children, className, delay = 0 }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        'bg-surface rounded-card p-5 shadow-card dark:shadow-card-dark',
        'border border-line/[0.04] dark:border-line/[0.06]',
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// SectionTitle — 카드 내부 소제목
// ─────────────────────────────────────────────
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-ink-soft tracking-wide">{children}</h3>
      {right}
    </div>
  );
}

// ─────────────────────────────────────────────
// Button — primary / ghost / danger
// ─────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}
export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-1.5 font-medium rounded-full transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50';
  const sizes = { sm: 'text-sm px-3 py-1.5', md: 'text-sm px-4 py-2.5' };
  const variants = {
    primary: 'bg-accent text-white hover:brightness-110',
    ghost: 'bg-line/[0.06] text-ink hover:bg-line/[0.1]',
    danger: 'bg-negative/10 text-negative hover:bg-negative/20',
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...rest}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────
// Field — 라벨 + 입력 래퍼
// ─────────────────────────────────────────────
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink-soft">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="text-xs text-ink-faint mt-1 block">{hint}</span>}
    </label>
  );
}

const inputBase =
  'w-full bg-canvas dark:bg-elevated rounded-xl px-3.5 py-2.5 text-ink tabular ' +
  'border border-line/[0.08] focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputBase, 'appearance-none cursor-pointer', className)} {...rest}>
      {children}
    </select>
  );
}

// ─────────────────────────────────────────────
// SegmentedControl — iOS 스타일 세그먼트 탭
// ─────────────────────────────────────────────
interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className="inline-flex bg-line/[0.06] rounded-full p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors',
            value === o.value ? 'text-ink' : 'text-ink-faint hover:text-ink-soft',
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId="segment-active"
              className="absolute inset-0 bg-surface rounded-full shadow-sm"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative z-10">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// EmptyState — 데이터 없을 때 안내
// ─────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-ink-faint mb-3">{icon}</div>
      <p className="font-medium text-ink">{title}</p>
      <p className="text-sm text-ink-faint mt-1 max-w-xs">{desc}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Checkbox — 체크 완료 토글 (원형, iOS 느낌)
// ─────────────────────────────────────────────
export function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      aria-checked={checked}
      role="checkbox"
      className={cn(
        'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
        checked ? 'bg-positive border-positive' : 'border-line/25 hover:border-accent',
      )}
    >
      {checked && (
        <motion.svg
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2.5 6L5 8.5L9.5 3.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────
// Modal — 모달 다이얼로그
// ─────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onOpenChange, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 배경 오버레이 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-black/30 dark:bg-black/50"
      />

      {/* 모달 컨테이너 */}
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full sm:w-auto sm:min-w-[26rem] sm:max-w-md bg-surface rounded-t-2xl sm:rounded-2xl shadow-lg max-h-[90dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)]"
      >
        {/* 헤더 */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-line/10 bg-surface/95 backdrop-blur">
          <h2 className="font-semibold text-ink">{title}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-line/10 rounded-lg transition-colors"
            aria-label="닫기"
          >
            <X size={20} className="text-ink-faint" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-4">
          {children}
        </div>
      </motion.div>
    </div>
  );
}