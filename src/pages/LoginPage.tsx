import { useState } from 'react';
import { signUp, signIn } from '@/lib/supabase';
import { Card, Button, Field, Input } from '@/components/ui';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: authError } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (authError) {
        setError(authError.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface to-surface-secondary p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-accent mb-2">🔥 FIRE Manager</h1>
          <p className="text-ink-faint">경제적 자유를 향한 첫 걸음</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="이메일">
            <Input
              type="email"
              placeholder="you@example.com"
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

          {error && (
            <div className="p-3 rounded-lg bg-negative/10 border border-negative/30 text-negative text-sm">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? '처리 중...' : isSignUp ? '회원가입' : '로그인'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-sm text-ink-faint hover:text-accent transition-colors"
          >
            {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-line/20">
          <p className="text-xs text-ink-faint text-center">
            💾 모든 데이터는 클라우드에 안전하게 저장되며,<br />
            모든 기기에서 동기화됩니다.
          </p>
        </div>
      </Card>
    </div>
  );
}
