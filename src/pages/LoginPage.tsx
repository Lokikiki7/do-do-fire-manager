import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, Button, Field, Input } from '@/components/ui';

interface LoginPageProps {
  user: { id: string; email: string } | null;
  onLogout: () => void;
}

export function LoginPage({ user }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setLoading(false);
  };

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <Card className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center font-bold">
              {user.email[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-ink">{user.email}</p>
              <p className="text-xs text-ink-faint">로그인됨</p>
            </div>
          </div>
          <Button onClick={async () => await supabase.auth.signOut()} variant="danger" className="w-full">
            <LogOut size={16} /> 로그아웃
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-ink mb-2">FIRE Manager</h1>
          <p className="text-sm text-ink-faint">재정자유 추적 앱</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-negative/10 text-negative text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Field label="이메일">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="비밀번호">
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>

        <p className="text-xs text-ink-faint text-center mt-4">
          🔒 Supabase로 안전하게 보호됨
        </p>
      </Card>
    </div>
  );
}
