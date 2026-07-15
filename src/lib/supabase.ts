/**
 * Supabase 클라이언트 (싱글턴)
 * - 환경변수 미설정 시 클라이언트를 만들지 않고 isSupabaseConfigured=false로 표시
 * - 세션은 localStorage에 영속 → 새로고침해도 로그인 유지
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/** URL과 anon key가 모두 있어야 클라우드 동기화 사용 가능 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'fire-manager:auth',
      // 해시 라우터(#/dashboard)를 사용하므로 URL 세션 감지는 끈다
      detectSessionInUrl: false,
    },
  },
);
