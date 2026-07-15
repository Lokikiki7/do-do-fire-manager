/**
 * LocalStorage 영속화 + JSON 백업/복원 + 자동 백업.
 * AppData 전체를 한 키에 저장 → 백업이 파일 하나로 끝난다.
 */
import type { AppData } from '@/types';
import { DEFAULT_DATA, STORAGE_KEY, BACKUP_PREFIX, MAX_BACKUPS } from '@/constants';
import { normalizeAppData } from '@/utils/schema';

/**
 * 저장된 데이터 로드. 손상 시 (1) 자동 백업에서 복구 시도 → (2) 기본값 순으로 폴백.
 * normalizeAppData로 필드 단위 검증을 거쳐 항상 안전한 AppData를 반환한다.
 */
export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const normalized = normalizeAppData(JSON.parse(raw));
      if (normalized) return normalized;
    }
  } catch {
    // JSON 파싱 실패 → 아래에서 백업 복구 시도
  }

  // 메인 데이터가 손상됐다면 가장 최근 자동 백업에서 복구
  const recovered = recoverFromLatestBackup();
  if (recovered) return recovered;

  return structuredClone(DEFAULT_DATA);
}

/** 자동 저장 */
export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('저장 실패:', e);
  }
}

// ─────────────────────────────────────────────
// 자동 백업 (일별 롤링 스냅샷)
// ─────────────────────────────────────────────

/**
 * 하루 한 번 자동 백업을 남긴다(같은 날짜 키는 덮어씀).
 * MAX_BACKUPS를 초과하면 가장 오래된 백업부터 삭제한다.
 * 메인 저장과 별개 키에 보관하므로, 메인이 손상돼도 되돌릴 수 있다.
 */
export function autoBackup(data: AppData): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`${BACKUP_PREFIX}${today}`, JSON.stringify(data));
    pruneOldBackups();
  } catch (e) {
    console.error('자동 백업 실패:', e);
  }
}

/** 보관 중인 자동 백업 키를 날짜 오름차순으로 반환 */
export function listBackupKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(BACKUP_PREFIX)) keys.push(k);
  }
  return keys.sort(); // 키에 ISO 날짜가 들어 있어 사전순 == 시간순
}

/** MAX_BACKUPS 초과분(오래된 것) 삭제 */
function pruneOldBackups(): void {
  const keys = listBackupKeys();
  if (keys.length <= MAX_BACKUPS) return;
  keys.slice(0, keys.length - MAX_BACKUPS).forEach((k) => localStorage.removeItem(k));
}

/** 가장 최근 자동 백업에서 복구 시도 */
function recoverFromLatestBackup(): AppData | null {
  const keys = listBackupKeys();
  for (let i = keys.length - 1; i >= 0; i--) {
    try {
      const raw = localStorage.getItem(keys[i]);
      if (!raw) continue;
      const normalized = normalizeAppData(JSON.parse(raw));
      if (normalized) return normalized;
    } catch {
      // 이 백업도 손상 → 이전 백업 시도
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// 수동 JSON 백업/복원 (파일)
// ─────────────────────────────────────────────

/** JSON 백업 파일 다운로드 */
export function exportBackup(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fire-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 백업 파일 파싱 + 검증. 유효하지 않으면 null */
export async function importBackup(file: File): Promise<AppData | null> {
  try {
    const text = await file.text();
    return normalizeAppData(JSON.parse(text));
  } catch {
    return null;
  }
}
