/**
 * Safe clipboard copy utility.
 * Handles API rejection, permissions errors, or unsupported environments without crashing.
 * Returns true if copying succeeded, false otherwise.
 */
export async function copyToClipboard(text: string | null | undefined): Promise<boolean> {
  if (!text || typeof text !== 'string') return false;
  if (!text.trim()) return false;

  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Clipboard write failed, permission rejected, or insecure context
    return false;
  }

  return false;
}
