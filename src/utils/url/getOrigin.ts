/**
 * Resolves a trusted, validated application origin without relying on unvalidated request headers.
 *
 * Rules:
 * 1. Parse configured values using new URL().
 * 2. Allow only 'http:' and 'https:' protocols.
 * 3. Return only the URL origin (e.g. 'https://example.com') without credentials, paths, query strings, or fragments.
 * 4. Permit localhost fallback strictly when NODE_ENV is not 'production'.
 * 5. Fail closed in production by throwing an Error when the site URL is absent or invalid.
 */

export function parseValidOrigin(candidate: string | undefined | null): string | null {
  if (!candidate || typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;

  try {
    // If protocol is missing (e.g. 'preview-abc.vercel.app'), prepend https://
    const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed);
    const url = new URL(hasProtocol ? trimmed : `https://${trimmed}`);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    // url.origin strips credentials, pathname, search query, and hash
    return url.origin;
  } catch {
    return null;
  }
}

export function getAppOrigin(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const siteOrigin = parseValidOrigin(siteUrl);
  if (siteOrigin) {
    return siteOrigin;
  }

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  const vercelOrigin = parseValidOrigin(vercelUrl);
  if (vercelOrigin) {
    return vercelOrigin;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    throw new Error(
      'Application origin is unconfigured or invalid in production environment. Configure NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_VERCEL_URL with a valid http(s) URL.'
    );
  }

  return 'http://localhost:3000';
}
