'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ContentItem, ContentPillar } from '@/types/planner';
import { useLocale } from '@/context/LocaleContext';
import { getLocalizedErrorMessage } from '@/utils/errors';
import {
  getCurrentBangkokYearMonth,
  getPreviousMonth,
  getNextMonth,
  getMonthGrid,
  filterAndGroupCalendarContent,
  formatMonthYearHeader,
  getWeekdayLabels,
} from '@/utils/calendar';
import { utcToBangkokParts, formatBangkokDate } from '@/utils/timezone';
import { RecordModal } from '@/components/planner/RecordModal';
import { PlatformBadge } from '@/components/planner/PlatformBadge';
import { StatusBadge } from '@/components/planner/StatusBadge';
import { PillarBadge } from '@/components/planner/PillarBadge';
import {
  IconCalendar,
  IconPlus,
  IconChevronLeft,
  IconChevronRight,
} from '@/components/common/Icons';
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

interface CalendarViewProps {
  initialItems?: ContentItem[];
  initialPillars?: ContentPillar[];
  initialError?: string | null;
}

export function CalendarView({
  initialItems,
  initialPillars,
  initialError,
}: CalendarViewProps) {
  const { t, locale } = useLocale();

  const [items, setItems] = useState<ContentItem[]>(initialItems ?? []);
  const [pillars, setPillars] = useState<ContentPillar[]>(initialPillars ?? []);
  const [fetchError, setFetchError] = useState<string | null>(initialError ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialItems && !initialError);

  // Bangkok Calendar Year & Month
  const [yearMonth, setYearMonth] = useState<{ year: number; month: number }>(() =>
    getCurrentBangkokYearMonth()
  );

  // Modal State
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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

  // Calendar Navigation
  const handlePrevMonth = () => {
    setYearMonth((prev) => getPreviousMonth(prev.year, prev.month));
  };

  const handleNextMonth = () => {
    setYearMonth((prev) => getNextMonth(prev.year, prev.month));
  };

  const handleToday = () => {
    setYearMonth(getCurrentBangkokYearMonth());
  };

  // Grouped scheduled content for selected Bangkok month
  const groupedContent = useMemo(() => {
    return filterAndGroupCalendarContent(items, yearMonth.year, yearMonth.month);
  }, [items, yearMonth.year, yearMonth.month]);

  // Total scheduled items in selected month
  const totalScheduledInMonth = useMemo(() => {
    let total = 0;
    for (const list of groupedContent.values()) {
      total += list.length;
    }
    return total;
  }, [groupedContent]);

  // Desktop month grid days
  const gridDays = useMemo(() => {
    return getMonthGrid(yearMonth.year, yearMonth.month);
  }, [yearMonth.year, yearMonth.month]);

  const weekdayLabels = useMemo(() => {
    return getWeekdayLabels(locale);
  }, [locale]);

  const monthYearTitle = useMemo(() => {
    return formatMonthYearHeader(yearMonth.year, yearMonth.month, locale);
  }, [yearMonth.year, yearMonth.month, locale]);

  // Sorted list of dates with scheduled items for mobile agenda
  const scheduledDates = useMemo(() => {
    const dates = Array.from(groupedContent.keys());
    dates.sort();
    return dates;
  }, [groupedContent]);

  // Modal Handlers
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
      if (!res.success) throw new Error(res.error || 'save_failed');
    } else {
      const res = await createContentItemAction(data);
      if (!res.success) throw new Error(res.error || 'save_failed');
    }
    await loadData();
  };

  const handleDeleteItem = async (id: string) => {
    const res = await deleteContentItemAction(id);
    if (!res.success) throw new Error(res.error || 'save_failed');
    await loadData();
  };

  const handleDuplicateItem = async (id: string) => {
    const prefix = t('recordModal.duplicatePrefix');
    const res = await duplicateContentItemAction(id, locale, prefix);
    if (!res.success) throw new Error(res.error || 'save_failed');
    await loadData();
  };

  const handleToggleArchiveItem = async (id: string, archive: boolean) => {
    const res = await archiveContentItemAction(id, archive);
    if (!res.success) throw new Error(res.error || 'save_failed');
    await loadData();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t('calendar.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {t('calendar.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" size={16} />
          <span>{t('calendar.createPost')}</span>
        </button>
      </div>

      {/* Calendar Navigation Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label={t('calendar.previousMonth')}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors cursor-pointer"
            >
              <IconChevronLeft className="w-4 h-4" size={16} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label={t('calendar.nextMonth')}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors cursor-pointer"
            >
              <IconChevronRight className="w-4 h-4" size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            {t('calendar.today')}
          </button>
        </div>

        <div className="text-center sm:text-right">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {monthYearTitle}
          </h2>
          <span className="text-[11px] font-medium text-slate-400">
            {totalScheduledInMonth === 1
              ? '1 ' + t('calendar.scheduledBadge')
              : totalScheduledInMonth + ' ' + t('calendar.scheduledBadge')}
          </span>
        </div>
      </div>

      {/* Main Calendar View Area */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
          {t('calendar.loading')}
        </div>
      ) : fetchError ? (
        <div className="py-12 px-6 text-center bg-white rounded-xl border border-rose-200 shadow-sm max-w-lg mx-auto my-8 space-y-3">
          <p className="text-sm font-semibold text-rose-600">
            {getLocalizedErrorMessage(t, fetchError)}
          </p>
          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            {t('calendar.retry')}
          </button>
        </div>
      ) : (
        <>
          {/* Desktop 7-Column Month Grid */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Weekday Header Row */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center py-2.5">
              {weekdayLabels.map((lbl, idx) => (
                <div
                  key={idx}
                  className="text-xs font-bold text-slate-600 uppercase tracking-wider"
                >
                  {lbl}
                </div>
              ))}
            </div>

            {/* Day Cells Matrix */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 border-b border-slate-200">
              {gridDays.map((cell) => {
                const dayItems = groupedContent.get(cell.dateString) || [];
                return (
                  <div
                    key={cell.dateString}
                    className={"min-h-[115px] p-2 flex flex-col justify-between transition-colors " + (cell.isCurrentMonth ? "bg-white hover:bg-slate-50/40" : "bg-slate-50/50 text-slate-400")}
                  >
                    {/* Date Header in cell */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={"text-xs font-semibold inline-flex items-center justify-center " + (cell.isToday ? "w-6 h-6 rounded-full bg-purple-600 text-white shadow-xs font-bold" : (cell.isCurrentMonth ? "text-slate-800" : "text-slate-400"))}
                      >
                        {cell.dayNumber}
                      </span>
                      {dayItems.length > 0 && cell.isCurrentMonth && (
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">
                          {dayItems.length}
                        </span>
                      )}
                    </div>

                    {/* Content Items in cell */}
                    <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[120px]">
                      {cell.isCurrentMonth &&
                        dayItems.map((item) => {
                          const { time } = utcToBangkokParts(item.publish_at);
                          const primaryPlatform = item.platforms[0] || 'tiktok';
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              aria-label={t('calendar.viewPost', { title: item.title })}
                              className="w-full text-left p-1.5 bg-white hover:bg-purple-50/60 border border-slate-200 hover:border-purple-300 rounded-lg shadow-2xs transition-all cursor-pointer group"
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <PlatformBadge platform={primaryPlatform} showLabel={false} />
                                {item.publish_time_known && time ? (
                                  <span className="text-[10px] font-mono text-slate-500 group-hover:text-purple-700">
                                    {time}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-slate-400 font-medium">
                                    {t('calendar.dateOnly')}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-slate-800 line-clamp-1 group-hover:text-purple-900">
                                {item.title}
                              </p>
                              <div className="mt-1 flex items-center justify-between gap-1">
                                <StatusBadge status={item.status} size="sm" />
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Touch-Friendly Agenda Presentation */}
          <div className="block md:hidden space-y-4">
            {scheduledDates.length === 0 ? (
              <div className="py-12 px-4 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-100">
                  <IconCalendar className="w-6 h-6" size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {t('calendar.noScheduledContent')}
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  {t('calendar.noScheduledContentDesc')}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-purple-700 transition-colors cursor-pointer"
                  >
                    <IconPlus className="w-3.5 h-3.5" size={14} />
                    <span>{t('calendar.createPost')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {scheduledDates.map((dateStr) => {
                  const dayItems = groupedContent.get(dateStr) || [];
                  const sampleDate = dayItems[0]?.publish_at || dateStr;
                  const formattedDayHeader = formatBangkokDate(sampleDate, false, locale);

                  return (
                    <div
                      key={dateStr}
                      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
                    >
                      {/* Date Group Header */}
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          {formattedDayHeader}
                        </span>
                        <span className="text-[11px] font-semibold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full">
                          {dayItems.length}
                        </span>
                      </div>

                      {/* Item Cards */}
                      <div className="divide-y divide-slate-100">
                        {dayItems.map((item) => {
                          const { time } = utcToBangkokParts(item.publish_at);
                          const primaryPlatform = item.platforms[0] || 'tiktok';
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              aria-label={t('calendar.viewPost', { title: item.title })}
                              className="w-full text-left p-3.5 hover:bg-purple-50/40 transition-colors cursor-pointer block"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1 min-w-0 flex-1">
                                  <h4 className="font-semibold text-sm text-slate-900 leading-snug">
                                    {item.title}
                                  </h4>
                                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                    <PlatformBadge platform={primaryPlatform} showLabel />
                                    <StatusBadge status={item.status} size="sm" />
                                    {item.pillar && (
                                      <PillarBadge pillar={item.pillar} />
                                    )}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  {item.publish_time_known && time ? (
                                    <span className="text-xs font-mono font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded-md border border-purple-100">
                                      {time}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                      {t('calendar.dateOnly')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Record Editor Modal */}
      {modalOpen && (
        <RecordModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveItem}
          onDelete={handleDeleteItem}
          onDuplicate={handleDuplicateItem}
          onToggleArchive={handleToggleArchiveItem}
          item={selectedItem}
          pillars={pillars}
        />
      )}
    </div>
  );
}
