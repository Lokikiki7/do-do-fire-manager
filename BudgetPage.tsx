/**
 * Supabase user_data 테이블 데이터 접근 계층.
 * - 원격 데이터를 읽고/쓰는 순수 함수만 제공 (상태 관리는 SyncProvider 담당)
 * - 모든 오류를 사용자가 이해할 수 있는 한국어 메시지(SyncError)로 변환
 * - data 컬럼이 문자열(구버전 이중 인코딩)이든 객체(jsonb)든 모두 안전하게 파싱
 */
import { supabase } from './supabase';
import { normalizeAppData } from '@/utils/schema';
import type { AppData } from '@/types';

export class SyncError extends Error {
  /** 사용자에게 보여줄 한국어 메시지 */
  friendly: string;
  /** 원인 코드 (디버깅용) */
  code?: string;

  constructor(friendly: string, code?: string, cause?: unknown) {
    super(friendly);
    this.name = 'SyncError';
    this.friendly = friendly;
    this.code = code;
    if (cause) console.error('[sync]', code, cause);
  }
}

/** PostgREST/네트워크 오류 → 친절한 한국어 메시지 */
function toSyncError(error: { code?: string; message?: string; status?: number } | null | unknown): SyncError {
  const e = (error ?? {}) as { code?: string; message?: string; status?: number };
  const code = e.code ?? String(e.status ?? '');
  const msg = e.message ?? '';

  if (code === 'PGRST205' || code === '42P01' || /relation .* does not exist|Could not find the table/i.test(msg)) {
    return new SyncError(
      '클라우드 데이터베이스에 user_data 테이블이 없습니다. Supabase SQL 편집기에서 supabase/setup.sql을 실행해 주세요.',
      code, error,
    );
  }
  if (code === '42501' || e.status === 401 || e.status === 403 || /permission denied|row-level security/i.test(msg)) {
    return new SyncError(
      '데이터베이스 접근 권한이 없습니다. Supabase에서 user_data 테이블의 RLS 정책(supabase/setup.sql)을 적용했는지 확인해 주세요.',
      code, error,
    );
  }
  if (/JWT|token|session/i.test(msg) || e.status === 400) {
    return new SyncError('로그인 세션이 만료되었어요. 다시 로그인해 주세요.', code, error);
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return new SyncError('오프라인 상태예요. 인터넷 연결 후 자동으로 다시 동기화됩니다.', 'offline', error);
  }
  if (/fetch|network|Failed to fetch/i.test(msg) || error instanceof TypeError) {
    return new SyncError('서버에 연결할 수 없어요. 네트워크 상태를 확인해 주세요.', 'network', error);
  }
  return new SyncError(`동기화 중 오류가 발생했어요. (${msg || code || '알 수 없는 오류'})`, code, error);
}

/** jsonb 객체·JSON 문자열 어느 쪽이 저장돼 있어도 AppData로 복원 */
function parseRemotePayload(raw: unknown): AppData | null {
  let value: unknown = raw;
  // 구버전은 JSON.stringify한 "문자열"을 jsonb에 넣었다 → 문자열이면 한 번 더 파싱
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return normalizeAppData(value);
}

export interface RemoteData {
  data: AppData;
  updatedAt: string; // ISO
}

/** 원격 데이터 조회. 행이 없으면 null (새 사용자). 실패 시 SyncError throw. */
export async function fetchRemote(userId: string): Promise<RemoteData | null> {
  const { data, error } = await supabase
    .from('user_data')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle(); // 0행이어도 오류가 아님 (.single()은 0행을 오류로 취급)

  if (error) throw toSyncError(error);
  if (!data) return null;

  const parsed = parseRemotePayload(data.data);
  if (!parsed) {
    throw new SyncError(
      '클라우드에 저장된 데이터 형식이 올바르지 않아요. 설정 > 데이터 관리에서 JSON 백업 후 재동기화해 주세요.',
      'corrupt',
    );
  }
  return { data: parsed, updatedAt: data.updated_at ?? new Date().toISOString() };
}

/** 원격에 업로드(upsert). 성공 시 서버 updated_at 반환. 실패 시 SyncError throw. */
export async function pushRemote(userId: string, appData: AppData): Promise<string> {
  const { data, error } = await supabase
    .from('user_data')
    .upsert(
      {
        user_id: userId,
        data: appData, // jsonb에 객체 그대로 저장 (이중 인코딩 금지)
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('updated_at')
    .single();

  if (error) throw toSyncError(error);
  return data?.updated_at ?? new Date().toISOString();
}
