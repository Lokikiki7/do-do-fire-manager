import { useEffect, useState } from 'react';
import { AppDataProvider, useAppData } from '@/hooks/useAppData';
import { useTheme } from '@/hooks/useTheme';
import { useHashRoute } from '@/hooks/useHashRoute';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { Sidebar, MobileNav } from '@/components/layout/Nav';
import { Header } from '@/components/layout/Header';
import { PageRouter, PAGE_META } from '@/pages/PageRouter';
import { LoginPage } from '@/pages/LoginPage';
import { onAuthStateChange, supabase } from '@/lib/supabase';
import { saveUserData } from '@/lib/supabase-sync';

function Shell() {
  const { data, updateSettings } = useAppData();
  const [page, navigate] = useHashRoute();
  useTheme(data.settings.theme);
  const meta = PAGE_META[page];

  // 데이터 변경 시 Supabase 동기화
  useEffect(() => {
    const timer = setTimeout(async () => {
      const user = await supabase.auth.getUser();
      if (user.data.user) {
        await saveUserData(user.data.user.id, data);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [data]);

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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const subscription = onAuthStateChange(async (user) => {
      setIsAuthenticated(!!user);
      setUserId(user?.id || null);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="text-3xl font-bold text-accent mb-4">🔥 FIRE Manager</div>
          <div className="text-ink-faint">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AppDataProvider userId={userId}>
      <ConfirmProvider>
        <Shell />
      </ConfirmProvider>
    </AppDataProvider>
  );
}
