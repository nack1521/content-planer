/**
 * Normalizes an email address for safe, case-insensitive comparison.
 * Trims leading/trailing whitespace and converts to lowercase.
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email || typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

/**
 * Parses a comma-separated string of email addresses.
 * Splits by comma, trims whitespace, normalizes to lowercase, and filters out empty entries.
 */
export function parseAllowedEmails(raw: string | null | undefined): string[] {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter((entry) => entry.length > 0);
}

/**
 * Resolves the configured list of authorized email addresses from server environment variables.
 *
 * Precedence rules:
 * 1. When ALLOWED_EMAILS exists in process.env (even if empty), it takes absolute precedence.
 * 2. Legacy ALLOWED_EMAIL is supported as fallback only when ALLOWED_EMAILS is undefined/absent.
 * 3. Fails closed (returns empty array) when neither or only empty/invalid values are configured.
 */
export function getAllowedEmails(): string[] {
  if (process.env.ALLOWED_EMAILS !== undefined) {
    return parseAllowedEmails(process.env.ALLOWED_EMAILS);
  }

  if (process.env.ALLOWED_EMAIL !== undefined) {
    return parseAllowedEmails(process.env.ALLOWED_EMAIL);
  }

  return [];
}

/**
 * Checks whether any valid authorized email addresses are configured on the server.
 * Used for server fail-closed boundary guards (e.g., middleware and proxy session updates).
 */
export function hasAllowedEmailsConfigured(): boolean {
  return getAllowedEmails().length > 0;
}

/**
 * Checks if the provided email matches the configured server-side ALLOWED_EMAILS
 * (or legacy ALLOWED_EMAIL fallback).
 *
 * Security constraints:
 * - Uses exact email matching only.
 * - Rejects substring, domain-only, prefix, suffix, or partial matches.
 * - Normalizes inputs before comparison to ensure case-insensitivity.
 * - Fails closed (returns false) if no valid emails are configured or input is missing/invalid.
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  const normalizedInput = normalizeEmail(email);
  if (!normalizedInput) {
    return false;
  }

  const allowedList = getAllowedEmails();
  if (allowedList.length === 0) {
    // Fail closed when no valid emails are configured on the server
    return false;
  }

  // Exact email matching only
  return allowedList.includes(normalizedInput);
}
