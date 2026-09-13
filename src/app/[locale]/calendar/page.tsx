import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Locale } from '@/types/planner';
import { IconCalendar, IconPlanner } from '@/components/common/Icons';
import enMessages from '@/messages/en.json';
import thMessages from '@/messages/th.json';

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
      ? 'ภาพรวมกำหนดการเผยแพร่คอนเทนต์รายเดือน'
      : 'Monthly schedule overview for planned content',
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
  const locale = resolvedParams.locale as Locale;
  const messages = locale === 'th' ? thMessages : enMessages;

  return (
    <div className="py-16 px-4 text-center max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm my-8">
      <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4 border border-purple-100 shadow-xs">
        <IconCalendar className="w-7 h-7" size={28} />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        {messages.calendar.title}
      </h2>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        {messages.calendar.inDevelopment}
      </p>
      <Link
        href={`/${locale}/planner`}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors cursor-pointer"
      >
        <IconPlanner className="w-4 h-4" size={16} />
        <span>{messages.calendar.backToPlanner}</span>
      </Link>
    </div>
  );
}
