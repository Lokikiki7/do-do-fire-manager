/**
 * 앱 루트 — Supabase 인증 + 클라우드 동기화
 * 동기화 로직은 SyncProvider(@/lib/sync)로 분리:
 *  - 하이드레이션 완료 전 업로드 금지(레이스로 인한 클라우드 덮어쓰기 방지)
 *  - 상태/오류를 UI(SyncStatusBadge, CloudSyncCard)에 노출
 */
import type { User } from '@supabase/supabase-js';
import { AppDataProvider, useAppData } from '@/hooks/useAppData';
import { useTheme } from '@/hooks/useTheme';
import { useHashRoute } from '@/hooks/useHashRoute';
import { useAuth } from '@/hooks/useAuth';
import { LoginPage } from '@/pages/LoginPage';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { Sidebar, MobileNav } from '@/components/layout/Nav';
import { Header } from '@/components/layout/Header';
import { PageRouter, PAGE_META } from '@/pages/PageRouter';
import { SyncProvider } from '@/lib/sync';
import { isSupabaseConfigured } from '@/lib/supabase';

function Shell({ user }: { user: User | null }) {
  const { data, updateSettings } = useAppData();
  const [page, navigate] = useHashRoute();
  useTheme(data.settings.theme);
  const meta = PAGE_META[page];

  return (
    <div className="min-h-screen flex">
      <Sidebar current={page} onNavigate={navigate} />
      <div className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-8 pb-24 lg:pb-8">
          <Header
            title={meta.title}
            subtitle={meta.subtitle}
            theme={data.settings.theme}
            onThemeChange={(t) => updateSettings({ theme: t })}
          />
          <PageRouter page={page} user={user} />
        </div>
      </div>
      <MobileNav current={page} onNavigate={navigate} />
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-faint animate-pulse">불러오는 중...</p>
      </div>
    );
  }

  // Supabase 미설정 → 로컬 전용 모드로 바로 진입
  if (!isSupabaseConfigured) {
    return (
      <SyncProvider user={null}>
        <Shell user={null} />
      </SyncProvider>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <SyncProvider user={user}>
      <Shell user={user} />
    </SyncProvider>
  );
}

export default function App() {
  return (
    <AppDataProvider>
      <ConfirmProvider>
        <AppContent />
      </ConfirmProvider>
    </AppDataProvider>
  );
}
