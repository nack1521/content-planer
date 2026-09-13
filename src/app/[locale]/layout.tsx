import React from 'react';
import { LocaleProvider } from '@/context/LocaleContext';
import { AppShell } from '@/components/shell/AppShell';
import { Locale } from '@/types/planner';

export function generateStaticParams() {
  return [{ locale: 'th' }, { locale: 'en' }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const locale = (
    resolvedParams.locale === 'en' || resolvedParams.locale === 'th'
      ? resolvedParams.locale
      : 'th'
  ) as Locale;

  return (
    <LocaleProvider initialLocale={locale}>
      <AppShell>{children}</AppShell>
    </LocaleProvider>
  );
}
