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
      className={`inline-flex items-center p-0.5 rounded-lg bg-slate-800/80 border border-slate-700/60 ${className}`}
      role="group"
      aria-label={t('common.switchLocale')}
    >
      {variant === 'full' && (
        <span className="pl-2 pr-1 text-slate-400">
          <IconGlobe className="w-3.5 h-3.5" size={14} />
        </span>
      )}

      <button
        type="button"
        onClick={() => setLocale('th')}
        className={`px-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
          locale === 'th'
            ? 'bg-purple-600 text-white shadow-xs'
            : 'text-slate-400 hover:text-white'
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
            ? 'bg-purple-600 text-white shadow-xs'
            : 'text-slate-400 hover:text-white'
        }`}
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
    </div>
  );
}
