/**
 * 앱 루트 — Provider로 데이터 컨텍스트를 감싸고,
 * 사이드바 + 헤더 + 페이지 라우터 + 모바일 탭을 조립한다.
 */
import { AppDataProvider, useAppData } from '@/hooks/useAppData';
import { useTheme } from '@/hooks/useTheme';
import { useHashRoute } from '@/hooks/useHashRoute';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { Sidebar, MobileNav } from '@/components/layout/Nav';
import { Header } from '@/components/layout/Header';
import { PageRouter, PAGE_META } from '@/pages/PageRouter';

function Shell() {
  const { data, updateSettings } = useAppData();
  // URL 해시(#/dashboard)와 연동된 라우팅.
  // navigate는 기존 onNavigate 인터페이스와 시그니처가 동일해 하위 컴포넌트 수정 불필요.
  const [page, navigate] = useHashRoute();

  // 설정된 테마를 실제 DOM에 반영
  useTheme(data.settings.theme);

  const meta = PAGE_META[page];

  return (
    <div className="min-h-screen flex">
      <Sidebar current={page} onNavigate={navigate} />

      {/* 메인 영역 */}
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
  return (
    <AppDataProvider>
      <ConfirmProvider>
        <Shell />
      </ConfirmProvider>
    </AppDataProvider>
  );
}
