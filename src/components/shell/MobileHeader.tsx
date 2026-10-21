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
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white text-[#2D2526] border-b border-[#F0E6E3] shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#8D324C] to-[#A13F5B] flex items-center justify-center text-white font-bold text-xs shadow-xs">
          CP
        </div>
        <div>
          <span className="font-bold text-sm text-[#2D2526] tracking-tight">
            {t('app.title')}
          </span>
          <span className="block text-[10px] text-[#746365] font-medium">
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
          className="p-1.5 rounded-lg text-[#746365] hover:text-[#A13F5B] hover:bg-[#F5E4E8] border border-[#E8CCD2] transition-colors disabled:opacity-50"
          title={t('auth.signOut')}
          aria-label={t('auth.signOut')}
        >
          <IconLogOut className="w-4 h-4" size={16} />
        </button>
      </div>
    </header>
  );
}
