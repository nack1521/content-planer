'use client';

import React from 'react';
import { useLinkStatus } from 'next/link';
import { useLocale } from '@/context/LocaleContext';

interface NavigationPendingProps {
  variant?: 'desktop' | 'mobile';
}

export function NavigationPending({ variant = 'desktop' }: NavigationPendingProps) {
  const { pending } = useLinkStatus();
  const { t } = useLocale();

  if (variant === 'mobile') {
    return (
      <span
        aria-hidden={!pending}
        className={`absolute top-1 right-2 flex h-2 w-2 transition-opacity duration-150 ${
          pending ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C26880] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A13F5B]" />
        <span className="sr-only" role="status" aria-live="polite">
          {pending ? t('nav.navigating') : ''}
        </span>
      </span>
    );
  }

  return (
    <span
      aria-hidden={!pending}
      className={`inline-flex items-center justify-center w-4 h-4 transition-opacity duration-150 shrink-0 ${
        pending ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <svg
        className="animate-spin h-3.5 w-3.5 text-[#A13F5B]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only" role="status" aria-live="polite">
        {pending ? t('nav.navigating') : ''}
      </span>
    </span>
  );
}
