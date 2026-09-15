import { SupabaseClient } from '@supabase/supabase-js';
import type { Locale } from '@/types/planner';

export interface UserPreferences {
  user_id: string;
  locale: Locale;
  timezone: string;
  default_platforms: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Retrieves the owner's user preferences from Supabase, or provisions them if missing.
 */
export async function getUserPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch user preferences:', error.message);
    return null;
  }

  if (data) {
    return data as UserPreferences;
  }

  // If no record exists yet, insert initial defaults for the authenticated user
  const defaults = {
    user_id: userId,
    locale: 'th',
    timezone: 'Asia/Bangkok',
    default_platforms: [],
  };

  const { data: created, error: insertError } = await supabase
    .from('user_preferences')
    .insert(defaults)
    .select('*')
    .single();

  if (insertError) {
    console.error('Failed to create default preferences:', insertError.message);
    return null;
  }

  return created as UserPreferences;
}

/**
 * Updates the owner's preferred locale or default platforms.
 */
export async function updateUserPreferences(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<Pick<UserPreferences, 'locale' | 'default_platforms'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('user_preferences')
    .update(updates)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to update user preferences:', error.message);
    return false;
  }

  return true;
}
