'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ContentItem, ContentPillar, ReferenceAccount } from '@/types/planner';
import { useLocale } from '@/context/LocaleContext';
import { getLocalizedErrorMessage } from '@/utils/errors';
import { formatBangkokDate } from '@/utils/timezone';
import { filterUnscheduledIdeas } from '@/utils/ideas';
import { getNextTabIndex } from '@/utils/tabs';
import { RecordModal } from '@/components/planner/RecordModal';
import { PlatformBadge } from '@/components/planner/PlatformBadge';
import { PillarBadge } from '@/components/planner/PillarBadge';
import { ReferenceAccountsView } from './ReferenceAccountsView';
import {
  IconLightbulb,
  IconPlus,
  IconSearch,
  IconX,
  IconCheck,
  IconCalendar,
} from '@/components/common/Icons';
import {
  getContentItemsAction,
  getContentPillarsAction,
  createContentItemAction,
  updateContentItemAction,
  deleteContentItemAction,
  duplicateContentItemAction,
  archiveContentItemAction,
  quickCaptureIdeaAction,
  ContentItemInput,
} from '@/app/actions/content';

interface IdeasViewProps {
  initialItems?: ContentItem[];
  initialPillars?: ContentPillar[];
  initialAccounts?: ReferenceAccount[];
  initialError?: string | null;
  initialAccountsError?: string | null;
}

export function IdeasView({
  initialItems,
  initialPillars,
  initialAccounts,
  initialError,
  initialAccountsError,
}: IdeasViewProps) {
  const { t, locale } = useLocale();

  // Active Tab: 'unscheduled' | 'referenceAccounts'
  const [activeTab, setActiveTab] = useState<'unscheduled' | 'referenceAccounts'>('unscheduled');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Content Items & Pillars State
  const [items, setItems] = useState<ContentItem[]>(initialItems ?? []);
  const [pillars, setPillars] = useState<ContentPillar[]>(initialPillars ?? []);
  const [fetchError, setFetchError] = useState<string | null>(initialError ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialItems && !initialError);

  // Quick Capture State
  const [quickTitle, setQuickTitle] = useState('');
  const [quickNotes, setQuickNotes] = useState('');
  const [showNotesField, setShowNotesField] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search State for Unscheduled Ideas
  const [searchQuery, setSearchQuery] = useState('');

  // RecordModal State
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

  // Clean up success timeout
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // Filter unscheduled ideas using pure production utility
  const unscheduledIdeas = useMemo(() => {
    return filterUnscheduledIdeas(items);
  }, [items]);

  // Filtered by search query
  const filteredIdeas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return unscheduledIdeas;
    return unscheduledIdeas.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchNotes = item.notes?.toLowerCase().includes(q) || false;
      const matchHook = item.hook?.toLowerCase().includes(q) || false;
      return matchTitle || matchNotes || matchHook;
    });
  }, [unscheduledIdeas, searchQuery]);

  // Tab Keyboard Navigation (Roving tabIndex: ArrowLeft, ArrowRight, Home, End)
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    const nextIndex = getNextTabIndex(index, 2, e.key);
    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = nextIndex === 0 ? 'unscheduled' : 'referenceAccounts';
      setActiveTab(nextTab);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  // Handle Quick Capture Submit
  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCapturing) return;

    const trimmedTitle = quickTitle.trim();
    if (!trimmedTitle) {
      setValidationError(t('ideas.validationTitleRequired'));
      return;
    }

    setIsCapturing(true);
    setCaptureError(null);
    setValidationError(null);

    try {
      const res = await quickCaptureIdeaAction({
        title: trimmedTitle,
        notes: quickNotes.trim() || null,
      });

      if (!res.success) {
        setCaptureError(res.error || 'save_failed');
        setIsCapturing(false);
        return;
      }

      // Success
      setQuickTitle('');
      setQuickNotes('');
      setShowNotesField(false);
      setCaptureSuccess(true);

      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = setTimeout(() => {
        setCaptureSuccess(false);
      }, 3500);

      await loadData();
    } catch {
      setCaptureError('service_error');
    } finally {
      setIsCapturing(false);
    }
  };

  // Modal Handlers
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
            {t('ideas.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {t('ideas.subtitle')}
          </p>
        </div>
      </div>

      {/* Accessible Tab Navigation with Roving tabIndex */}
      <div
        role="tablist"
        aria-label={t('ideas.title')}
        className="flex border-b border-slate-200 gap-6"
      >
        <button
          ref={(el) => { tabRefs.current[0] = el; }}
          id="tab-unscheduled"
          role="tab"
          type="button"
          tabIndex={activeTab === 'unscheduled' ? 0 : -1}
          aria-selected={activeTab === 'unscheduled'}
          aria-controls="tabpanel-unscheduled"
          onClick={() => setActiveTab('unscheduled')}
          onKeyDown={(e) => handleTabKeyDown(e, 0)}
          className={"pb-3 text-sm font-semibold inline-flex items-center gap-2 border-b-2 transition-colors cursor-pointer " + (activeTab === "unscheduled" ? "border-purple-600 text-purple-600" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300")}
        >
          <span>{t('ideas.tabs.unscheduled')}</span>
          <span
            className={"text-[11px] px-2 py-0.5 rounded-full font-bold " + (activeTab === "unscheduled" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600")}
          >
            {unscheduledIdeas.length}
          </span>
        </button>

        <button
          ref={(el) => { tabRefs.current[1] = el; }}
          id="tab-reference"
          role="tab"
          type="button"
          tabIndex={activeTab === 'referenceAccounts' ? 0 : -1}
          aria-selected={activeTab === 'referenceAccounts'}
          aria-controls="tabpanel-reference"
          onClick={() => setActiveTab('referenceAccounts')}
          onKeyDown={(e) => handleTabKeyDown(e, 1)}
          className={"pb-3 text-sm font-semibold inline-flex items-center gap-2 border-b-2 transition-colors cursor-pointer " + (activeTab === "referenceAccounts" ? "border-purple-600 text-purple-600" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300")}
        >
          <span>{t('ideas.tabs.referenceAccounts')}</span>
        </button>
      </div>

      {/* Tab 1: Unscheduled Ideas */}
      {activeTab === 'unscheduled' && (
        <div
          id="tabpanel-unscheduled"
          role="tabpanel"
          aria-labelledby="tab-unscheduled"
          className="space-y-6"
        >
          {/* Quick Capture Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <IconLightbulb className="w-4 h-4" size={16} />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                {t('ideas.quickCaptureTitle')}
              </h2>
            </div>

            <form onSubmit={handleQuickCapture} className="space-y-3">
              {/* Validation or Server Error (Assertive live region) */}
              {validationError && (
                <div
                  id="quick-capture-title-error"
                  role="alert"
                  aria-live="assertive"
                  className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg"
                >
                  {validationError}
                </div>
              )}
              {captureError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg"
                >
                  {getLocalizedErrorMessage(t, captureError)}
                </div>
              )}

              {/* Success Message Banner (Polite status live region) */}
              {captureSuccess && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2 animate-in fade-in duration-150"
                >
                  <IconCheck className="w-4 h-4 text-emerald-600" size={16} />
                  <span>{t('ideas.captureSuccess')}</span>
                </div>
              )}

              {/* Title Input with Explicit Accessible Label */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <label htmlFor="quick-capture-title-input" className="sr-only">
                    {t('ideas.quickCaptureTitleLabel')}
                  </label>
                  <input
                    id="quick-capture-title-input"
                    type="text"
                    value={quickTitle}
                    disabled={isCapturing}
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={validationError ? "quick-capture-title-error" : undefined}
                    onChange={(e) => {
                      setQuickTitle(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder={t('ideas.quickCapturePlaceholder')}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all disabled:opacity-60"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isCapturing}
                    onClick={() => setShowNotesField((prev) => !prev)}
                    className="px-3 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {showNotesField ? t('ideas.hideNotes') : t('ideas.addNotes')}
                  </button>

                  <button
                    id="quick-capture-submit-btn"
                    type="submit"
                    disabled={isCapturing}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <IconPlus className="w-4 h-4" size={16} />
                    <span>{isCapturing ? t('ideas.capturing') : t('ideas.captureButton')}</span>
                  </button>
                </div>
              </div>

              {/* Optional Notes Field with Explicit Accessible Label */}
              {showNotesField && (
                <div className="pt-1">
                  <label htmlFor="quick-capture-notes-textarea" className="sr-only">
                    {t('ideas.notesLabel')}
                  </label>
                  <textarea
                    id="quick-capture-notes-textarea"
                    rows={2}
                    value={quickNotes}
                    disabled={isCapturing}
                    onChange={(e) => setQuickNotes(e.target.value)}
                    placeholder={t('ideas.notesPlaceholder')}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all resize-none disabled:opacity-60"
                  />
                </div>
              )}
            </form>
          </div>

          {/* Search Bar with Explicit Accessible Label */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <label htmlFor="ideas-search-input" className="sr-only">
                {t('ideas.searchLabel')}
              </label>
              <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" size={16} />
              <input
                id="ideas-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('ideas.searchPlaceholder')}
                className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={t('ideas.clearSearch')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <IconX className="w-3.5 h-3.5" size={14} />
                </button>
              )}
            </div>

            <span className="text-xs text-slate-500 font-medium">
              {t('ideas.totalCount', { count: filteredIdeas.length })}
            </span>
          </div>

          {/* Content List Area */}
          {isLoading ? (
            <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
              {t('ideas.loading')}
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
                {t('ideas.retry')}
              </button>
            </div>
          ) : unscheduledIdeas.length === 0 ? (
            /* Empty Unscheduled Ideas State */
            <div className="py-16 px-4 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-lg mx-auto my-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-100">
                <IconLightbulb className="w-6 h-6" size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {t('ideas.emptyUnscheduled')}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {t('ideas.emptyUnscheduledDesc')}
              </p>
            </div>
          ) : filteredIdeas.length === 0 ? (
            /* No search results */
            <div className="py-12 px-4 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-md mx-auto my-6 space-y-2">
              <p className="text-sm font-semibold text-slate-800">
                {t('ideas.noSearchResults')}
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-purple-600 hover:text-purple-700 font-semibold cursor-pointer"
              >
                {t('ideas.clearSearch')}
              </button>
            </div>
          ) : (
            /* Grid of Unscheduled Ideas Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIdeas.map((idea) => {
                const createdDate = formatBangkokDate(idea.created_at, false, locale);

                return (
                  <div
                    key={idea.id}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-purple-200 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      {/* Top Badges & Meta */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {idea.platforms.map((p) => (
                            <PlatformBadge key={p} platform={p} showLabel />
                          ))}
                          {idea.pillar && <PillarBadge pillar={idea.pillar} />}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {createdDate}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-sm text-slate-900 leading-snug">
                        {idea.title}
                      </h3>

                      {/* Notes / Talking points */}
                      {idea.notes && (
                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {idea.notes}
                        </p>
                      )}
                    </div>

                    {/* Actions Strip */}
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(idea)}
                        className="text-xs text-slate-500 hover:text-purple-600 font-medium cursor-pointer"
                      >
                        {t('ideas.editIdea')}
                      </button>

                      {/* Clear "Plan this idea" action */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(idea)}
                        aria-label={t('ideas.planIdeaAria', { title: idea.title })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                      >
                        <IconCalendar className="w-3.5 h-3.5" size={14} />
                        <span>{t('ideas.planIdea')}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Reference Accounts */}
      {activeTab === 'referenceAccounts' && (
        <div
          id="tabpanel-reference"
          role="tabpanel"
          aria-labelledby="tab-reference"
        >
          <ReferenceAccountsView
            initialAccounts={initialAccounts}
            initialError={initialAccountsError}
          />
        </div>
      )}

      {/* Record Editor Modal for Planning / Editing */}
      {modalOpen && (
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
      )}
    </div>
  );
}
