'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { PlannerFilterState, ContentItem, ContentPillar, Platform } from '@/types/planner';
import { useLocale } from '@/context/LocaleContext';
import { getLocalizedErrorMessage } from '@/utils/errors';
import { PlannerSummary } from './PlannerSummary';
import { PlannerFilters } from './PlannerFilters';
import { PlannerTable } from './PlannerTable';
import { PlannerCards } from './PlannerCards';
import { EmptyState } from './EmptyState';
import { RecordModal } from './RecordModal';
import { IconPlus } from '@/components/common/Icons';
import { getPlannerPage, sortPlannerItems, type PlannerSort, type PlannerSortKey } from '@/utils/plannerList';
import {
  getContentItemsAction,
  getContentPillarsAction,
  createContentItemAction,
  updateContentItemAction,
  deleteContentItemAction,
  duplicateContentItemAction,
  archiveContentItemAction,
  ContentItemInput,
} from '@/app/actions/content';

interface PlannerViewProps {
  initialItems?: ContentItem[];
  initialPillars?: ContentPillar[];
  initialError?: string | null;
}

export function PlannerView({ initialItems, initialPillars, initialError }: PlannerViewProps) {
  const { t, locale } = useLocale();

  const [items, setItems] = useState<ContentItem[]>(initialItems ?? []);
  const [pillars, setPillars] = useState<ContentPillar[]>(initialPillars ?? []);
  const [fetchError, setFetchError] = useState<string | null>(initialError ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialItems && !initialError);

  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sort, setSort] = useState<PlannerSort | null>(null);
  const [requestedPage, setRequestedPage] = useState(1);
  const resultsRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [itemsRes, pillarsRes] = await Promise.all([
        getContentItemsAction(),
        getContentPillarsAction(),
      ]);
      if (itemsRes.error || pillarsRes.error) {
        setFetchError(itemsRes.error || pillarsRes.error || 'failed_to_load');
      } else {
        setItems(itemsRes.items);
        setPillars(pillarsRes.pillars);
        setFetchError(null);
      }
    } catch {
      setFetchError('service_error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (initialItems === undefined && !initialError) {
      Promise.all([getContentItemsAction(), getContentPillarsAction()]).then(
        ([itemsRes, pillarsRes]) => {
          if (!isMounted) return;
          if (itemsRes.error || pillarsRes.error) {
            setFetchError(itemsRes.error || pillarsRes.error || 'failed_to_load');
          } else {
            setItems(itemsRes.items);
            setPillars(pillarsRes.pillars);
            setFetchError(null);
          }
          setIsLoading(false);
        }
      );
    }
    return () => {
      isMounted = false;
    };
  }, [initialItems, initialError]);

  // Filters State
  const [filters, setFilters] = useState<PlannerFilterState>({
    search: '',
    platform: 'all',
    status: 'all',
    pillarId: 'all',
    format: 'all',
    goal: 'all',
  });

  const handleFilterChange = (newFilters: Partial<PlannerFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setRequestedPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      platform: 'all',
      status: 'all',
      pillarId: 'all',
      format: 'all',
      goal: 'all',
    });
    setRequestedPage(1);
  };

  const handleSort = (key: PlannerSortKey) => {
    setSort((current) => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
    setRequestedPage(1);
  };

  const handlePageChange = (page: number) => {
    setRequestedPage(page);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Search Query
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchHook = item.hook?.toLowerCase().includes(query) || false;
        const matchCaption = item.caption?.toLowerCase().includes(query) || false;
        const matchHashtags = item.hashtags?.some((h) => h.toLowerCase().includes(query)) || false;
        const matchObjective = item.objective?.toLowerCase().includes(query) || false;
        const matchSourceNumber = item.source_number ? String(item.source_number).includes(query) : false;
        if (!matchTitle && !matchHook && !matchCaption && !matchHashtags && !matchObjective && !matchSourceNumber) {
          return false;
        }
      }

      // 2. Platform Filter
      if (filters.platform !== 'all') {
        if (!item.platforms.includes(filters.platform as Platform)) {
          return false;
        }
      }

      // 3. Workflow Status Filter
      if (filters.status !== 'all') {
        if (item.status !== filters.status) {
          return false;
        }
      }

      // 4. Content Pillar Filter
      if (filters.pillarId !== 'all') {
        if (item.content_pillar_id !== filters.pillarId) {
          return false;
        }
      }

      // 5. Format Filter
      if (filters.format !== 'all') {
        if (item.format !== filters.format) {
          return false;
        }
      }

      // 6. Goal Filter
      if (filters.goal !== 'all') {
        if (item.goal !== filters.goal) {
          return false;
        }
      }

      return true;
    });
  }, [items, filters]);

  const sortedItems = useMemo(() => sortPlannerItems(filteredItems, sort, locale), [filteredItems, sort, locale]);
  const pageData = getPlannerPage(sortedItems, requestedPage);

  const handleOpenCreate = () => {
    setSelectedItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: ContentItem) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedItem(null);
  };

  const handleSaveItem = async (data: ContentItemInput) => {
    if (selectedItem) {
      const res = await updateContentItemAction(selectedItem.id, data);
      if (!res.success) throw new Error(res.error || "save_failed");
    } else {
      const res = await createContentItemAction(data);
      if (!res.success) throw new Error(res.error || "save_failed");
    }
    await loadData();
  };

  const handleDeleteItem = async (id: string) => {
    const res = await deleteContentItemAction(id);
    if (!res.success) throw new Error(res.error || "save_failed");
    await loadData();
  };

  const handleDuplicateItem = async (id: string) => {
    const prefix = t("recordModal.duplicatePrefix");
    const res = await duplicateContentItemAction(id, locale, prefix);
    if (!res.success) throw new Error(res.error || "save_failed");
    await loadData();
  };

  const handleToggleArchiveItem = async (id: string, archive: boolean) => {
    const res = await archiveContentItemAction(id, archive);
    if (!res.success) throw new Error(res.error || "save_failed");
    await loadData();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t('nav.planner')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {t('planner.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" size={16} />
          <span>{t('planner.createPost')}</span>
        </button>
      </div>

      {/* KPI Overview Strip */}
      <PlannerSummary
        items={items}
        activeStatusFilter={filters.status}
        onSelectStatusFilter={(st) => handleFilterChange({ status: st })}
      />

      {/* Filters Bar */}
      <PlannerFilters
        filters={filters}
        pillars={pillars}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        totalCount={items.length}
        filteredCount={filteredItems.length}
      />

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
          {t('planner.loading')}
        </div>
      ) : fetchError ? (
        <div className="py-12 px-6 text-center bg-white rounded-xl border border-rose-200 shadow-sm max-w-lg mx-auto my-8 space-y-3">
          <p className="text-sm font-semibold text-rose-600">
            {getLocalizedErrorMessage(t, fetchError)}
          </p>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
          >
            {t('recordModal.retry')}
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState type="total" onResetFilters={handleOpenCreate} />
      ) : filteredItems.length === 0 ? (
        <EmptyState type="filtered" onResetFilters={handleResetFilters} />
      ) : (
        <div ref={resultsRef} className="space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-600 px-1">
            <span>
              {t('planner.pageRange', { start: pageData.start, end: pageData.end, total: filteredItems.length })}
            </span>
          </div>

          <div className="hidden lg:block">
            <PlannerTable items={pageData.items} onSelectItem={handleOpenEdit} sort={sort} onSort={handleSort} />
          </div>

          <div className="block lg:hidden">
            <div className="flex items-end gap-2 mb-3">
              <div className="flex-1">
                <label htmlFor="planner-mobile-sort" className="block text-sm font-semibold text-slate-700 mb-1">
                  {t('table.sortLabel')}
                </label>
                <select
                  id="planner-mobile-sort"
                  value={sort?.key ?? 'default'}
                  onChange={(event) => {
                    const key = event.target.value;
                    setSort(key === 'default' ? null : { key: key as PlannerSortKey, direction: 'asc' });
                    setRequestedPage(1);
                  }}
                  className="w-full min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-purple-600"
                >
                  <option value="default">{t('table.defaultOrder')}</option>
                  <option value="title">{t('table.headerTitle')}</option>
                  <option value="platform">{t('table.headerPlatform')}</option>
                  <option value="pillar">{t('table.headerPillar')}</option>
                  <option value="formatGoal">{t('table.headerFormatGoal')}</option>
                  <option value="schedule">{t('table.headerSchedule')}</option>
                  <option value="status">{t('table.headerStatus')}</option>
                  <option value="progress">{t('table.headerProgress')}</option>
                </select>
              </div>
              <button
                type="button"
                disabled={!sort}
                onClick={() => sort && handleSort(sort.key)}
                aria-label={t('table.reverseSort')}
                className="min-h-10 min-w-10 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-purple-600 cursor-pointer disabled:cursor-not-allowed"
              >
                <span aria-hidden="true">{sort?.direction === 'desc' ? '↓' : '↑'}</span>
              </button>
            </div>
            <PlannerCards items={pageData.items} onSelectItem={handleOpenEdit} />
          </div>

          {pageData.totalPages > 1 && (
            <nav aria-label={t('planner.pagination')} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <span aria-live="polite" className="text-sm text-slate-600">
                {t('planner.pageOf', { page: pageData.page, totalPages: pageData.totalPages })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pageData.page === 1}
                  onClick={() => handlePageChange(pageData.page - 1)}
                  className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-purple-600 cursor-pointer disabled:cursor-not-allowed"
                >
                  {t('planner.previousPage')}
                </button>
                <button
                  type="button"
                  disabled={pageData.page === pageData.totalPages}
                  onClick={() => handlePageChange(pageData.page + 1)}
                  className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-purple-600 cursor-pointer disabled:cursor-not-allowed"
                >
                  {t('planner.nextPage')}
                </button>
              </div>
            </nav>
          )}
        </div>
      )}

      {/* Record Creation / Editing Modal */}
      <RecordModal
        isOpen={modalOpen}
        item={selectedItem}
        pillars={pillars}
        onClose={handleCloseModal}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
        onDuplicate={handleDuplicateItem}
        onToggleArchive={handleToggleArchiveItem}
      />
    </div>
  );
}
