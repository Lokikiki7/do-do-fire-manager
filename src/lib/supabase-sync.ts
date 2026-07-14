import { supabase } from './supabase';
import type { AppData } from '@/types';

export async function syncUserData(userId: string): Promise<AppData | null> {
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data?.data || null;
  } catch (error) {
    console.error('Failed to sync user data:', error);
    return null;
  }
}

export async function saveUserData(userId: string, data: AppData) {
  try {
    await supabase.from('user_data').upsert({
      user_id: userId,
      data: data,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to save user data:', error);
  }
}
