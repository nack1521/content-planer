'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';
import { IconLightbulb, IconPlanner } from '@/components/common/Icons';

export default function IdeasPage() {
  const { t, locale } = useLocale();

  return (
    <div className="py-16 px-4 text-center max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm my-8">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-100 shadow-xs">
        <IconLightbulb className="w-7 h-7" size={28} />
      </div>
      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 font-mono mb-2">
        Milestone 5
      </span>
      <h2 className="text-lg font-bold text-slate-900 mb-1">
        {t('nav.ideas')}
      </h2>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        {locale === 'th'
          ? 'คลังไอเดียแบบจดบันทึกด่วนและไอเดียที่ยังไม่กำหนดวัน จะได้รับการพัฒนาในไมล์สโตน 5'
          : 'The quick-capture idea bank for unscheduled ideas will be implemented in Milestone 5.'}
      </p>
      <Link
        href={`/${locale}/planner`}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors cursor-pointer"
      >
        <IconPlanner className="w-4 h-4" size={16} />
        <span>{t('nav.planner')}</span>
      </Link>
    </div>
  );
}
