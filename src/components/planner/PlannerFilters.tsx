import React from 'react';
import {
  PlannerFilterState,
  Platform,
  WorkflowStatus,
  ContentFormat,
  ContentGoal,
  ContentPillar,
} from '@/types/planner';
import { useLocale } from '@/context/LocaleContext';
import { IconSearch, IconX } from '@/components/common/Icons';

interface PlannerFiltersProps {
  filters: PlannerFilterState;
  onFilterChange: (newFilters: Partial<PlannerFilterState>) => void;
  onResetFilters: () => void;
  totalCount: number;
  filteredCount: number;
  pillars: ContentPillar[];
}

const PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook', 'x'];

const STATUSES: WorkflowStatus[] = [
  'idea',
  'researching',
  'scripting',
  'recording',
  'editing',
  'reviewing',
  'scheduled',
  'published',
];

const FORMATS: ContentFormat[] = ['short', 'carousel', 'long', 'infographic', 'story'];

const GOALS: ContentGoal[] = ['awareness', 'engagement', 'growth', 'leads', 'conversion'];

export function PlannerFilters({
  filters,
  onFilterChange,
  onResetFilters,
  totalCount,
  filteredCount,
  pillars,
}: PlannerFiltersProps) {
  const { t, locale } = useLocale();

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.platform !== 'all' ||
    filters.status !== 'all' ||
    filters.pillarId !== 'all' ||
    filters.format !== 'all' ||
    filters.goal !== 'all';

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
      {/* Search Input and Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <IconSearch className="w-4 h-4" size={16} />
          </div>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder={t('filters.searchPlaceholder')}
            aria-label={t('filters.searchAriaLabel')}
            className="w-full pl-10 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: '' })}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label={t('common.cancel')}
            >
              <IconX className="w-4 h-4" size={16} />
            </button>
          )}
        </div>

        {/* Filter result counter & Reset button */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
          <span className="font-mono text-slate-500 font-medium">
            {t('filters.filterSummary', { count: filteredCount, total: totalCount })}
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md font-medium transition-colors cursor-pointer"
            >
              <IconX className="w-3 h-3" size={12} />
              <span>{t('filters.reset')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Dropdowns Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
        {/* Platform Filter */}
        <div className="space-y-1">
          <label htmlFor="filter-platform" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t('filters.platformLabel')}
          </label>
          <select
            id="filter-platform"
            value={filters.platform}
            onChange={(e) => onFilterChange({ platform: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
          >
            <option value="all">{t('filters.allPlatforms')}</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {t(`platform.${p}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="space-y-1">
          <label htmlFor="filter-status" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t('filters.statusLabel')}
          </label>
          <select
            id="filter-status"
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
          >
            <option value="all">{t('filters.allStatuses')}</option>
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                {t(`status.${st}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Pillar Filter */}
        <div className="space-y-1">
          <label htmlFor="filter-pillar" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t('filters.pillarLabel')}
          </label>
          <select
            id="filter-pillar"
            value={filters.pillarId}
            onChange={(e) => onFilterChange({ pillarId: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
          >
            <option value="all">{t('filters.allPillars')}</option>
            {pillars.map((pil) => (
              <option key={pil.id} value={pil.id}>
                {locale === 'th' ? pil.name_th : pil.name_en}
              </option>
            ))}
          </select>
        </div>

        {/* Format Filter */}
        <div className="space-y-1">
          <label htmlFor="filter-format" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t('filters.formatLabel')}
          </label>
          <select
            id="filter-format"
            value={filters.format}
            onChange={(e) => onFilterChange({ format: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
          >
            <option value="all">{t('filters.allFormats')}</option>
            {FORMATS.map((fmt) => (
              <option key={fmt} value={fmt}>
                {t(`format.${fmt}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Goal Filter */}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label htmlFor="filter-goal" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t('filters.goalLabel')}
          </label>
          <select
            id="filter-goal"
            value={filters.goal}
            onChange={(e) => onFilterChange({ goal: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
          >
            <option value="all">{t('filters.allGoals')}</option>
            {GOALS.map((g) => (
              <option key={g} value={g}>
                {t(`goal.${g}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
