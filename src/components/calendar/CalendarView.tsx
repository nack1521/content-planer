'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ContentItem, ContentPillar } from '@/types/planner';
import { useLocale } from '@/context/LocaleContext';
import { getLocalizedErrorMessage } from '@/utils/errors';
import {
  getCurrentBangkokYearMonth,
  getCurrentBangkokDate,
  getPreviousMonth,
  getNextMonth,
  getMonthGrid,
  getCalendarPreviewItems,
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
  const [selectedDate, setSelectedDate] = useState<string>(() => getCurrentBangkokDate());

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
    const previous = getPreviousMonth(yearMonth.year, yearMonth.month);
    setYearMonth(previous);
    setSelectedDate(`${previous.year}-${String(previous.month).padStart(2, '0')}-01`);
  };

  const handleNextMonth = () => {
    const next = getNextMonth(yearMonth.year, yearMonth.month);
    setYearMonth(next);
    setSelectedDate(`${next.year}-${String(next.month).padStart(2, '0')}-01`);
  };

  const handleToday = () => {
    const currentYearMonth = getCurrentBangkokYearMonth();
    setYearMonth(currentYearMonth);
    setSelectedDate(getCurrentBangkokDate());
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

  const selectedDayItems = useMemo(() => {
    return groupedContent.get(selectedDate) || [];
  }, [groupedContent, selectedDate]);

  const selectedDayLabel = useMemo(() => {
    return formatBangkokDate(`${selectedDate}T12:00:00+07:00`, false, locale);
  }, [selectedDate, locale]);

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
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#A13F5B] hover:bg-[#8D324C] active:bg-[#78283E] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" size={16} />
          <span>{t('calendar.createPost')}</span>
        </button>
      </div>

      {/* Calendar Navigation Toolbar */}
      <div className="flex flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="order-2 sm:order-1 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label={t('calendar.previousMonth')}
              className="min-h-10 min-w-10 p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors cursor-pointer"
            >
              <IconChevronLeft className="w-4 h-4" size={16} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label={t('calendar.nextMonth')}
              className="min-h-10 min-w-10 p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors cursor-pointer"
            >
              <IconChevronRight className="w-4 h-4" size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleToday}
            className="min-h-10 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            {t('calendar.today')}
          </button>
        </div>

        <div className="order-1 min-w-0 text-left sm:order-2 sm:text-right">
          <h2 className="text-xl sm:text-lg font-bold tracking-tight text-slate-900">
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
          {/* Desktop Empty Message & Create Post Action when 0 items scheduled */}
          {totalScheduledInMonth === 0 && (
            <div className="hidden md:flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#F5E4E8] text-[#A13F5B] flex items-center justify-center border border-[#E8CCD2] shrink-0">
                  <IconCalendar className="w-5 h-5" size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {t('calendar.noScheduledContent')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t('calendar.noScheduledContentDesc')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#A13F5B] hover:bg-[#8D324C] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <IconPlus className="w-3.5 h-3.5" size={14} />
                <span>{t('calendar.createPost')}</span>
              </button>
            </div>
          )}

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
                        className={"text-xs font-semibold inline-flex items-center justify-center " + (cell.isToday ? "w-6 h-6 rounded-full bg-[#A13F5B] text-white shadow-xs font-bold" : (cell.isCurrentMonth ? "text-slate-800" : "text-slate-400"))}
                      >
                        {cell.dayNumber}
                      </span>
                      {dayItems.length > 0 && cell.isCurrentMonth && (
                        <span className="text-[10px] font-bold text-[#A13F5B] bg-[#F5E4E8] px-1.5 py-0.5 rounded-full">
                          {dayItems.length}
                        </span>
                      )}
                    </div>

                    {/* Content Items in cell */}
                    <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[120px]">
                      {cell.isCurrentMonth &&
                        dayItems.map((item) => {
                          const { time } = utcToBangkokParts(item.publish_at);
                          const platformList = item.platforms.map((p) => t("platform." + p)).join(", ");
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              aria-label={t("calendar.viewPost", { title: item.title }) + (platformList ? " - " + platformList : "")}
                              className="w-full text-left p-1.5 bg-white hover:bg-[#F5E4E8]/60 border border-slate-200 hover:border-[#E8CCD2] rounded-lg shadow-2xs transition-all cursor-pointer group"
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <div className="flex items-center gap-0.5 flex-wrap">
                                  {item.platforms.map((p) => (
                                    <PlatformBadge key={p} platform={p} showLabel={false} />
                                  ))}
                                </div>
                                {item.publish_time_known && time ? (
                                  <span className="text-[10px] font-mono text-slate-500 group-hover:text-[#A13F5B]">
                                    {time}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-slate-400 font-medium">
                                    {t('calendar.dateOnly')}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-slate-800 line-clamp-1 group-hover:text-[#8D324C]">
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

          {/* Mobile iOS-inspired month grid and selected-day agenda */}
          <div className="block md:hidden space-y-4">
            <section aria-label={t('calendar.monthView')} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div role="grid" aria-label={monthYearTitle} className="text-center">
                <div role="row" className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 py-2">
                  {weekdayLabels.map((lbl, idx) => (
                    <div
                      key={idx}
                      role="columnheader"
                      className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide"
                    >
                      {lbl}
                    </div>
                  ))}
                </div>

                {Array.from({ length: Math.ceil(gridDays.length / 7) }, (_, weekIndex) => (
                  <div key={weekIndex} role="row" className="grid grid-cols-7 divide-x divide-slate-100 border-b border-slate-100 last:border-b-0">
                    {gridDays.slice(weekIndex * 7, weekIndex * 7 + 7).map((cell) => {
                      const dayItems = cell.isCurrentMonth ? groupedContent.get(cell.dateString) || [] : [];
                      const preview = getCalendarPreviewItems(dayItems, 2);
                      const dayLabel = formatBangkokDate(`${cell.dateString}T12:00:00+07:00`, false, locale);
                      const isSelected = selectedDate === cell.dateString;

                      return (
                        <div key={cell.dateString} role="gridcell" aria-selected={isSelected} className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setSelectedDate(cell.dateString)}
                            disabled={!cell.isCurrentMonth}
                            aria-label={t('calendar.selectDate', { date: dayLabel }) + (dayItems.length ? `, ${dayItems.length} ${t('calendar.scheduledBadge')}` : '')}
                            aria-pressed={selectedDate === cell.dateString}
                            aria-current={cell.isToday ? 'date' : undefined}
                            className={`flex min-h-[78px] w-full min-w-0 flex-col items-center gap-1 px-0.5 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#A13F5B] disabled:cursor-default disabled:opacity-35 ${isSelected ? 'bg-[#F5E4E8]' : 'bg-white hover:bg-slate-50'}`}
                          >
                            <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${isSelected ? 'bg-[#A13F5B] text-white shadow-xs' : cell.isToday ? 'bg-[#F5E4E8] text-[#A13F5B]' : 'text-slate-800'}`}>
                              {cell.dayNumber}
                            </span>
                            <span className="flex w-full min-w-0 flex-col items-stretch gap-0.5 overflow-hidden">
                              {preview.items.map((item) => (
                                <span key={item.id} aria-hidden="true" className="block truncate rounded-sm border-l-2 border-[#A13F5B] bg-[#F5E4E8] px-0.5 text-[8px] leading-3 text-[#A13F5B]">
                                  {item.title}
                                </span>
                              ))}
                              {preview.remainingCount > 0 && (
                                <span aria-hidden="true" className="block truncate px-0.5 text-[8px] leading-3 font-semibold text-slate-500">
                                  {t('calendar.morePosts', { count: preview.remainingCount })}
                                </span>
                              )}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>

            <section aria-live="polite" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                <h3 className="min-w-0 text-sm font-bold text-slate-900">
                  {t('calendar.selectedDay', { date: selectedDayLabel })}
                </h3>
                <span className="shrink-0 text-[11px] font-semibold text-[#A13F5B] bg-[#F5E4E8] px-2 py-0.5 rounded-full">
                  {selectedDayItems.length}
                </span>
              </header>

              {selectedDayItems.length === 0 ? (
                <div className="px-4 py-7 text-center space-y-3">
                  <p className="text-sm text-slate-500">{t('calendar.noItemsOnDay')}</p>
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-[#A13F5B] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#8D324C] focus-visible:outline-2 focus-visible:outline-[#A13F5B] cursor-pointer"
                  >
                    <IconPlus className="w-3.5 h-3.5" size={14} />
                    <span>{t('calendar.createPost')}</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {selectedDayItems.map((item) => {
                    const { time } = utcToBangkokParts(item.publish_at);
                    const platformList = item.platforms.map((p) => t("platform." + p)).join(", ");
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        aria-label={t("calendar.viewPost", { title: item.title }) + (platformList ? " - " + platformList : "")}
                        className="block w-full text-left p-3.5 transition-colors hover:bg-[#F5E4E8]/40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#A13F5B] cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1 space-y-1">
                            <h4 className="text-sm font-semibold leading-snug text-slate-900">
                              {item.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {item.platforms.map((p) => (
                                <PlatformBadge key={p} platform={p} showLabel />
                              ))}
                              <StatusBadge status={item.status} size="sm" />
                              {item.pillar && <PillarBadge pillar={item.pillar} />}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            {item.publish_time_known && time ? (
                              <span className="rounded-md border border-[#E8CCD2] bg-[#F5E4E8] px-2 py-1 text-xs font-mono font-semibold text-[#A13F5B]">
                                {time}
                              </span>
                            ) : (
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                                {t('calendar.dateOnly')}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
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
