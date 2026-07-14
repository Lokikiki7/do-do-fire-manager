import { LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';
import type { ThemeMode } from '@/types';

interface HeaderProps {
  title: string;
  subtitle: string;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export function Header({ title, subtitle, theme, onThemeChange }: HeaderProps) {
  const handleThemeChange = (newTheme: ThemeMode) => {
    onThemeChange(newTheme);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-ink">{title}</h1>
        <p className="text-ink-faint mt-1">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <select
          value={theme}
          onChange={(e) => handleThemeChange(e.target.value as ThemeMode)}
          className="text-xs px-3 py-1.5 rounded-lg bg-surface border border-line/10 text-ink cursor-pointer"
        >
          <option value="light">☀️ Light</option>
          <option value="dark">🌙 Dark</option>
          <option value="system">🖥️ System</option>
        </select>
        <Button size="sm" variant="ghost" onClick={handleLogout} title="로그아웃">
          <LogOut size={16} />
        </Button>
      </div>
    </div>
  );
}
