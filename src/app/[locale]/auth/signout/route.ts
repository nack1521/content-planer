import { NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Locale } from '@/types/planner';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  const resolvedParams = await params;
  if (resolvedParams.locale !== 'th' && resolvedParams.locale !== 'en') {
    notFound();
  }

  const locale = resolvedParams.locale as Locale;
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL(`/${locale}/login`, request.url), {
    status: 303,
  });
}
