'use client';

import React from 'react';
import { useLocale } from '@/context/LocaleContext';

export type PageLoadingVariant = 'planner' | 'tasks' | 'calendar' | 'ideas' | 'settings';

interface PageLoadingProps {
  variant?: PageLoadingVariant;
}

export function PageLoading({ variant = 'planner' }: PageLoadingProps) {
  const { t } = useLocale();

  let message = t('app.loading');
  if (variant === 'planner') {
    message = t('loading.loadingData');
  } else if (variant === 'tasks') {
    message = t('tasks.loading');
  } else if (variant === 'calendar') {
    message = t('calendar.loading');
  } else if (variant === 'ideas') {
    message = t('ideas.loading');
  } else if (variant === 'settings') {
    message = t('settings.loading');
  }

  return (
    <div className="space-y-5 animate-pulse" aria-busy="true">
      {/* Screen reader announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        <span>{message}</span>
      </div>

      {/* Visual status feedback strip */}
      <div className="flex items-center gap-2.5 py-1 text-[#746365] text-xs font-medium select-none" aria-hidden="true">
        <svg
          className="animate-spin h-4 w-4 text-[#A13F5B] shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>{message}</span>
      </div>

      {/* Variant-specific skeletons */}
      {variant === 'planner' && (
        <div className="space-y-5" aria-hidden="true">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-4 space-y-2 shadow-xs">
                <div className="h-3 w-20 bg-slate-200 rounded" />
                <div className="h-7 w-14 bg-slate-200 rounded" />
              </div>
            ))}
          </div>

          {/* Filters Bar Skeleton */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="h-9 w-64 max-w-full bg-slate-100 rounded-lg" />
            <div className="flex items-center gap-2">
              <div className="h-9 w-24 bg-slate-100 rounded-lg" />
              <div className="h-9 w-24 bg-slate-100 rounded-lg" />
              <div className="h-9 w-28 bg-[#F5E4E8] rounded-lg" />
            </div>
          </div>

          {/* Table / Cards Surface Skeleton */}
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-4 w-20 bg-slate-100 rounded" />
            </div>
            <div className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="h-4 w-2/3 bg-slate-200 rounded" />
                    <div className="h-3 w-1/3 bg-slate-100 rounded" />
                  </div>
                  <div className="h-6 w-16 bg-slate-100 rounded-full" />
                  <div className="h-6 w-20 bg-slate-100 rounded-full hidden sm:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {variant === 'tasks' && (
        <div className="space-y-5" aria-hidden="true">
          {/* Header & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="h-6 w-36 bg-slate-200 rounded" />
              <div className="h-3.5 w-52 bg-slate-100 rounded" />
            </div>
            <div className="h-9 w-32 bg-[#F5E4E8] rounded-lg" />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-20 bg-slate-200 rounded-lg shrink-0" />
            ))}
          </div>

          {/* Tasks Table Surface */}
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs divide-y divide-slate-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <div className="h-5 w-5 bg-slate-200 rounded shrink-0" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="h-4 w-3/5 bg-slate-200 rounded" />
                  <div className="h-3 w-2/5 bg-slate-100 rounded" />
                </div>
                <div className="h-6 w-16 bg-slate-100 rounded-md shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {variant === 'calendar' && (
        <div className="space-y-5" aria-hidden="true">
          {/* Month Header Skeleton */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="h-6 w-40 bg-slate-200 rounded" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-slate-100 rounded-lg" />
              <div className="h-8 w-8 bg-slate-100 rounded-lg" />
            </div>
          </div>

          {/* Month Grid Skeleton */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-2 shadow-xs">
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="h-5 bg-slate-100 rounded text-center" />
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-16 sm:h-24 bg-slate-50 border border-slate-100 rounded-lg p-1.5 space-y-1">
                  <div className="h-3 w-4 bg-slate-200 rounded" />
                  {i % 4 === 0 && <div className="h-2.5 w-full bg-[#F5E4E8] rounded" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {variant === 'ideas' && (
        <div className="space-y-6" aria-hidden="true">
          {/* Header */}
          <div className="space-y-1">
            <div className="h-6 w-36 bg-slate-200 rounded" />
            <div className="h-3.5 w-60 bg-slate-100 rounded" />
          </div>

          {/* Quick Capture Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 space-y-3 shadow-xs">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
          </div>

          {/* Ideas Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-4 space-y-2.5 shadow-xs">
                <div className="h-4 w-3/4 bg-slate-200 rounded" />
                <div className="h-3 w-full bg-slate-100 rounded" />
                <div className="h-3 w-1/2 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      )}

      {variant === 'settings' && (
        <div className="max-w-xl mx-auto space-y-6" aria-hidden="true">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-[#F5E4E8] border border-[#E8CCD2]" />
              <div className="space-y-1.5 flex-1">
                <div className="h-5 w-28 bg-slate-200 rounded" />
                <div className="h-3 w-48 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2 p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <div className="h-4 w-28 bg-slate-200 rounded" />
                  <div className="h-3 w-48 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
