import { useEffect, useState } from 'react';
import { AppDataProvider } from '@/hooks/useAppData';
import { ThemeProvider } from '@/hooks/useTheme';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { Shell } from '@/components/layout/Shell';
import { PageRouter } from '@/pages/PageRouter';
import { onAuthStateChange } from '@/lib/supabase';
import type { PageKey } from '@/types';

export default function App() {
  const [page, setPage] = useState<PageKey>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: subscription } = onAuthStateChange((user) => {
      setIsAuthenticated(!!user);
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
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

  return (
    <ThemeProvider>
      <AppDataProvider>
        <ConfirmProvider>
          {isAuthenticated ? (
            <Shell page={page} setPage={setPage}>
              <PageRouter page={page} isAuthenticated={isAuthenticated} />
            </Shell>
          ) : (
            <PageRouter page={page} isAuthenticated={isAuthenticated} />
          )}
        </ConfirmProvider>
      </AppDataProvider>
    </ThemeProvider>
  );
}
