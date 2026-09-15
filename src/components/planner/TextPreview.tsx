'use client';

import React from 'react';
import { useLocale } from '@/context/LocaleContext';
import { IconCopy, IconCheck } from '@/components/common/Icons';

interface TextPreviewProps {
  hook: string;
  caption: string;
  cta: string;
  hashtagsStr: string;
  copyFeedbackId: string | null;
  copyFeedbackStatus: 'success' | 'error' | null;
  onCopy: (id: string, text: string, fieldName: string) => Promise<void>;
}

export function TextPreview({
  hook,
  caption,
  cta,
  hashtagsStr,
  copyFeedbackId,
  copyFeedbackStatus,
  onCopy,
}: TextPreviewProps) {
  const { t } = useLocale();

  // Parse hashtags into clean #tags
  const parsedHashtags = hashtagsStr
    .split(/[,\s]+/)
    .map((h) => h.trim().replace(/^#+/, ''))
    .filter((h) => h.length > 0)
    .map((h) => `#${h}`);

  const formattedHashtags = parsedHashtags.join(' ');

  const renderCopyButton = (id: string, text: string, label: string) => {
    const isCopied = copyFeedbackId === id && copyFeedbackStatus === 'success';
    const isCopyFailed = copyFeedbackId === id && copyFeedbackStatus === 'error';
    const hasText = Boolean(text && text.trim().length > 0);

    return (
      <button
        type="button"
        disabled={!hasText}
        onClick={() => onCopy(id, text, label)}
        aria-label={label}
        title={label}
        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        {isCopied ? (
          <>
            <IconCheck className="w-3.5 h-3.5 text-emerald-600" size={14} />
            <span className="text-emerald-700 text-[10px] font-semibold">
              {t('recordModal.copied')}
            </span>
          </>
        ) : isCopyFailed ? (
          <span className="text-rose-600 text-[10px] font-semibold">
            {t('recordModal.copyFailed')}
          </span>
        ) : (
          <>
            <IconCopy className="w-3.5 h-3.5 text-slate-500" size={14} />
            <span>{label}</span>
          </>
        )}
      </button>
    );
  };

  return (
    <div
      data-testid="text-post-preview"
      className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3 font-sans"
    >
      {/* Preview Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 tracking-tight">
            {t('recordModal.previewTitle')}
          </span>
          <span className="text-[10px] font-medium text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
            {t('recordModal.previewSubtitle')}
          </span>
        </div>
      </div>

      {/* Hook / Main Message */}
      <div className="space-y-1">
        <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">
          {t('recordModal.previewHookLabel')}
        </span>
        {hook.trim() ? (
          <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug break-words">
            {hook.trim()}
          </p>
        ) : (
          <p className="text-xs text-slate-400 italic">
            {t('recordModal.emptyHook')}
          </p>
        )}
      </div>

      {/* Caption with preserved line breaks */}
      <div className="space-y-1 pt-1 border-t border-slate-200/60">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            {t('recordModal.previewCaptionLabel')}
          </span>
          {renderCopyButton('preview-caption', caption.trim(), t('recordModal.copyCaption'))}
        </div>
        {caption.trim() ? (
          <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed break-words bg-white/70 p-2.5 rounded-lg border border-slate-200/70">
            {caption}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            {t('recordModal.emptyCaption')}
          </p>
        )}
      </div>

      {/* Call to Action */}
      <div className="space-y-1 pt-1 border-t border-slate-200/60">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            {t('recordModal.previewCtaLabel')}
          </span>
          {renderCopyButton('preview-cta', cta.trim(), t('recordModal.copyCta'))}
        </div>
        {cta.trim() ? (
          <p className="text-xs sm:text-sm font-medium text-purple-900 bg-purple-50/70 border border-purple-200/60 rounded-md px-2.5 py-1.5 break-words">
            {cta.trim()}
          </p>
        ) : (
          <p className="text-xs text-slate-400 italic">
            {t('recordModal.emptyCta')}
          </p>
        )}
      </div>

      {/* Hashtags */}
      <div className="space-y-1 pt-1 border-t border-slate-200/60">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            {t('recordModal.previewHashtagsLabel')}
          </span>
          {renderCopyButton('preview-hashtags', formattedHashtags, t('recordModal.copyHashtags'))}
        </div>
        {parsedHashtags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {parsedHashtags.map((tag, idx) => (
              <span
                key={`${tag}-${idx}`}
                className="text-xs font-mono font-medium text-purple-700 bg-white border border-purple-200/80 px-2 py-0.5 rounded-md shadow-2xs"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            {t('recordModal.emptyHashtags')}
          </p>
        )}
      </div>
    </div>
  );
}
