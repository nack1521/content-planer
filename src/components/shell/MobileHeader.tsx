'use client';

import React, { useTransition } from 'react';
import { useLocale } from '@/context/LocaleContext';
import { LocaleSwitch } from './LocaleSwitch';
import { signOutAction } from '@/app/actions/auth';
import { IconLogOut } from '@/components/common/Icons';

export function MobileHeader() {
  const { t, locale } = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction(locale);
    });
  };

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
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isPending}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-slate-900 border border-slate-800 transition-colors disabled:opacity-50"
          title={t('auth.signOut')}
          aria-label={t('auth.signOut')}
        >
          <IconLogOut className="w-4 h-4" size={16} />
        </button>
      </div>
    </header>
  );
}
