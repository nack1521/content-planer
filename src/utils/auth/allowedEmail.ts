/**
 * Normalizes an email address for safe, case-insensitive comparison.
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Checks if the provided email matches the configured server-side ALLOWED_EMAIL.
 * Returns true if allowed, false otherwise.
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  const allowed = process.env.ALLOWED_EMAIL;
  if (!allowed) {
    // If no ALLOWED_EMAIL is configured on the server, deny access by default for safety
    return false;
  }

  const normalizedInput = normalizeEmail(email);
  const normalizedAllowed = normalizeEmail(allowed);

  if (!normalizedInput || !normalizedAllowed) {
    return false;
  }

  return normalizedInput === normalizedAllowed;
}
