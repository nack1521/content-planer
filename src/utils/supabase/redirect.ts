import { NextResponse } from 'next/server.js';

/**
 * Explicit allowlist of safe application headers to preserve on custom redirects.
 * Next.js internal middleware control headers (such as x-middleware-next, x-middleware-rewrite,
 * x-middleware-override-headers) and redirect-specific headers (location, content-type, content-length)
 * MUST NEVER be propagated onto redirect responses.
 */
export const ALLOWED_REDIRECT_HEADERS = new Set([
  'cache-control',
  'clear-site-data',
  'strict-transport-security',
  'x-content-type-options',
  'x-frame-options',
  'x-correlation-id',
  'x-request-id',
  'x-trace-id',
  'traceparent',
  'tracestate',
]);

/**
 * Creates a redirect response that preserves all cookies and an explicit allowlist of safe
 * application headers without leaking Next.js internal middleware control headers or
 * overwriting redirect-specific headers.
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

  // Copy ONLY explicit allowlisted safe application headers
  sourceResponse.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (ALLOWED_REDIRECT_HEADERS.has(lowerKey) && !redirectResponse.headers.has(key)) {
      redirectResponse.headers.set(key, value);
    }
  });

  return redirectResponse;
}
