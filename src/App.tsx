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

const SUPABASE_ENABLED = !!import.meta.env.VITE_SUPABASE_URL;

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

  // Supabase 동기화: 로그인 시 클라우드에서 다운로드
  useEffect(() => {
    if (!SUPABASE_ENABLED || !user || loading) return;

    const syncDownload = async () => {
      try {
        const { data: records, error } = await supabase
          .from('user_data')
          .select('data')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.log('초기 동기화: 새 사용자');
          return;
        }
        
        if (records?.data) {
          const remoteData = JSON.parse(records.data);
          console.log('동기화 완료: 클라우드에서 데이터 다운로드');
          replaceAll(remoteData);
        }
      } catch (err) {
        console.error('동기화 다운로드 오류:', err);
      }
    };

    syncDownload();
  }, [user, loading, replaceAll]);

  // Supabase 동기화: 데이터 변경 시 클라우드에 업로드
  useEffect(() => {
    if (!SUPABASE_ENABLED || !user) return;

    const timer = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('user_data')
          .upsert({
            user_id: user.id,
            data: JSON.stringify(data),
            updated_at: new Date().toISOString(),
          });

        if (error) {
          console.error('동기화 업로드 오류:', error);
        } else {
          console.log('동기화 완료: 클라우드에 데이터 업로드');
        }
      } catch (err) {
        console.error('동기화 업로드 실패:', err);
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

  // Supabase 미설정: 바로 앱 표시
  if (!SUPABASE_ENABLED) {
    return <Shell />;
  }

  // Supabase 설정: 로그인 필요
  if (!user) {
    return <LoginPage user={null} onLogout={() => {}} />;
  }

  // 로그인됨: 로그아웃 버튼을 HeaderNav에 표시
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
