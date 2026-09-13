import React from 'react';
import { notFound } from 'next/navigation';
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
  if (resolvedParams.locale !== 'th' && resolvedParams.locale !== 'en') {
    notFound();
  }

  const locale = resolvedParams.locale as Locale;

  return (
    <html lang={locale} className="h-full">
      <body className="min-h-full flex flex-col">
        <LocaleProvider initialLocale={locale}>
          <AppShell>{children}</AppShell>
        </LocaleProvider>
      </body>
    </html>
  );
}
