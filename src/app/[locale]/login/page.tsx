import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';

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
    title: isThai ? 'เข้าสู่ระบบ — Content Planner' : 'Sign In — Content Planner',
    description: isThai
      ? 'เข้าสู่สตูดิโอวางแผนคอนเทนต์ส่วนตัวของคุณ'
      : 'Access your personal content planning studio',
  };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  if (resolvedParams.locale !== 'th' && resolvedParams.locale !== 'en') {
    notFound();
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <LoginForm />
    </Suspense>
  );
}
