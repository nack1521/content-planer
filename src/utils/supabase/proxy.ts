import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAllowedEmail, hasAllowedEmailsConfigured } from '@/utils/auth/allowedEmail';
import { createRedirectResponse } from './redirect';

export { createRedirectResponse };

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;

  // Extract locale from URL
  const segments = pathname.split('/');
  const localeSegment = segments[1];
  const locale = localeSegment === 'en' ? 'en' : 'th';

  const isPublicAuthRoute =
    pathname === `/${locale}/login` ||
    pathname.startsWith(`/${locale}/auth/`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const hasAuthConfig = hasAllowedEmailsConfigured();

  // FAIL CLOSED: If environment configuration is missing, protected routes must NEVER be exposed
  if (!supabaseUrl || !supabaseKey || !hasAuthConfig) {
    if (!isPublicAuthRoute && pathname !== '/') {
      if (localeSegment === 'th' || localeSegment === 'en') {
        const loginUrl = new URL(`/${locale}/login?error=service_error`, request.url);
        return createRedirectResponse(loginUrl, response);
      }
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Supabase SSR proxy contract: validate session with getClaims()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const isAuthenticated = !claimsError && Boolean(claims && claims.sub);
  const userEmail = (claims?.email as string | undefined) || null;

  // Protect unauthenticated requests to application routes
  if (!isAuthenticated && !isPublicAuthRoute && pathname !== '/') {
    if (localeSegment === 'th' || localeSegment === 'en') {
      const loginUrl = new URL(`/${locale}/login`, request.url);
      return createRedirectResponse(loginUrl, response);
    }
  }

  // Handle authenticated sessions
  if (isAuthenticated) {
    // If authenticated user does not match ALLOWED_EMAIL, sign out and clear session cookies
    if (!isAllowedEmail(userEmail)) {
      await supabase.auth.signOut();
      const loginUrl = new URL(`/${locale}/login?error=unauthorized`, request.url);
      // Preserving the cookies from response ensures the browser deletes the auth cookie,
      // preventing an infinite redirect loop when the browser navigates to /login.
      return createRedirectResponse(loginUrl, response);
    }

    // If authenticated owner attempts to open login page, redirect to planner
    if (pathname === `/${locale}/login`) {
      const plannerUrl = new URL(`/${locale}/planner`, request.url);
      return createRedirectResponse(plannerUrl, response);
    }
  }

  return response;
}
