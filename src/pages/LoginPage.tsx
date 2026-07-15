/**
 * 로그인 페이지 — 오류를 한국어로 친절하게 안내.
 */
import { useState } from 'react';
import { WifiOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, Button, Field, Input } from '@/components/ui';

/** Supabase Auth 오류 → 한국어 안내 */
function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return '이메일 또는 비밀번호가 올바르지 않아요.';
  if (/email not confirmed/i.test(message)) return '이메일 인증이 완료되지 않았어요. 받은 편지함에서 인증 메일을 확인해 주세요.';
  if (/rate limit|too many/i.test(message)) return '시도 횟수가 너무 많아요. 잠시 후 다시 시도해 주세요.';
  if (/failed to fetch|network/i.test(message)) return '서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.';
  return `로그인에 실패했어요. (${message})`;
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!navigator.onLine) {
      setError('오프라인 상태예요. 인터넷 연결 후 다시 시도해 주세요.');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(friendlyAuthError(err.message));
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-gold to-negative grid place-items-center text-2xl">
            🔥
          </div>
          <h1 className="text-2xl font-bold text-ink mb-1">FIRE Manager</h1>
          <p className="text-sm text-ink-faint">로그인하면 모든 기기에서 데이터가 동기화돼요</p>
        </div>

        {!navigator.onLine && (
          <div className="mb-4 p-3 rounded-xl bg-gold/10 text-gold text-sm flex items-center gap-2">
            <WifiOff size={15} /> 현재 오프라인 상태예요
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-negative/10 text-negative text-sm leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Field label="이메일">
            <Input
              type="email"
              autoComplete="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="비밀번호">
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          <Button type="submit" disabled={loading} className="w-full min-h-[44px]">
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        <p className="text-xs text-ink-faint text-center mt-4">🔒 Supabase Auth로 안전하게 보호됩니다</p>
      </Card>
    </div>
  );
}
