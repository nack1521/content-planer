import React from 'react';
import { useLocale } from '@/context/LocaleContext';

export function SkeletonLoader() {
  const { t } = useLocale();

  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between pb-2">
        <div className="h-4 bg-slate-200 rounded w-48" />
        <span className="text-xs text-slate-400 font-medium">
          {t('loading.loadingData')}
        </span>
      </div>

      {/* Table Skeleton (Desktop) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4 grid grid-cols-12 gap-4">
          <div className="col-span-4 h-4 bg-slate-200 rounded" />
          <div className="col-span-2 h-4 bg-slate-200 rounded" />
          <div className="col-span-2 h-4 bg-slate-200 rounded" />
          <div className="col-span-2 h-4 bg-slate-200 rounded" />
          <div className="col-span-2 h-4 bg-slate-200 rounded" />
        </div>
        {[1, 2, 3, 4, 5].map((idx) => (
          <div
            key={idx}
            className="p-4 border-b border-slate-100 grid grid-cols-12 gap-4 items-center"
          >
            <div className="col-span-4 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-4/5" />
              <div className="h-3 bg-slate-100 rounded w-3/5" />
            </div>
            <div className="col-span-2 flex gap-1.5">
              <div className="w-6 h-6 bg-slate-200 rounded" />
              <div className="w-6 h-6 bg-slate-200 rounded" />
            </div>
            <div className="col-span-2">
              <div className="h-6 bg-slate-100 rounded-full w-24" />
            </div>
            <div className="col-span-2 space-y-1">
              <div className="h-4 bg-slate-200 rounded w-20" />
              <div className="h-3 bg-slate-100 rounded w-16" />
            </div>
            <div className="col-span-2 flex items-center justify-between">
              <div className="h-5 bg-slate-200 rounded-full w-20" />
              <div className="w-6 h-6 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Card Skeleton (Mobile) */}
      <div className="md:hidden space-y-3">
        {[1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3"
          >
            <div className="flex justify-between items-start">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="w-5 h-5 bg-slate-200 rounded" />
            </div>
            <div className="h-3 bg-slate-100 rounded w-5/6" />
            <div className="flex gap-2">
              <div className="h-5 bg-slate-100 rounded-full w-16" />
              <div className="h-5 bg-slate-100 rounded-full w-20" />
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <div className="h-3 bg-slate-200 rounded w-24" />
              <div className="h-3 bg-slate-200 rounded w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
