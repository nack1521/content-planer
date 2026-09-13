import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PlannerView } from '@/components/planner/PlannerView';

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
      ? 'แผนคอนเทนต์ — Content Planner'
      : 'Content Planner — Creator Studio Control Board',
    description: isThai
      ? 'พื้นที่วางแผนคอนเทนต์สองภาษาแบบส่วนตัว ตั้งแต่ไอเดียแรกจนถึงเผยแพร่'
      : 'Private bilingual workspace for planning social content from idea to publication',
  };
}

export default async function PlannerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  if (resolvedParams.locale !== 'th' && resolvedParams.locale !== 'en') {
    notFound();
  }

  return <PlannerView />;
}
