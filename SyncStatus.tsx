/**
 * 전역 확인 다이얼로그.
 *
 * 왜 Provider + 훅인가:
 * - 삭제는 4개 페이지에 흩어져 있다. 각자 모달 상태를 관리하면 중복이 크다.
 * - useConfirm()이 Promise<boolean>을 반환하므로, 호출부는
 *   `if (await confirm({...})) remove(id)` 한 줄로 끝난다 (네이티브 confirm과 동일한 사용감).
 *
 * Apple 스타일: 반투명 백드롭, 스프링 팝, 위험 동작은 빨간 강조.
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';

interface ConfirmOptions {
  title: string;
  message?: string;
  /** 확인 버튼 라벨 (기본: 확인) */
  confirmLabel?: string;
  /** 취소 버튼 라벨 (기본: 취소) */
  cancelLabel?: string;
  /** 위험 동작(삭제 등)이면 확인 버튼을 빨간색으로 */
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  // 열려 있는 다이얼로그의 resolve를 보관 → 버튼 클릭 시 Promise를 확정
  const resolver = useRef<(v: boolean) => void>();

  const confirm = useCallback<ConfirmFn>((options) => {
    setState(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = undefined;
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {state && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* 백드롭 */}
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => close(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            {/* 다이얼로그 */}
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              className="relative bg-elevated rounded-card shadow-xl w-full max-w-sm p-6"
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              {state.danger && (
                <div className="w-11 h-11 rounded-full bg-negative/10 grid place-items-center mb-4">
                  <AlertTriangle size={22} className="text-negative" />
                </div>
              )}
              <h2 id="confirm-title" className="text-lg font-bold text-ink">
                {state.title}
              </h2>
              {state.message && (
                <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">{state.message}</p>
              )}
              <div className="flex gap-2 mt-6">
                <Button variant="ghost" className="flex-1" onClick={() => close(false)}>
                  {state.cancelLabel ?? '취소'}
                </Button>
                <Button
                  variant={state.danger ? 'danger' : 'primary'}
                  className="flex-1"
                  onClick={() => close(true)}
                  autoFocus
                >
                  {state.confirmLabel ?? '확인'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

/** 확인 다이얼로그 호출 훅. `if (await confirm({...})) { ... }` 형태로 사용. */
// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
