/**
 * Safe local domain parser for external links.
 * Extracts hostname without network requests or external scraping.
 * Returns empty string for invalid URLs or non-HTTP/HTTPS protocols.
 */
export function getSafeDomain(rawUrl: string | null | undefined): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}
