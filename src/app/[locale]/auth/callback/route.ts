import { NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { isAllowedEmail } from '@/utils/auth/allowedEmail';
import { Locale } from '@/types/planner';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  const resolvedParams = await params;
  if (resolvedParams.locale !== 'th' && resolvedParams.locale !== 'en') {
    notFound();
  }

  const locale = resolvedParams.locale as Locale;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextParam = requestUrl.searchParams.get('next');

  // Restrict callback destinations to approved localized application routes
  const approvedDestinations = [
    `/${locale}/planner`,
    `/${locale}/calendar`,
    `/${locale}/ideas`,
    `/${locale}/settings`,
  ];

  let safeNext = `/${locale}/planner`;
  if (nextParam && approvedDestinations.includes(nextParam)) {
    safeNext = nextParam;
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      console.error('exchangeCodeForSession failed:', error?.message);
      return NextResponse.redirect(new URL(`/${locale}/login?error=auth_failed`, request.url));
    }

    // Double check email authorization on server side
    if (!isAllowedEmail(data.user.email)) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL(`/${locale}/login?error=unauthorized`, request.url));
    }

    // Successfully authenticated owner
    return NextResponse.redirect(new URL(safeNext, request.url));
  }

  // If no auth code was provided, redirect to login
  return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
}
