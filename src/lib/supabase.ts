import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pvoqjgqjnzmmnpqqztrc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2b3FqZ3FqbnptbW5wcXF6dHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMDQyOTMsImV4cCI6MjA5OTU4MDI5M30.bwpsulcxHGq5lcqvX0qkO6okinrXsLo1om9iA9wJ48E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** 회원가입 */
export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

/** 로그인 */
export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

/** 로그아웃 */
export async function signOut() {
  return supabase.auth.signOut();
}

/** 현재 사용자 */
export async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user || null;
}

/** 세션 모니터 */
export function onAuthStateChange(callback: (user: any) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  return data?.subscription || null;
}
