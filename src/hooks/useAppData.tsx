/**
 * 앱 전역 데이터 컨텍스트.
 * - AppData 하나를 상태로 들고 있고, 변경 시 debounce 저장.
 * - 각 페이지는 useAppData()로 읽고, 세터로 부분 업데이트.
 * - 배열 CRUD 헬퍼를 제공해 페이지 코드 중복을 제거한다.
 */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  AppData,
  Settings,
  AssetSnapshot,
  MonthlyRecord,
  Milestone,
  Goal,
  SimulatorInput,
} from '@/types';
import { loadData, saveData, autoBackup } from '@/utils/storage';

interface AppDataContextValue {
  data: AppData;
  /** 백업 복원 등 전체 교체 */
  replaceAll: (next: AppData) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  updateSimulator: (patch: Partial<SimulatorInput>) => void;
  // 스냅샷
  addSnapshot: (s: AssetSnapshot) => void;
  removeSnapshot: (id: string) => void;
  // 월별 기록
  upsertRecord: (r: MonthlyRecord) => void;
  removeRecord: (id: string) => void;
  // 마일스톤
  addMilestone: (m: Milestone) => void;
  updateMilestone: (id: string, patch: Partial<Milestone>) => void;
  removeMilestone: (id: string) => void;
  // 목표
  addGoal: (g: Goal) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());
  const timer = useRef<number>();

  // 변경 시 300ms debounce 자동 저장 (연속 입력 시 과도한 write 방지)
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      saveData(data);
      // 하루 한 번 자동 백업(같은 날짜 키는 덮어씀) → 메인 손상 시 복구 지점 확보
      autoBackup(data);
    }, 300);
    return () => window.clearTimeout(timer.current);
  }, [data]);

  const replaceAll = useCallback((next: AppData) => setData(next), []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);

  const updateSimulator = useCallback((patch: Partial<SimulatorInput>) => {
    setData((d) => ({ ...d, simulator: { ...d.simulator, ...patch } }));
  }, []);

  // ── 스냅샷 ──
  const addSnapshot = useCallback((s: AssetSnapshot) => {
    setData((d) => ({
      ...d,
      snapshots: [...d.snapshots, s].sort((a, b) => a.date.localeCompare(b.date)),
    }));
  }, []);
  const removeSnapshot = useCallback((id: string) => {
    setData((d) => ({ ...d, snapshots: d.snapshots.filter((s) => s.id !== id) }));
  }, []);

  // ── 월별 기록 (month 기준 upsert) ──
  const upsertRecord = useCallback((r: MonthlyRecord) => {
    setData((d) => {
      const exists = d.records.some((x) => x.month === r.month);
      const records = exists
        ? d.records.map((x) => (x.month === r.month ? r : x))
        : [...d.records, r];
      return { ...d, records: records.sort((a, b) => a.month.localeCompare(b.month)) };
    });
  }, []);
  const removeRecord = useCallback((id: string) => {
    setData((d) => ({ ...d, records: d.records.filter((r) => r.id !== id) }));
  }, []);

  // ── 마일스톤 ──
  const addMilestone = useCallback((m: Milestone) => {
    setData((d) => ({ ...d, milestones: [...d.milestones, m].sort((a, b) => a.year - b.year) }));
  }, []);
  const updateMilestone = useCallback((id: string, patch: Partial<Milestone>) => {
    setData((d) => ({
      ...d,
      milestones: d.milestones
        .map((m) => (m.id === id ? { ...m, ...patch } : m))
        .sort((a, b) => a.year - b.year),
    }));
  }, []);
  const removeMilestone = useCallback((id: string) => {
    setData((d) => ({ ...d, milestones: d.milestones.filter((m) => m.id !== id) }));
  }, []);

  // ── 목표 ──
  const addGoal = useCallback((g: Goal) => {
    setData((d) => ({ ...d, goals: [g, ...d.goals] }));
  }, []);
  const updateGoal = useCallback((id: string, patch: Partial<Goal>) => {
    setData((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
  }, []);
  const removeGoal = useCallback((id: string) => {
    setData((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) }));
  }, []);

  const value: AppDataContextValue = {
    data,
    replaceAll,
    updateSettings,
    updateSimulator,
    addSnapshot,
    removeSnapshot,
    upsertRecord,
    removeRecord,
    addMilestone,
    updateMilestone,
    removeMilestone,
    addGoal,
    updateGoal,
    removeGoal,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

/** 전역 데이터 접근 훅 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
