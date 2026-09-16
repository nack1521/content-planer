import { Metadata } from 'next';
import { notFound } from 'next/navigation';

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
    title: isThai ? 'ตั้งค่า — Content Planner' : 'Settings — Content Planner',
    description: isThai
      ? 'ตั้งค่าภาษาเริ่มต้น แพลตฟอร์มหลัก และเขตเวลา'
      : 'Manage preferred language, default platforms, and timezone settings',
  };
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
