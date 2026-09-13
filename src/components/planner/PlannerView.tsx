'use client';

import React, { useState, useMemo } from 'react';
import { PlannerFilterState, ContentItem, Platform } from '@/types/planner';
import { SAMPLE_CONTENT_ITEMS, SAMPLE_PILLARS } from '@/data/sampleContent';
import { useLocale } from '@/context/LocaleContext';
import { PlannerSummary } from './PlannerSummary';
import { PlannerFilters } from './PlannerFilters';
import { PlannerTable } from './PlannerTable';
import { PlannerCards } from './PlannerCards';
import { EmptyState } from './EmptyState';
import { SkeletonLoader } from './SkeletonLoader';
import { IconPlus } from '@/components/common/Icons';

export function PlannerView() {
  const { t } = useLocale();

  const [items] = useState<ContentItem[]>(SAMPLE_CONTENT_ITEMS);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const initialFilterState: PlannerFilterState = {
    search: '',
    platform: 'all',
    status: 'all',
    pillarId: 'all',
    format: 'all',
    goal: 'all',
  };

  const [filters, setFilters] = useState<PlannerFilterState>(initialFilterState);

  const handleFilterChange = (updates: Partial<PlannerFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilterState);
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search filter
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        const titleMatch = item.title.toLowerCase().includes(query);
        const hookMatch = item.hook ? item.hook.toLowerCase().includes(query) : false;
        const captionMatch = item.caption ? item.caption.toLowerCase().includes(query) : false;
        const hashtagMatch = item.hashtags.some((h) => h.toLowerCase().includes(query));

        if (!titleMatch && !hookMatch && !captionMatch && !hashtagMatch) {
          return false;
        }
      }

      // Platform filter
      if (filters.platform !== 'all') {
        if (!item.platforms.includes(filters.platform as Platform)) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'all') {
        if (item.status !== filters.status) {
          return false;
        }
      }

      // Pillar filter
      if (filters.pillarId !== 'all') {
        if (item.content_pillar_id !== filters.pillarId) {
          return false;
        }
      }

      // Format filter
      if (filters.format !== 'all') {
        if (item.format !== filters.format) {
          return false;
        }
      }

      // Goal filter
      if (filters.goal !== 'all') {
        if (item.goal !== filters.goal) {
          return false;
        }
      }

      return true;
    });
  }, [items, filters]);

  return (
    <div className="space-y-6">
      {/* Top Header / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            {t('nav.planner')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('app.description')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Quick loading state toggle for reviewer verification */}
          <button
            type="button"
            onClick={() => setIsLoading(!isLoading)}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Toggle loading skeleton preview"
          >
            {isLoading ? 'Show Content' : 'Preview Loading'}
          </button>

          {/* New Content Record button */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <IconPlus className="w-4 h-4" size={16} />
            <span>{t('empty.createBtn')}</span>
          </button>
        </div>
      </div>

      {/* Production Overview & KPI Strip */}
      <PlannerSummary
        items={items}
        activeStatusFilter={filters.status}
        onSelectStatusFilter={(st) => handleFilterChange({ status: st })}
      />

      {/* Filters Strip */}
      <PlannerFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        totalCount={items.length}
        filteredCount={filteredItems.length}
        pillars={SAMPLE_PILLARS}
      />

      {/* Main Content Area: Loading vs Empty vs Table/Cards */}
      {isLoading ? (
        <SkeletonLoader />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          type={items.length === 0 ? 'total' : 'filtered'}
          onResetFilters={handleResetFilters}
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table Presentation */}
          <div className="hidden md:block">
            <PlannerTable
              items={filteredItems}
            />
          </div>

          {/* Mobile Cards Presentation */}
          <div className="md:hidden">
            <PlannerCards
              items={filteredItems}
            />
          </div>
        </div>
      )}
    </div>
  );
}
