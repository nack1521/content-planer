'use server';

import { createClient } from '@/utils/supabase/server';
import { isAllowedEmail, normalizeEmail } from '@/utils/auth/allowedEmail';
import { getAppOrigin } from '@/utils/url/getOrigin';
import { redirect } from 'next/navigation';
import type { Locale } from '@/types/planner';

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

/**
 * Sign in an existing, allow-listed owner without sending an email. This uses
 * the same Supabase user ID as magic-link sign-in, so RLS ownership is unchanged.
 */
export async function signInWithPasswordAction(
  email: string,
  password: string
): Promise<AuthActionResult> {
  const normalized = normalizeEmail(email);

  // Return the same response for an unknown owner and a wrong password.
  if (!normalized || !normalized.includes('@') || normalized.length > 254 ||
      typeof password !== 'string' || password.length === 0 || password.length > 1024 ||
      !isAllowedEmail(normalized)) {
    return { success: false, error: 'invalid_credentials' };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });

    if (error || !data.user || !isAllowedEmail(data.user.email)) {
      if (data.session) await supabase.auth.signOut();
      return { success: false, error: 'invalid_credentials' };
    }

    return { success: true };
  } catch {
    // Do not log passwords, attempted emails, or raw provider responses.
    return { success: false, error: 'service_error' };
  }
}

/**
 * Validates locale parameter safely at runtime.
 */
function getSafeLocale(locale: unknown): Locale {
  return locale === 'en' ? 'en' : 'th';
}

/**
 * Server action to send a magic link sign-in email.
 * Strictly checks ALLOWED_EMAILS (or legacy ALLOWED_EMAIL) and returns a neutral response for unauthorized addresses
 * to prevent user enumeration or public sign-ups.
 */
export async function sendMagicLinkAction(
  email: string,
  locale: Locale
): Promise<AuthActionResult> {
  const safeLocale = getSafeLocale(locale);
  const normalized = normalizeEmail(email);

  if (!normalized || !normalized.includes('@')) {
    return { success: false, error: 'invalid_email' };
  }

  // Security barrier: If the email is not an authorized owner, return a neutral success
  // without notifying Supabase or disclosing account registration status.
  if (!isAllowedEmail(normalized)) {
    return { success: true };
  }

  let origin: string;
  try {
    origin = getAppOrigin();
  } catch {
    // Fail-closed if origin is unconfigured or invalid in production
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        emailRedirectTo: `${origin}/${safeLocale}/auth/callback?next=/${safeLocale}/planner`,
      },
    });

    if (error) {
      console.error('Supabase signInWithOtp error:', error.message);
      return { success: false, error: 'service_error' };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('sendMagicLinkAction unexpected error:', err);
    return { success: false, error: 'service_error' };
  }
}

/**
 * Server action to sign out the current user and redirect to the localized login page.
 */
export async function signOutAction(locale: Locale = 'th') {
  const safeLocale = getSafeLocale(locale);

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error('signOut error:', err);
  }

  redirect(`/${safeLocale}/login`);
}
