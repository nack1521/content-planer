'use client';

import React, { useState, useTransition, useEffect, useRef } from 'react';
import {
  ContentItem,
  ContentPillar,
  ContentFormat,
  ContentGoal,
  WorkflowStatus,
  Platform,
  ReviewStatus,
} from '@/types/planner';
import { ContentItemInput, ContentLinkInput } from '@/app/actions/content';
import { useLocale } from '@/context/LocaleContext';
import { bangkokToUtc, utcToBangkokParts } from '@/utils/timezone';
import { getLocalizedErrorMessage } from '@/utils/errors';
import { IconTrash, IconPlus } from '@/components/common/Icons';

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
const ALL_LINK_TYPES = ['idea_source', 'asset', 'published', 'note'] as const;

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

  // Focus trap & Escape key handling
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    titleInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
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
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  // Form States
  const [title, setTitle] = useState(item?.title || '');
  const [platforms, setPlatforms] = useState<Platform[]>(item?.platforms || ['tiktok']);
  const [pillarId, setPillarId] = useState<string>(item?.content_pillar_id || '');

  const [format, setFormat] = useState<ContentFormat | ''>((item?.format as ContentFormat) || '');
  const [goal, setGoal] = useState<ContentGoal | ''>((item?.goal as ContentGoal) || '');

  const [status, setStatus] = useState<WorkflowStatus>(item?.status || 'idea');
  const [progress, setProgress] = useState<number>(item?.progress ?? 0);

  // Date & Bangkok time handling
  const initialBkk = utcToBangkokParts(item?.publish_at);
  const [publishDate, setPublishDate] = useState<string>(initialBkk.date);
  const [publishTime, setPublishTime] = useState<string>(initialBkk.time || '10:00');
  const [publishTimeKnown, setPublishTimeKnown] = useState<boolean>(
    item?.publish_time_known ?? (item?.publish_at ? true : false)
  );

  const [hook, setHook] = useState(item?.hook || '');
  const [objective, setObjective] = useState(item?.objective || '');
  const [productionDetail, setProductionDetail] = useState(item?.production_detail || '');
  const [cta, setCta] = useState(item?.cta || '');
  const [caption, setCaption] = useState(item?.caption || '');
  const [hashtagsStr, setHashtagsStr] = useState((item?.hashtags || []).join(' '));
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | ''>((item?.review_status as ReviewStatus) || '');
  const [notes, setNotes] = useState(item?.notes || '');

  // Content Links state
  const [links, setLinks] = useState<ContentLinkInput[]>(
    item?.links && item.links.length > 0
      ? item.links.map((l) => ({
          id: l.id,
          link_type: l.link_type,
          platform: l.platform,
          url: l.url,
          label: l.label,
        }))
      : []
  );

  const [error, setError] = useState<string | null>(null);

  const togglePlatform = (p: Platform) => {
    setPlatforms((prev) =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter((x) => x !== p) : prev) : [...prev, p]
    );
  };

  const handleAddLink = () => {
    setLinks((prev) => [
      ...prev,
      { link_type: 'asset', platform: null, url: '', label: '' },
    ]);
  };

  const handleRemoveLink = (idx: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLinkChange = (idx: number, field: keyof ContentLinkInput, value: unknown) => {
    setLinks((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t('recordModal.errors.titleRequired'));
      return;
    }

    // Validate link URLs if any
    for (const link of links) {
      if (!link.url || !link.url.trim().startsWith('http')) {
        setError(t('recordModal.errors.urlInvalid'));
        return;
      }
    }

    // Parse hashtags
    const parsedHashtags = hashtagsStr
      .split(/[,\s]+/)
      .map((h) => h.trim().replace(/^#+/, ''))
      .filter((h) => h.length > 0)
      .map((h) => `#${h}`);

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

    startTransition(async () => {
      try {
        await onSave({
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
          links: links.map((l) => ({
            link_type: l.link_type,
            platform: l.platform || null,
            url: l.url.trim(),
            label: l.label ? l.label.trim() : null,
          })),
        });
        onClose();
      } catch (err: unknown) {
        const rawMsg = err instanceof Error ? err.message : 'saveFailed';
        setError(getLocalizedErrorMessage(t, rawMsg));
      }
    });
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
        <h2 id="modal-title" className="text-base font-bold text-slate-900">
          {item ? (
            <span>
              {t('recordModal.editTitle')}
              {item.source_number ? (
                <span className="ml-2 text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  #{item.source_number}
                </span>
              ) : null}
            </span>
          ) : (
            t('recordModal.createTitle')
          )}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('recordModal.close')}
          className="text-slate-400 hover:text-slate-600 text-xl leading-none p-1 cursor-pointer transition-colors"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Title */}
        <div className="space-y-1">
          <label htmlFor="modal-title-input" className="text-xs font-semibold text-slate-700">
            {t('recordModal.title')} *
          </label>
          <input
            id="modal-title-input"
            ref={titleInputRef}
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('recordModal.titlePlaceholder')}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Platforms & Pillar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-700">
              {t('recordModal.platforms')}
            </span>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {ALL_PLATFORMS.map((p) => {
                const isSelected = platforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t(`platform.${p}`)}
                  </button>
                );
              })}
            </div>
          </div>

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
                  {pil.name_th} ({pil.name_en})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Format, Goal, Review Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label htmlFor="modal-format-select" className="text-xs font-semibold text-slate-700">
              {t('recordModal.format')}
            </label>
            <select
              id="modal-format-select"
              value={format}
              onChange={(e) => setFormat(e.target.value as ContentFormat | '')}
              className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">{t('recordModal.unassigned')}</option>
              {ALL_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {t(`format.${f}`)}
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
              onChange={(e) => setGoal(e.target.value as ContentGoal | '')}
              className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">{t('recordModal.unassigned')}</option>
              {ALL_GOALS.map((g) => (
                <option key={g} value={g}>
                  {t(`goal.${g}`)}
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
              onChange={(e) => setReviewStatus(e.target.value as ReviewStatus | '')}
              className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">{t('recordModal.unassigned')}</option>
              {ALL_REVIEW_STATUSES.map((r) => (
                <option key={r} value={r}>
                  {t(`review_status.${r}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Workflow Status & Progress */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="modal-workflow-status-select" className="text-xs font-semibold text-slate-700">
              {t('recordModal.status')}
            </label>
            <select
              id="modal-workflow-status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as WorkflowStatus)}
              className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="modal-progress-range" className="text-xs font-semibold text-slate-700 flex items-center justify-between">
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

        {/* Editable Content Links */}
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

          {links.map((link, idx) => (
            <div
              key={idx}
              className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-2 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label htmlFor={`link-type-${idx}`} className="text-[10px] text-slate-500 font-medium block">
                    {t('recordModal.linkType')}
                  </label>
                  <select
                    id={`link-type-${idx}`}
                    value={link.link_type}
                    onChange={(e) =>
                      handleLinkChange(idx, 'link_type', e.target.value as ContentLinkInput['link_type'])
                    }
                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {ALL_LINK_TYPES.map((lt) => (
                      <option key={lt} value={lt}>
                        {t(`recordModal.linkTypes.${lt}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={`link-platform-${idx}`} className="text-[10px] text-slate-500 font-medium block">
                    {t('recordModal.platforms')}
                  </label>
                  <select
                    id={`link-platform-${idx}`}
                    value={link.platform || ''}
                    onChange={(e) =>
                      handleLinkChange(idx, 'platform', (e.target.value as Platform) || null)
                    }
                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">{t('recordModal.unassigned')}</option>
                    {ALL_PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {t(`platform.${p}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={`link-label-${idx}`} className="text-[10px] text-slate-500 font-medium block">
                    {t('recordModal.linkLabel')}
                  </label>
                  <input
                    id={`link-label-${idx}`}
                    type="text"
                    value={link.label || ''}
                    onChange={(e) => handleLinkChange(idx, 'label', e.target.value)}
                    placeholder={t('recordModal.linkLabelPlaceholder')}
                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor={`link-url-${idx}`} className="sr-only">
                  {t('recordModal.linkUrl')}
                </label>
                <input
                  id={`link-url-${idx}`}
                  type="url"
                  required
                  value={link.url}
                  onChange={(e) => handleLinkChange(idx, 'url', e.target.value)}
                  placeholder={t('recordModal.linkUrlPlaceholder')}
                  className="flex-1 px-2.5 py-1 font-mono text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveLink(idx)}
                  aria-label={t('recordModal.removeLinkAria')}
                  className="px-2 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                >
                  <IconTrash className="w-3.5 h-3.5" size={14} />
                </button>
              </div>
            </div>
          ))}
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
                  onClick={() => {
                    if (window.confirm(t('recordModal.confirmDelete'))) {
                      startTransition(async () => {
                        await onDelete(item.id);
                        onClose();
                      });
                    }
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer disabled:opacity-50"
                >
                  {t('recordModal.delete')}
                </button>
              )}

              {onDuplicate && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      await onDuplicate(item.id);
                      onClose();
                    });
                  }}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer disabled:opacity-50"
                >
                  {t('recordModal.duplicate')}
                </button>
              )}

              {onToggleArchive && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      await onToggleArchive(item.id, !item.archived_at);
                      onClose();
                    });
                  }}
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
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              {t('recordModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isPending ? '...' : t('recordModal.save')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export function RecordModal(props: RecordModalProps) {
  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <RecordModalForm key={props.item?.id || 'new'} {...props} />
    </div>
  );
}
