import React from 'react';
import { useLocale } from '@/context/LocaleContext';
import { IconSearch, IconSparkles } from '@/components/common/Icons';

interface EmptyStateProps {
  type: 'filtered' | 'total';
  onResetFilters?: () => void;
}

export function EmptyState({ type, onResetFilters }: EmptyStateProps) {
  const { t } = useLocale();

  if (type === 'filtered') {
    return (
      <div className="py-16 px-6 text-center bg-white rounded-xl border border-[#F0E6E3] shadow-sm max-w-lg mx-auto my-8">
        <div className="w-12 h-12 rounded-full bg-[#F5E4E8] text-[#A13F5B] flex items-center justify-center mx-auto mb-4 border border-[#E8CCD2]">
          <IconSearch className="w-6 h-6" size={24} />
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          {t('empty.filteredTitle')}
        </h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          {t('empty.filteredDescription')}
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#A13F5B] bg-[#F5E4E8] hover:bg-[#EED8DC] rounded-lg border border-[#E8CCD2] transition-colors cursor-pointer"
          >
            {t('empty.resetFilterBtn')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="py-16 px-6 text-center bg-white rounded-xl border border-[#F0E6E3] shadow-sm max-w-lg mx-auto my-8">
      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-4 border border-slate-200">
        <IconSparkles className="w-6 h-6" size={24} />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">
        {t('empty.noContentTitle')}
      </h3>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        {t('empty.noContentDescription')}
      </p>
      <button
        type="button"
        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-[#A13F5B] hover:bg-[#8D324C] rounded-lg shadow-sm transition-colors cursor-pointer"
      >
        {t('empty.createBtn')}
      </button>
    </div>
  );
}
