/**
 * 클라우드 동기화 엔진 (SyncProvider / useSync)
 *
 * 이전 구현의 문제와 해결:
 *  1. 로그인 직후 "로컬 기본값 업로드"와 "원격 다운로드"가 경쟁 → 클라우드 데이터가
 *     빈 데이터로 덮어써짐. → 해결: 하이드레이션(최초 다운로드)이 끝나기 전에는
 *     업로드를 절대 하지 않는 게이트 도입.
 *  2. 모든 오류를 console에만 남기고 무시 → 사용자는 원인을 알 수 없음.
 *     → 해결: 상태 머신(status/error)을 UI에 노출.
 *  3. 원격 반영(replaceAll)이 다시 업로드를 유발하는 되먹임.
 *     → 해결: 마지막으로 적용한 원격 스냅샷과 동일하면 업로드 생략.
 *
 * 충돌 해결(단일 사용자 다기기 가정):
 *  - 원격 행이 없으면 → 로컬 업로드
 *  - 마지막 동기화 이후 로컬 수정이 없으면 → 원격 적용
 *  - 둘 다 수정됐으면 → 더 최신 타임스탬프 쪽을 채택
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import type { AppData } from '@/types';
import { useAppData } from '@/hooks/useAppData';
import { isSupabaseConfigured } from '@/lib/supabase';
import { fetchRemote, pushRemote, SyncError } from '@/lib/supabase-sync';

export type SyncStatus =
  | 'disabled' // Supabase 미설정 또는 비로그인 → 로컬 전용
  | 'syncing' // 업/다운로드 진행 중
  | 'synced' // 최신 상태
  | 'offline' // 네트워크 없음 (복구 시 자동 재동기화)
  | 'error'; // 오류 (재동기화 버튼으로 재시도)

interface SyncContextValue {
  status: SyncStatus;
  /** 마지막 동기화 성공 시각 (ISO) */
  lastSyncedAt: string | null;
  /** 사용자에게 보여줄 오류 메시지 (status === 'error'일 때) */
  errorMessage: string | null;
  /** 브라우저 온라인 여부 */
  online: boolean;
  /** 수동 재동기화 */
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const META_KEY = 'fire-manager:sync-meta';
interface SyncMeta {
  lastSyncedAt: string | null;
  lastLocalEditAt: string | null;
}
function loadMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return { lastSyncedAt: null, lastLocalEditAt: null, ...JSON.parse(raw) };
  } catch {
    /* 무시 */
  }
  return { lastSyncedAt: null, lastLocalEditAt: null };
}
function saveMeta(meta: SyncMeta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* 무시 */
  }
}

const UPLOAD_DEBOUNCE_MS = 1200;
const FOCUS_REFRESH_MS = 60_000; // 탭 복귀 시 60초 지났으면 원격 확인

export function SyncProvider({ user, children }: { user: User | null; children: ReactNode }) {
  const { data, replaceAll } = useAppData();

  const enabled = isSupabaseConfigured && !!user;
  const [status, setStatus] = useState<SyncStatus>('disabled');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => loadMeta().lastSyncedAt);

  /** 최초 다운로드(하이드레이션) 완료 전에는 업로드 금지 */
  const hydratedRef = useRef(false);
  /** 마지막으로 원격에서 받아 적용한 스냅샷 — 이 변경은 다시 업로드하지 않음 */
  const lastAppliedRemoteJsonRef = useRef<string | null>(null);
  /** 마지막으로 업로드에 성공한 스냅샷 */
  const lastPushedJsonRef = useRef<string | null>(null);
  const dataRef = useRef<AppData>(data);
  dataRef.current = data;
  const uploadTimer = useRef<number>();
  const pendingRef = useRef(false); // 오프라인/오류 중 쌓인 변경 여부
  const lastActivityRef = useRef(Date.now());

  const markSynced = useCallback((iso: string) => {
    setLastSyncedAt(iso);
    setStatus('synced');
    setErrorMessage(null);
    const meta = loadMeta();
    saveMeta({ ...meta, lastSyncedAt: iso });
  }, []);

  const fail = useCallback((e: unknown) => {
    const msg = e instanceof SyncError ? e.friendly : '동기화 중 알 수 없는 오류가 발생했어요.';
    if (e instanceof SyncError && (e.code === 'offline' || e.code === 'network')) {
      setStatus('offline');
    } else {
      setStatus('error');
    }
    setErrorMessage(msg);
  }, []);

  /** 현재 로컬 데이터를 원격에 업로드 */
  const pushNow = useCallback(async () => {
    if (!user) return;
    const snapshot = dataRef.current;
    const json = JSON.stringify(snapshot);
    setStatus('syncing');
    try {
      const updatedAt = await pushRemote(user.id, snapshot);
      lastPushedJsonRef.current = json;
      pendingRef.current = false;
      markSynced(updatedAt);
    } catch (e) {
      pendingRef.current = true;
      fail(e);
    }
  }, [user, markSynced, fail]);

  /** 하이드레이션: 원격을 내려받아 로컬과 병합 방향 결정 */
  const hydrate = useCallback(async () => {
    if (!user) return;
    setStatus('syncing');
    setErrorMessage(null);
    try {
      const remote = await fetchRemote(user.id);
      const meta = loadMeta();

      if (!remote) {
        // 새 사용자: 로컬 데이터를 첫 업로드
        hydratedRef.current = true;
        await pushNow();
        return;
      }

      const localEditedSinceSync =
        !!meta.lastLocalEditAt &&
        (!meta.lastSyncedAt || meta.lastLocalEditAt > meta.lastSyncedAt);
      const remoteNewerThanLocalEdit =
        !meta.lastLocalEditAt || remote.updatedAt > meta.lastLocalEditAt;

      if (!localEditedSinceSync || remoteNewerThanLocalEdit) {
        // 원격 채택
        const json = JSON.stringify(remote.data);
        lastAppliedRemoteJsonRef.current = json;
        lastPushedJsonRef.current = json;
        hydratedRef.current = true;
        replaceAll(remote.data);
        markSynced(remote.updatedAt);
      } else {
        // 로컬이 더 최신 → 업로드
        hydratedRef.current = true;
        await pushNow();
      }
    } catch (e) {
      // 하이드레이션 실패 시에도 게이트는 닫아둔 채 유지 → 원격을 덮어쓰지 않음
      fail(e);
    }
  }, [user, replaceAll, markSynced, pushNow, fail]);

  /** 수동 재동기화: 실패 상태면 하이드레이션부터, 아니면 업로드 */
  const syncNow = useCallback(async () => {
    if (!enabled) return;
    if (!hydratedRef.current) {
      await hydrate();
    } else {
      await pushNow();
    }
  }, [enabled, hydrate, pushNow]);

  // ── 로그인/로그아웃 전환 처리 ─────────────────────────────
  const userId = user?.id ?? null;
  useEffect(() => {
    hydratedRef.current = false;
    lastAppliedRemoteJsonRef.current = null;
    lastPushedJsonRef.current = null;
    pendingRef.current = false;
    if (!enabled) {
      setStatus('disabled');
      setErrorMessage(null);
      return;
    }
    void hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, enabled]);

  // ── 데이터 변경 → 디바운스 업로드 ─────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const json = JSON.stringify(data);

    // 원격에서 방금 적용한 변경이면 다시 올리지 않음 (되먹임 차단)
    if (json === lastAppliedRemoteJsonRef.current) return;
    // 이미 업로드한 것과 동일하면 생략
    if (json === lastPushedJsonRef.current) return;

    // 로컬 수정 시각 기록 (충돌 해결 기준)
    lastActivityRef.current = Date.now();
    const meta = loadMeta();
    saveMeta({ ...meta, lastLocalEditAt: new Date().toISOString() });

    // 하이드레이션 전이면 업로드 보류 (원격 덮어쓰기 방지)
    if (!hydratedRef.current) {
      pendingRef.current = true;
      return;
    }

    if (!navigator.onLine) {
      pendingRef.current = true;
      setStatus('offline');
      return;
    }

    window.clearTimeout(uploadTimer.current);
    uploadTimer.current = window.setTimeout(() => void pushNow(), UPLOAD_DEBOUNCE_MS);
    return () => window.clearTimeout(uploadTimer.current);
  }, [data, enabled, pushNow]);

  // ── 온라인/오프라인 감지 ─────────────────────────────────
  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      if (!enabled) return;
      if (!hydratedRef.current) void hydrate();
      else if (pendingRef.current) void pushNow();
      else setStatus('synced');
    };
    const goOffline = () => {
      setOnline(false);
      if (enabled) setStatus('offline');
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [enabled, hydrate, pushNow]);

  // ── 탭 복귀 시 원격 최신본 확인 (다른 기기 변경 반영) ──────
  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastActivityRef.current < FOCUS_REFRESH_MS) return;
      lastActivityRef.current = Date.now();
      void (async () => {
        try {
          if (!user || pendingRef.current || !hydratedRef.current) return;
          const remote = await fetchRemote(user.id);
          if (remote && (!lastSyncedAt || remote.updatedAt > lastSyncedAt)) {
            const json = JSON.stringify(remote.data);
            if (json !== JSON.stringify(dataRef.current)) {
              lastAppliedRemoteJsonRef.current = json;
              lastPushedJsonRef.current = json;
              replaceAll(remote.data);
            }
            markSynced(remote.updatedAt);
          }
        } catch {
          /* 백그라운드 확인 실패는 조용히 무시 */
        }
      })();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [enabled, user, lastSyncedAt, replaceAll, markSynced]);

  const value = useMemo<SyncContextValue>(
    () => ({ status, lastSyncedAt, errorMessage, online, syncNow }),
    [status, lastSyncedAt, errorMessage, online, syncNow],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}
