'use client';

import React from 'react';
import { useLocale } from '@/context/LocaleContext';
import { LocaleSwitch } from './LocaleSwitch';

export function MobileHeader() {
  const { t } = useLocale();

  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-slate-950 text-white border-b border-slate-800 shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-700 to-orchid-500 flex items-center justify-center text-white font-bold text-xs shadow-xs">
          CP
        </div>
        <div>
          <span className="font-bold text-sm text-white tracking-tight">
            {t('app.title')}
          </span>
          <span className="block text-[10px] text-slate-400 font-medium">
            {t('app.ownerBadge')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <LocaleSwitch variant="compact" />
      </div>
    </header>
  );
}
