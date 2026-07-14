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
import { syncUserData, saveUserData } from '@/lib/supabase-sync';

interface AppDataContextValue {
  data: AppData;
  replaceAll: (next: AppData) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  updateSimulator: (patch: Partial<SimulatorInput>) => void;
  addSnapshot: (s: AssetSnapshot) => void;
  removeSnapshot: (id: string) => void;
  upsertRecord: (r: MonthlyRecord) => void;
  removeRecord: (id: string) => void;
  addMilestone: (m: Milestone) => void;
  updateMilestone: (id: string, patch: Partial<Milestone>) => void;
  removeMilestone: (id: string) => void;
  addGoal: (g: Goal) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children, userId }: { children: ReactNode; userId: string | null }) {
  const [data, setData] = useState<AppData>(() => loadData());
  const timer = useRef<number>();
  const syncedRef = useRef(false);

  // 로그인 후 Supabase에서 데이터 로드
  useEffect(() => {
    if (userId && !syncedRef.current) {
      syncedRef.current = true;
      syncUserData(userId).then((remoteData) => {
        if (remoteData) {
          setData(remoteData);
        }
      });
    }
  }, [userId]);

  // 변경 시 localStorage + Supabase 저장
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      saveData(data);
      autoBackup(data);
      if (userId) {
        saveUserData(userId, data);
      }
    }, 300);
    return () => window.clearTimeout(timer.current);
  }, [data, userId]);

  const replaceAll = useCallback((next: AppData) => setData(next), []);
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);
  const updateSimulator = useCallback((patch: Partial<SimulatorInput>) => {
    setData((d) => ({ ...d, simulator: { ...d.simulator, ...patch } }));
  }, []);

  const addSnapshot = useCallback((s: AssetSnapshot) => {
    setData((d) => ({
      ...d,
      snapshots: [...d.snapshots, s].sort((a, b) => a.date.localeCompare(b.date)),
    }));
  }, []);
  const removeSnapshot = useCallback((id: string) => {
    setData((d) => ({ ...d, snapshots: d.snapshots.filter((s) => s.id !== id) }));
  }, []);

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

  const addGoal = useCallback((g: Goal) => {
    setData((d) => ({ ...d, goals: [g, ...d.goals] }));
  }, []);
  const updateGoal = useCallback((id: string, patch: Partial<Goal>) => {
    setData((d) => ({
      ...d,
      goals: d.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  }, []);
  const removeGoal = useCallback((id: string) => {
    setData((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) }));
  }, []);

  return (
    <AppDataContext.Provider
      value={{
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
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be inside AppDataProvider');
  return ctx;
}
