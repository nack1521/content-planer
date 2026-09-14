import { NextResponse } from 'next/server.js';

/**
 * Creates a redirect response that preserves all cookies and relevant source response headers
 * (such as session refresh cookies, sign-out clearing cookies, or custom headers)
 * without overwriting redirect-specific headers (location, status, content-type, content-length).
 */
export function createRedirectResponse(
  url: URL | string,
  sourceResponse: NextResponse,
  status = 307
): NextResponse {
  const redirectResponse = NextResponse.redirect(url, status);

  // Propagate all cookies from source response
  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  // Headers that should not be copied from source to redirect
  const skipHeaders = new Set([
    'location',
    'content-type',
    'content-length',
  ]);

  sourceResponse.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (!skipHeaders.has(lowerKey) && !redirectResponse.headers.has(key)) {
      redirectResponse.headers.set(key, value);
    }
  });

  return redirectResponse;
}
