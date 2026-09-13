'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';
import { LocaleSwitch } from '@/components/shell/LocaleSwitch';
import { IconSettings, IconPlanner, IconClock } from '@/components/common/Icons';

export default function SettingsPage() {
  const { t, locale } = useLocale();

  return (
    <div className="py-12 px-4 max-w-xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <IconSettings className="w-5 h-5" size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {t('nav.settings')}
            </h2>
            <p className="text-xs text-slate-500">
              {locale === 'th' ? 'การตั้งค่าระบบและสภาพแวดล้อม' : 'Workspace and environment settings'}
            </p>
          </div>
        </div>

        {/* Setting Items */}
        <div className="space-y-4 text-sm">
          {/* Language Setting */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <span className="font-medium text-slate-800 block">
                {t('common.currentLocale')}
              </span>
              <span className="text-xs text-slate-500">
                {locale === 'th' ? 'ภาษาเริ่มต้นของแอปพลิเคชัน' : 'Application display language'}
              </span>
            </div>
            <LocaleSwitch variant="full" />
          </div>

          {/* Timezone Setting */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <span className="font-medium text-slate-800 block">Timezone</span>
              <span className="text-xs text-slate-500">Asia/Bangkok (UTC+7:00)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
              <IconClock className="w-3.5 h-3.5" size={14} />
              <span>Bangkok</span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Link
            href={`/${locale}/planner`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <IconPlanner className="w-4 h-4" size={16} />
            <span>{locale === 'th' ? 'กลับไปยังหน้าแผนงาน' : 'Back to Planner'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
