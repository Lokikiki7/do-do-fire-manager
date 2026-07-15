/**
 * 설정 > Cloud Sync 카드.
 * 로그인 계정, 온라인 여부, 동기화 상태/마지막 시각, 수동 동기화, 로그아웃.
 */
import { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, LogOut, Wifi, WifiOff, Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useSync } from '@/lib/sync';
import { Card, SectionTitle, Button } from '@/components/ui';
import { cn } from '@/utils/cn';

function formatTime(iso: string | null): string {
  if (!iso) return '아직 동기화되지 않음';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  syncing: { label: '☁ 동기화 중...', cls: 'text-accent' },
  synced: { label: '✅ 동기화 완료', cls: 'text-positive' },
  offline: { label: '⚠ 오프라인', cls: 'text-gold' },
  error: { label: '⚠ 동기화 오류', cls: 'text-negative' },
  disabled: { label: '로컬 전용', cls: 'text-ink-faint' },
};

export function CloudSyncCard({ user }: { user: User | null }) {
  const { status, lastSyncedAt, errorMessage, online, syncNow } = useSync();
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <Card>
        <SectionTitle>클라우드 동기화</SectionTitle>
        <p className="text-sm text-ink-soft">
          Supabase 환경변수(VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)가 설정되지 않아
          데이터가 이 브라우저에만 저장됩니다.
        </p>
      </Card>
    );
  }

  const st = STATUS_LABEL[status] ?? STATUS_LABEL.disabled;

  const handleSync = async () => {
    setBusy(true);
    await syncNow();
    setBusy(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Card>
      <SectionTitle
        right={
          online ? (
            <span className="flex items-center gap-1 text-xs text-positive"><Wifi size={13} /> 온라인</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gold"><WifiOff size={13} /> 오프라인</span>
          )
        }
      >
        클라우드 동기화
      </SectionTitle>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-accent text-white grid place-items-center font-bold text-lg shrink-0">
          {user?.email?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-ink truncate">{user?.email ?? '로그인 정보 없음'}</p>
          <p className="text-xs text-ink-faint">Supabase 계정으로 모든 기기에 자동 동기화됩니다</p>
        </div>
      </div>

      <div className="rounded-xl bg-canvas dark:bg-elevated border border-line/[0.06] divide-y divide-line/[0.06] text-sm mb-4">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-ink-soft flex items-center gap-2">
            {status === 'offline' ? <CloudOff size={15} /> : <Cloud size={15} />} 동기화 상태
          </span>
          <span className={cn('font-medium flex items-center gap-1.5', st.cls)}>
            {status === 'syncing' && <Loader2 size={13} className="animate-spin" />}
            {st.label}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-ink-soft">마지막 동기화</span>
          <span className="font-medium text-ink tabular">{formatTime(lastSyncedAt)}</span>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-negative/10 text-negative text-sm leading-relaxed">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => void handleSync()} disabled={busy || status === 'syncing'}>
          <RefreshCw size={16} className={busy || status === 'syncing' ? 'animate-spin' : ''} />
          지금 동기화
        </Button>
        <Button variant="danger" onClick={() => void handleLogout()}>
          <LogOut size={16} /> 로그아웃
        </Button>
      </div>
    </Card>
  );
}
