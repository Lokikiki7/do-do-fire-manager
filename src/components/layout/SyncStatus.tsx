/**
 * 동기화 상태 배지 — Header에 표시.
 * ☁ 동기화 중 / ✅ 동기화 완료 / ⚠ 오프라인 / 오류 시 재동기화 버튼.
 * 클릭하면 마지막 동기화 시각과 상세 메시지를 툴팁처럼 펼친다.
 */
import { useState } from 'react';
import { Cloud, CloudOff, Check, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { useSync, type SyncStatus as Status } from '@/lib/sync';
import { cn } from '@/utils/cn';

function formatTime(iso: string | null): string {
  if (!iso) return '없음';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const CONFIG: Record<Exclude<Status, 'disabled'>, { icon: typeof Cloud; label: string; cls: string }> = {
  syncing: { icon: Loader2, label: '동기화 중', cls: 'text-accent bg-accent/10' },
  synced: { icon: Check, label: '동기화 완료', cls: 'text-positive bg-positive/10' },
  offline: { icon: CloudOff, label: '오프라인', cls: 'text-gold bg-gold/10' },
  error: { icon: AlertTriangle, label: '동기화 오류', cls: 'text-negative bg-negative/10' },
};

export function SyncStatusBadge() {
  const { status, lastSyncedAt, errorMessage, syncNow } = useSync();
  const [open, setOpen] = useState(false);

  if (status === 'disabled') return null;
  const { icon: Icon, label, cls } = CONFIG[status];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`동기화 상태: ${label}`}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors',
          cls,
        )}
      >
        <Icon size={13} className={status === 'syncing' ? 'animate-spin' : ''} />
        {/* 모바일에서는 아이콘만, sm 이상에서 라벨 표시 */}
        <span className="hidden sm:inline">{label}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 p-3 rounded-xl bg-surface shadow-lg border border-line/10 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <Cloud size={14} className="text-accent" /> 클라우드 동기화
            </div>
            <div className="flex justify-between text-ink-soft">
              <span>상태</span>
              <span className="font-medium text-ink">{label}</span>
            </div>
            <div className="flex justify-between text-ink-soft">
              <span>마지막 동기화</span>
              <span className="font-medium text-ink tabular">{formatTime(lastSyncedAt)}</span>
            </div>
            {errorMessage && (
              <p className="text-negative leading-relaxed">{errorMessage}</p>
            )}
            <button
              onClick={() => void syncNow()}
              className="w-full flex items-center justify-center gap-1.5 mt-1 py-2 rounded-lg bg-accent/10 text-accent font-medium hover:bg-accent/20 transition-colors"
            >
              <RefreshCw size={13} /> 지금 재동기화
            </button>
          </div>
        </>
      )}
    </div>
  );
}
