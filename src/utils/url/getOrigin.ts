/**
 * Resolves a trusted, validated application origin without relying on unvalidated request headers.
 * Precedence:
 * 1. NEXT_PUBLIC_SITE_URL (canonical production site URL, e.g. https://my-planner.com)
 * 2. NEXT_PUBLIC_VERCEL_URL or VERCEL_URL (Vercel preview deployment URL)
 * 3. Local fallback: http://localhost:3000
 */
export function getAppOrigin(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl && siteUrl.trim().length > 0) {
    const trimmed = siteUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed.replace(/\/+$/, '');
    }
    return `https://${trimmed.replace(/\/+$/, '')}`;
  }

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl.trim().length > 0) {
    const trimmed = vercelUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed.replace(/\/+$/, '');
    }
    return `https://${trimmed.replace(/\/+$/, '')}`;
  }

  return 'http://localhost:3000';
}
