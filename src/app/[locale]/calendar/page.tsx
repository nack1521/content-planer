import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CalendarView } from '@/components/calendar/CalendarView';
import { getContentItemsAction, getContentPillarsAction } from '@/app/actions/content';

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
    title: isThai ? 'ปฏิทิน — Content Planner' : 'Calendar — Content Planner',
    description: isThai
      ? 'ภาพรวมกำหนดการเผยแพร่คอนเทนต์รายเดือนตามเวลาไทย'
      : 'Monthly schedule overview for planned content in Bangkok time',
  };
}

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  if (resolvedParams.locale !== 'th' && resolvedParams.locale !== 'en') {
    notFound();
  }

  const [itemsRes, pillarsRes] = await Promise.all([
    getContentItemsAction(),
    getContentPillarsAction(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <CalendarView
        initialItems={itemsRes.error ? undefined : itemsRes.items}
        initialPillars={pillarsRes.error ? undefined : pillarsRes.pillars}
        initialError={itemsRes.error === 'unauthorized' ? null : itemsRes.error || pillarsRes.error}
      />
    </div>
  );
}
