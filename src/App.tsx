/**
 * 앱 루트 — Supabase 인증 + 데이터 동기화
 * 로그인되지 않으면 LoginPage, 로그인되면 Shell 표시
 */
import { useEffect } from 'react';
import { AppDataProvider, useAppData } from '@/hooks/useAppData';
import { useTheme } from '@/hooks/useTheme';
import { useHashRoute } from '@/hooks/useHashRoute';
import { useAuth } from '@/hooks/useAuth';
import { LoginPage } from '@/pages/LoginPage';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { Sidebar, MobileNav } from '@/components/layout/Nav';
import { Header } from '@/components/layout/Header';
import { PageRouter, PAGE_META } from '@/pages/PageRouter';
import { supabase } from '@/lib/supabase';

function Shell() {
  const { data, updateSettings } = useAppData();
  const [page, navigate] = useHashRoute();
  useTheme(data.settings.theme);
  const meta = PAGE_META[page];

  return (
    <div className="min-h-screen flex">
      <Sidebar current={page} onNavigate={navigate} />
      <div className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-24 lg:pb-8">
          <Header
            title={meta.title}
            subtitle={meta.subtitle}
            theme={data.settings.theme}
            onThemeChange={(t) => updateSettings({ theme: t })}
          />
          <PageRouter page={page} />
        </div>
      </div>
      <MobileNav current={page} onNavigate={navigate} />
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const { data, replaceAll } = useAppData();

  // 기기 동기화: 로그인 시 Supabase에서 데이터 로드
  useEffect(() => {
    if (!user || loading) return;

    const syncData = async () => {
      try {
        const { data: records, error } = await supabase
          .from('user_data')
          .select('data')
          .eq('user_id', user.id)
          .single();

        if (error) return;
        if (records?.data) {
          const remoteData = JSON.parse(records.data);
          replaceAll(remoteData);
        }
      } catch (err) {
        console.error('동기화 오류:', err);
      }
    };

    syncData();
  }, [user, loading, replaceAll]);

  // 기기 동기화: 데이터 변경 시 Supabase에 업로드
  useEffect(() => {
    if (!user) return;

    const timer = setTimeout(async () => {
      try {
        await supabase
          .from('user_data')
          .upsert({
            user_id: user.id,
            data: JSON.stringify(data),
            updated_at: new Date().toISOString(),
          });
      } catch (err) {
        console.error('업로드 오류:', err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [user, data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-faint">로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage user={null} onLogout={() => {}} />;
  }

  return <Shell />;
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
