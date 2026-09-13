import { Metadata } from 'next';
import { PlannerView } from '@/components/planner/PlannerView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isThai = locale === 'th';

  return {
    title: isThai
      ? 'แผนคอนเทนต์ — Content Planner'
      : 'Content Planner — Creator Studio Control Board',
    description: isThai
      ? 'พื้นที่วางแผนคอนเทนต์สองภาษาแบบส่วนตัว ตั้งแต่ไอเดียแรกจนถึงเผยแพร่'
      : 'Private bilingual workspace for planning social content from idea to publication',
  };
}

export default function PlannerPage() {
  return <PlannerView />;
}
