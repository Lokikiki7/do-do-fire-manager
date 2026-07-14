import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pvoqjgqjnzmmnpqqztrc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2b3FqZ3FqbnptbW5wcXF6dHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMDQyOTMsImV4cCI6MjA5OTU4MDI5M30.bwpsulcxHGq5lcqvX0qkO6okinrXsLo1om9iA9wJ48E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user || null;
}

export function onAuthStateChange(callback: (user: any) => void) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback(session?.user || null);
  });

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });

  return data.subscription;
}
