'use server';

import { createClient } from '@/utils/supabase/server';
import { getUserPreferences, updateUserPreferences, UserPreferences } from '@/utils/supabase/preferences';
import { Locale } from '@/types/planner';

/**
 * Server action to retrieve the authenticated owner's persisted preferences.
 */
export async function getPreferencesAction(): Promise<UserPreferences | null> {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return null;
    }

    return await getUserPreferences(supabase, userId);
  } catch (err) {
    console.error('getPreferencesAction error:', err);
    return null;
  }
}

/**
 * Server action to update the authenticated owner's locale preference.
 */
export async function updateLocalePreferenceAction(locale: Locale): Promise<boolean> {
  const safeLocale: Locale = locale === 'en' ? 'en' : 'th';

  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return false;
    }

    return await updateUserPreferences(supabase, userId, { locale: safeLocale });
  } catch (err) {
    console.error('updateLocalePreferenceAction error:', err);
    return false;
  }
}

/**
 * Server action to update default platforms preference.
 */
export async function updateDefaultPlatformsAction(default_platforms: string[]): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return false;
    }

    return await updateUserPreferences(supabase, userId, { default_platforms });
  } catch (err) {
    console.error('updateDefaultPlatformsAction error:', err);
    return false;
  }
}
