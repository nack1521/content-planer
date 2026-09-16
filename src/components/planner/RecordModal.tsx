'use client';

import React, { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import {
  ContentItem,
  ContentPillar,
  ContentFormat,
  ContentGoal,
  WorkflowStatus,
  Platform,
  ReviewStatus,
} from '@/types/planner';
import { ContentItemInput } from '@/app/actions/content';
import { useLocale } from '@/context/LocaleContext';
import { bangkokToUtc, utcToBangkokParts } from '@/utils/timezone';
import { getLocalizedErrorMessage } from '@/utils/errors';
import { isValidUrl } from '@/utils/validation';
import { IconPlus, IconX } from '@/components/common/Icons';
import { copyToClipboard } from '@/utils/clipboard';
import { isFormDirty, RecordFormState } from '@/utils/dirtyState';
import { moveItemUp, moveItemDown } from '@/utils/linkReorder';
import { parseHashtags } from '@/utils/hashtags';
import { executeRecordAction } from '@/utils/recordActions';
import { LinkCard, EditableLinkItem } from '@/components/planner/LinkCard';
import { TextPreview } from '@/components/planner/TextPreview';
import { DiscardConfirmDialog } from '@/components/planner/DiscardConfirmDialog';

const ALL_PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook', 'x'];
const ALL_FORMATS: ContentFormat[] = ['short', 'carousel', 'long', 'infographic', 'story', 'photo'];
const ALL_GOALS: ContentGoal[] = ['awareness', 'engagement', 'growth', 'leads', 'conversion'];
const ALL_STATUSES: WorkflowStatus[] = [
  'idea',
  'researching',
  'scripting',
  'recording',
  'editing',
  'reviewing',
  'scheduled',
  'published',
];
const ALL_REVIEW_STATUSES: ReviewStatus[] = ['in_process', 'revise', 'approved'];

interface RecordModalProps {
  isOpen: boolean;
  item?: ContentItem | null;
  pillars: ContentPillar[];
  onClose: () => void;
  onSave: (data: ContentItemInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onDuplicate?: (id: string) => Promise<void>;
  onToggleArchive?: (id: string, archive: boolean) => Promise<void>;
}

function RecordModalForm({
  item,
  pillars,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
  onToggleArchive,
}: Omit<RecordModalProps, 'isOpen'>) {
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();

  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const lastFocusedBeforeDiscardRef = useRef<HTMLElement | null>(null);
  const isSubmittedRef = useRef<boolean>(false);

  // Unsaved changes confirmation dialog state
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Copy feedback state & screen-reader live announcements
  const [copyFeedback, setCopyFeedback] = useState<{
    id: string;
    status: 'success' | 'error';
  } | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  // Initial baseline reference for dirty state tracking, evaluated once on mount
  const [initialState] = useState<RecordFormState>(() => {
    const initLinks: EditableLinkItem[] =
      item?.links && item.links.length > 0
        ? [...item.links]
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((l, idx) => ({
              clientId: l.id || `link-init-${idx}`,
              id: l.id,
              link_type: l.link_type,
              platform: l.platform,
              url: l.url,
              label: l.label,
              sort_order: l.sort_order ?? idx,
            }))
        : [];

    const bkk = utcToBangkokParts(item?.publish_at);
    return {
      title: item?.title || '',
      platforms: item?.platforms || ['tiktok'],
      pillarId: item?.content_pillar_id || '',
      format: (item?.format as ContentFormat) || '',
      goal: (item?.goal as ContentGoal) || '',
      status: item?.status || 'idea',
      progress: item?.progress ?? 0,
      publishDate: bkk.date,
      publishTime: bkk.time || '10:00',
      publishTimeKnown: item?.publish_time_known ?? (item?.publish_at ? true : false),
      hook: item?.hook || '',
      objective: item?.objective || '',
      productionDetail: item?.production_detail || '',
      cta: item?.cta || '',
      caption: item?.caption || '',
      hashtagsStr: (item?.hashtags || []).join(' '),
      reviewStatus: (item?.review_status as ReviewStatus) || '',
      notes: item?.notes || '',
      links: initLinks.map((l) => ({
        id: l.id,
        link_type: l.link_type,
        platform: l.platform,
        url: l.url,
        label: l.label,
        sort_order: l.sort_order,
      })),
    };
  });

  // Form States
  const [title, setTitle] = useState(initialState.title);
  const [platforms, setPlatforms] = useState<Platform[]>(initialState.platforms);
  const [pillarId, setPillarId] = useState<string>(initialState.pillarId);

  const [format, setFormat] = useState<ContentFormat | ''>(initialState.format);
  const [goal, setGoal] = useState<ContentGoal | ''>(initialState.goal);

  const [status, setStatus] = useState<WorkflowStatus>(initialState.status);
  const [progress, setProgress] = useState<number>(initialState.progress);

  // Date & Bangkok time handling
  const [publishDate, setPublishDate] = useState<string>(initialState.publishDate);
  const [publishTime, setPublishTime] = useState<string>(initialState.publishTime);
  const [publishTimeKnown, setPublishTimeKnown] = useState<boolean>(initialState.publishTimeKnown);

  const [hook, setHook] = useState(initialState.hook);
  const [objective, setObjective] = useState(initialState.objective);
  const [productionDetail, setProductionDetail] = useState(initialState.productionDetail);
  const [cta, setCta] = useState(initialState.cta);
  const [caption, setCaption] = useState(initialState.caption);
  const [hashtagsStr, setHashtagsStr] = useState(initialState.hashtagsStr);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | ''>(initialState.reviewStatus);
  const [notes, setNotes] = useState(initialState.notes);

  // Content Links state with stable client identities
  const [links, setLinks] = useState<EditableLinkItem[]>(() =>
    initialState.links.map((l, idx) => ({
      clientId: l.id || `link-init-${idx}`,
      id: l.id,
      link_type: l.link_type,
      platform: l.platform,
      url: l.url,
      label: l.label,
      sort_order: l.sort_order ?? idx,
    }))
  );

  const [error, setError] = useState<string | null>(null);

  const currentState: RecordFormState = {
    title,
    platforms,
    pillarId,
    format,
    goal,
    status,
    progress,
    publishDate,
    publishTime,
    publishTimeKnown,
    hook,
    objective,
    productionDetail,
    cta,
    caption,
    hashtagsStr,
    reviewStatus,
    notes,
    links: links.map((l, idx) => ({
      id: l.id,
      link_type: l.link_type,
      platform: l.platform,
      url: l.url,
      label: l.label,
      sort_order: idx,
    })),
  };

  const isDirty = isFormDirty(initialState, currentState);

  // Request close: show discard warning if dirty, otherwise close immediately
  const handleRequestClose = useCallback(() => {
    if (isSubmittedRef.current || !isDirty) {
      onClose();
    } else {
      lastFocusedBeforeDiscardRef.current = document.activeElement as HTMLElement;
      setShowDiscardConfirm(true);
    }
  }, [isDirty, onClose]);

  const handleCancelDiscard = useCallback(() => {
    const target = lastFocusedBeforeDiscardRef.current;
    setShowDiscardConfirm(false);
    // Restore focus to editor element that initiated the close attempt
    requestAnimationFrame(() => {
      if (target && typeof target.focus === 'function' && document.body.contains(target)) {
        target.focus();
      } else if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
    });
  }, []);

  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
    onClose();
  }, [onClose]);

  // Browser beforeunload listener - only attached when dirty
  useEffect(() => {
    if (!isDirty || isSubmittedRef.current) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // Initial title focus on mount & opener focus restore on unmount (strictly once)
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    titleInputRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  // Stable references for keydown listener to avoid re-binding and focus stealing
  const isDiscardOpenRef = useRef(showDiscardConfirm);
  const handleRequestCloseRef = useRef(handleRequestClose);

  useEffect(() => {
    isDiscardOpenRef.current = showDiscardConfirm;
    handleRequestCloseRef.current = handleRequestClose;
  }, [showDiscardConfirm, handleRequestClose]);

  // Modal keyboard listener & focus trap (registered once on mount)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If nested discard dialog is open, let it handle Escape and Tab exclusively
      if (isDiscardOpenRef.current) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        handleRequestCloseRef.current();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const togglePlatform = (p: Platform) => {
    setPlatforms((prev) =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter((x) => x !== p) : prev) : [...prev, p]
    );
  };

  // Link Workspace Handlers
  const handleAddLink = () => {
    setLinks((prev) => [
      ...prev,
      {
        clientId: `link-new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        link_type: 'asset',
        platform: null,
        url: '',
        label: '',
        sort_order: prev.length,
      },
    ]);
  };

  const handleRemoveLink = (clientId: string) => {
    setLinks((prev) => prev.filter((l) => l.clientId !== clientId));
  };

  const handleLinkChange = (clientId: string, field: keyof EditableLinkItem, value: unknown) => {
    setLinks((prev) =>
      prev.map((l) => (l.clientId === clientId ? { ...l, [field]: value } : l))
    );
  };

  const handleMoveUp = (index: number) => {
    setLinks((prev) => moveItemUp(prev, index));
  };

  const handleMoveDown = (index: number) => {
    setLinks((prev) => moveItemDown(prev, index));
  };

  // Safe clipboard copy handler with feedback and live region
  const handleCopy = async (id: string, text: string, fieldName: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopyFeedback({ id, status: 'success' });
      setLiveAnnouncement(t('recordModal.copyAnnouncement').replace('{field}', fieldName));
      setTimeout(() => {
        setCopyFeedback((prev) => (prev?.id === id ? null : prev));
      }, 2000);
    } else {
      setCopyFeedback({ id, status: 'error' });
      setLiveAnnouncement(t('recordModal.copyFailed'));
      setTimeout(() => {
        setCopyFeedback((prev) => (prev?.id === id ? null : prev));
      }, 2500);
    }
  };

  // Delete Action Handler with safe error catching
  const handleDelete = () => {
    if (!onDelete || !item) return;
    if (!window.confirm(t('recordModal.confirmDelete'))) return;

    setError(null);
    startTransition(async () => {
      await executeRecordAction(
        () => onDelete(item.id),
        () => {
          isSubmittedRef.current = true;
          onClose();
        },
        (rawMsg) => {
          setError(getLocalizedErrorMessage(t, rawMsg));
        }
      );
    });
  };

  // Duplicate Action Handler with safe error catching
  const handleDuplicate = () => {
    if (!onDuplicate || !item) return;

    setError(null);
    startTransition(async () => {
      await executeRecordAction(
        () => onDuplicate(item.id),
        () => {
          isSubmittedRef.current = true;
          onClose();
        },
        (rawMsg) => {
          setError(getLocalizedErrorMessage(t, rawMsg));
        }
      );
    });
  };

  // Archive / Restore Action Handler with safe error catching
  const handleToggleArchive = () => {
    if (!onToggleArchive || !item) return;

    setError(null);
    startTransition(async () => {
      await executeRecordAction(
        () => onToggleArchive(item.id, !item.archived_at),
        () => {
          isSubmittedRef.current = true;
          onClose();
        },
        (rawMsg) => {
          setError(getLocalizedErrorMessage(t, rawMsg));
        }
      );
    });
  };

  // Form Submit (Save) Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t('recordModal.errors.titleRequired'));
      return;
    }

    // Validate link URLs strictly using shared production validator
    for (const link of links) {
      if (!isValidUrl(link.url)) {
        setError(t('recordModal.errors.urlInvalid'));
        return;
      }
    }

    // Parse hashtags cleanly
    const parsedHashtags = parseHashtags(hashtagsStr);

    // Compute UTC publish_at
    let finalPublishAt: string | null = null;
    if (publishDate.trim()) {
      try {
        finalPublishAt = bangkokToUtc(publishDate, publishTimeKnown ? publishTime : null);
      } catch {
        setError(t('recordModal.errors.dateFormatInvalid'));
        return;
      }
    }

    setError(null);
    startTransition(async () => {
      await executeRecordAction(
        () =>
          onSave({
            title: title.trim(),
            platforms,
            content_pillar_id: pillarId || null,
            format: format || null,
            goal: goal || null,
            status,
            progress,
            publish_at: finalPublishAt,
            publish_time_known: publishDate.trim() ? publishTimeKnown : false,
            hook: hook.trim() || null,
            objective: objective.trim() || null,
            production_detail: productionDetail.trim() || null,
            cta: cta.trim() || null,
            caption: caption.trim() || null,
            hashtags: parsedHashtags,
            review_status: reviewStatus || null,
            notes: notes.trim() || null,
            links: links.map((l, idx) => ({
              link_type: l.link_type,
              platform: l.platform || null,
              url: l.url.trim(),
              label: l.label ? l.label.trim() : null,
              sort_order: idx,
            })),
          }),
        () => {
          isSubmittedRef.current = true;
          onClose();
        },
        (rawMsg) => {
          setError(getLocalizedErrorMessage(t, rawMsg));
        }
      );
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleRequestClose();
        }
      }}
    >
      {/* Screen-reader accessible live announcement region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative"
      >
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 id="modal-title" className="text-base font-bold text-slate-900">
            {item ? (
              <span>
                {t('recordModal.editTitle')}{' '}
                {item.source_number ? (
                  <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 ml-1.5 font-normal">
                    #{item.source_number}
                  </span>
                ) : null}
              </span>
            ) : (
              t('recordModal.newTitle')
            )}
          </h2>
          <button
            type="button"
            onClick={handleRequestClose}
            aria-label={t('recordModal.closeAria')}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <IconX className="w-5 h-5" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label htmlFor="modal-title-input" className="text-xs font-semibold text-slate-700">
              {t('recordModal.titleField')} <span className="text-rose-500">*</span>
            </label>
            <input
              ref={titleInputRef}
              id="modal-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('recordModal.titlePlaceholder')}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>

          {/* Platforms Selection */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 block">
              {t('recordModal.platforms')} <span className="text-rose-500">*</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ALL_PLATFORMS.map((p) => {
                const isSelected = platforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t(`platform.${p}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pillar, Format, Goal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label htmlFor="modal-pillar-select" className="text-xs font-semibold text-slate-700">
                {t('recordModal.pillar')}
              </label>
              <select
                id="modal-pillar-select"
                value={pillarId}
                onChange={(e) => setPillarId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">{t('recordModal.noPillar')}</option>
                {pillars.map((pil) => (
                  <option key={pil.id} value={pil.id}>
                    {pil.name_th} / {pil.name_en}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="modal-format-select" className="text-xs font-semibold text-slate-700">
                {t('recordModal.format')}
              </label>
              <select
                id="modal-format-select"
                value={format}
                onChange={(e) => setFormat(e.target.value as ContentFormat)}
                className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">{t('recordModal.unassigned')}</option>
                {ALL_FORMATS.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {t(`formats.${fmt}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="modal-goal-select" className="text-xs font-semibold text-slate-700">
                {t('recordModal.goal')}
              </label>
              <select
                id="modal-goal-select"
                value={goal}
                onChange={(e) => setGoal(e.target.value as ContentGoal)}
                className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">{t('recordModal.unassigned')}</option>
                {ALL_GOALS.map((gl) => (
                  <option key={gl} value={gl}>
                    {t(`goals.${gl}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Workflow Status, Review Status, Progress */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label htmlFor="modal-status-select" className="text-xs font-semibold text-slate-700">
                {t('recordModal.status')}
              </label>
              <select
                id="modal-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkflowStatus)}
                className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {ALL_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {t(`status.${st}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="modal-review-status-select" className="text-xs font-semibold text-slate-700">
                {t('recordModal.reviewStatus')}
              </label>
              <select
                id="modal-review-status-select"
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value as ReviewStatus)}
                className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">{t('recordModal.unassigned')}</option>
                {ALL_REVIEW_STATUSES.map((rst) => (
                  <option key={rst} value={rst}>
                    {t(`review_status.${rst}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="modal-progress-range" className="text-xs font-semibold text-slate-700 flex justify-between">
                <span>{t('recordModal.progress').replace('{val}', String(progress))}</span>
                <span className="font-mono text-purple-700">{progress}%</span>
              </label>
              <input
                id="modal-progress-range"
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Publication Schedule in Asia/Bangkok */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">
                {t('recordModal.schedule')}
              </span>
              <label htmlFor="modal-publish-time-known-checkbox" className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  id="modal-publish-time-known-checkbox"
                  type="checkbox"
                  checked={publishTimeKnown}
                  onChange={(e) => setPublishTimeKnown(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span>{t('recordModal.timeKnown')}</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label htmlFor="modal-publish-date-input" className="text-[11px] text-slate-500 block">
                  {t('recordModal.publishDate')}
                </label>
                <input
                  id="modal-publish-date-input"
                  type="date"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {publishTimeKnown ? (
                <div className="space-y-1">
                  <label htmlFor="modal-publish-time-input" className="text-[11px] text-slate-500 block">
                    {t('recordModal.publishTime')}
                  </label>
                  <input
                    id="modal-publish-time-input"
                    type="time"
                    value={publishTime}
                    onChange={(e) => { setPublishTime(e.target.value); setPublishTimeKnown(true); }}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              ) : (
                <div className="flex items-end pb-1.5 text-xs text-slate-500 italic">
                  <span>{t('recordModal.dateOnly')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Hook & Objective */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="modal-hook-textarea" className="text-xs font-semibold text-slate-700">
                {t('recordModal.hook')}
              </label>
              <textarea
                id="modal-hook-textarea"
                rows={2}
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                placeholder={t('recordModal.hookPlaceholder')}
                className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="modal-objective-textarea" className="text-xs font-semibold text-slate-700">
                {t('recordModal.objective')}
              </label>
              <textarea
                id="modal-objective-textarea"
                rows={2}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder={t('recordModal.objectivePlaceholder')}
                className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>
          </div>

          {/* Production Detail & Call to Action (CTA) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="modal-production-detail-textarea" className="text-xs font-semibold text-slate-700">
                {t('recordModal.productionDetail')}
              </label>
              <textarea
                id="modal-production-detail-textarea"
                rows={2}
                value={productionDetail}
                onChange={(e) => setProductionDetail(e.target.value)}
                placeholder={t('recordModal.productionDetailPlaceholder')}
                className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="modal-cta-textarea" className="text-xs font-semibold text-slate-700">
                {t('recordModal.cta')}
              </label>
              <textarea
                id="modal-cta-textarea"
                rows={2}
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder={t('recordModal.ctaPlaceholder')}
                className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>
          </div>

          {/* Caption & Hashtags */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="modal-caption-textarea" className="text-xs font-semibold text-slate-700">
                {t('recordModal.caption')}
              </label>
              <textarea
                id="modal-caption-textarea"
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t('recordModal.captionPlaceholder')}
                className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="modal-hashtags-input" className="text-xs font-semibold text-slate-700">
                {t('recordModal.hashtags')}
              </label>
              <input
                id="modal-hashtags-input"
                type="text"
                value={hashtagsStr}
                onChange={(e) => setHashtagsStr(e.target.value)}
                placeholder={t('recordModal.hashtagsPlaceholder')}
                className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Live Platform-Neutral Text Post Preview with Copy Controls */}
          <TextPreview
            hook={hook}
            caption={caption}
            cta={cta}
            hashtagsStr={hashtagsStr}
            copyFeedbackId={copyFeedback?.id ?? null}
            copyFeedbackStatus={copyFeedback?.status ?? null}
            onCopy={handleCopy}
          />

          {/* External-Link Workspace */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">
                {t('recordModal.links')} ({links.length})
              </span>
              <button
                type="button"
                onClick={handleAddLink}
                aria-label={t('recordModal.addLinkAria')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-md transition-colors cursor-pointer"
              >
                <IconPlus className="w-3.5 h-3.5" size={14} />
                <span>{t('recordModal.addLink')}</span>
              </button>
            </div>

            {links.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-1">
                {t('recordModal.noLinks')}
              </p>
            ) : (
              <div className="space-y-2.5">
                {links.map((link, idx) => (
                  <LinkCard
                    key={link.clientId}
                    index={idx}
                    totalCount={links.length}
                    link={link}
                    onChange={handleLinkChange}
                    onRemove={handleRemoveLink}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    copyFeedbackId={copyFeedback?.id ?? null}
                    copyFeedbackStatus={copyFeedback?.status ?? null}
                    onCopy={handleCopy}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label htmlFor="modal-notes-textarea" className="text-xs font-semibold text-slate-700">
              {t('recordModal.notes')}
            </label>
            <textarea
              id="modal-notes-textarea"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('recordModal.notesPlaceholder')}
              className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Linked Production Tasks Readout */}
          {item?.tasks && item.tasks.length > 0 ? (
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">
                {t('nav.tasks')} ({item.tasks.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {item.tasks.map((tsk) => (
                  <span
                    key={tsk.id}
                    className="text-[11px] text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200"
                  >
                    {tsk.title} &bull; {t(`tasks.status.${tsk.status}`)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Actions Footer */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {item ? (
              <div className="flex items-center gap-2">
                {onDelete && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleDelete}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer disabled:opacity-50"
                  >
                    {t('recordModal.delete')}
                  </button>
                )}

                {onDuplicate && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleDuplicate}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer disabled:opacity-50"
                  >
                    {t('recordModal.duplicate')}
                  </button>
                )}

                {onToggleArchive && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleToggleArchive}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer disabled:opacity-50"
                  >
                    {item.archived_at ? t('recordModal.restore') : t('recordModal.archive')}
                  </button>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRequestClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                {t('recordModal.cancel')}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? t('common.saving') : t('recordModal.save')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Unsaved changes confirmation dialog */}
      <DiscardConfirmDialog
        isOpen={showDiscardConfirm}
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
      />
    </div>
  );
}

export function RecordModal(props: RecordModalProps) {
  if (!props.isOpen) return null;
  return <RecordModalForm key={props.item?.id || 'new'} {...props} />;
}
