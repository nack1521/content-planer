'use client';

import React from 'react';
import { useLocale } from '@/context/LocaleContext';
import { IconGlobe } from '@/components/common/Icons';

interface LocaleSwitchProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function LocaleSwitch({ variant = 'compact', className = '' }: LocaleSwitchProps) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-lg bg-[#F5E4E8]/60 border border-[#E8CCD2] ${className}`}
      role="group"
      aria-label={t('common.switchLocale')}
    >
      {variant === 'full' && (
        <span className="pl-2 pr-1 text-[#746365]">
          <IconGlobe className="w-3.5 h-3.5" size={14} />
        </span>
      )}

      <button
        type="button"
        onClick={() => setLocale('th')}
        className={`px-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
          locale === 'th'
            ? 'bg-[#A13F5B] text-white shadow-xs'
            : 'text-[#746365] hover:text-[#2D2526]'
        }`}
        aria-pressed={locale === 'th'}
      >
        TH
      </button>

      <button
        type="button"
        onClick={() => setLocale('en')}
        className={`px-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
          locale === 'en'
            ? 'bg-[#A13F5B] text-white shadow-xs'
            : 'text-[#746365] hover:text-[#2D2526]'
        }`}
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
    </div>
  );
}
