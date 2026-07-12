/**
 * Error Boundary — 렌더링 중 발생한 예외를 격리한다.
 *
 * 왜 필요한가:
 * - 지금까지 LocalStorage 파싱은 방어했지만, 컴포넌트 렌더 단계 에러는 무방비였다.
 *   한 페이지에서 예외가 나면 React가 전체 트리를 언마운트해 앱이 흰 화면이 된다.
 * - Error Boundary는 하위 트리의 에러를 잡아 폴백 UI로 대체하므로,
 *   최소한 "다시 시도 / 초기 화면으로" 경로를 사용자에게 제공할 수 있다.
 *
 * React에서 에러 캐칭은 아직 클래스 컴포넌트만 지원한다(훅 대안 없음).
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** 폴백을 커스터마이즈하고 싶을 때 */
  fallback?: (reset: () => void, error: Error) => ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 프로덕션에서는 이 지점에 외부 로깅(Sentry 등)을 연결할 수 있다.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  /** 에러 상태를 비워 재렌더 시도 */
  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(this.reset, error);

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="bg-surface rounded-card shadow-card p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-negative/10 grid place-items-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-negative" />
          </div>
          <h2 className="text-lg font-bold text-ink">문제가 발생했어요</h2>
          <p className="text-sm text-ink-soft mt-2 leading-relaxed">
            화면을 그리는 중 오류가 났습니다. 데이터는 안전하게 보관되어 있어요. 아래 버튼으로 다시
            시도해보세요.
          </p>
          {/* 개발 환경에서만 에러 메시지 노출 */}
          {import.meta.env.DEV && (
            <pre className="text-xs text-negative/80 bg-negative/5 rounded-lg p-3 mt-4 text-left overflow-auto max-h-32">
              {error.message}
            </pre>
          )}
          <div className="flex gap-2 mt-6">
            <button
              onClick={this.reset}
              className="flex-1 bg-accent text-white text-sm font-medium rounded-full px-4 py-2.5 hover:brightness-110 transition-all active:scale-[0.97]"
            >
              다시 시도
            </button>
            <button
              onClick={() => {
                window.location.hash = '/dashboard';
                this.reset();
              }}
              className="flex-1 bg-line/[0.06] text-ink text-sm font-medium rounded-full px-4 py-2.5 hover:bg-line/[0.1] transition-all active:scale-[0.97]"
            >
              대시보드로
            </button>
          </div>
        </div>
      </div>
    );
  }
}
