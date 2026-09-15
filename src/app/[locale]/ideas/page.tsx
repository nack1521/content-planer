import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getReferenceAccountsAction } from '@/app/actions/reference-accounts';
import { getContentItemsAction, getContentPillarsAction } from '@/app/actions/content';
import { IdeasView } from '@/components/ideas/IdeasView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  if (resolvedParams.locale !== 'th' && resolvedParams.locale !== 'en') {
    notFound();
  }
  const isThai = resolvedParams.locale === 'th';
  return {
    title: isThai
      ? 'คลังไอเดียและแรงบันดาลใจ — Content Planner'
      : 'Idea Bank & Inspiration — Content Planner',
    description: isThai
      ? 'บันทึกไอเดียคอนเทนต์อย่างรวดเร็วและรวบรวมบัญชีอ้างอิงสำหรับการผลิต'
      : 'Fast capture idea bank and curated reference accounts for production',
  };
}

export default async function IdeasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  if (resolvedParams.locale !== 'th' && resolvedParams.locale !== 'en') {
    notFound();
  }

  const [itemsRes, pillarsRes, accountsRes] = await Promise.all([
    getContentItemsAction(),
    getContentPillarsAction(),
    getReferenceAccountsAction(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <IdeasView
        initialItems={itemsRes.error ? undefined : itemsRes.items}
        initialPillars={pillarsRes.error ? undefined : pillarsRes.pillars}
        initialAccounts={accountsRes.error ? undefined : accountsRes.accounts}
        initialError={itemsRes.error === 'unauthorized' ? null : itemsRes.error || pillarsRes.error}
        initialAccountsError={accountsRes.error === 'unauthorized' ? null : accountsRes.error}
      />
    </div>
  );
}
