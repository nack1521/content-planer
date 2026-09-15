'use client';

import React from 'react';
import { useLocale } from '@/context/LocaleContext';
import { getSafeDomain } from '@/utils/url/safeDomain';
import {
  IconTrash,
  IconCopy,
  IconCheck,
  IconArrowUp,
  IconArrowDown,
  IconExternalLink,
} from '@/components/common/Icons';
import type { Platform } from '@/types/planner';

const ALL_PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'facebook', 'x'];
const ALL_LINK_TYPES = ['idea_source', 'asset', 'published', 'note'] as const;

export interface EditableLinkItem {
  clientId: string;
  id?: string;
  link_type: 'idea_source' | 'asset' | 'published' | 'note';
  platform?: Platform | null;
  url: string;
  label?: string | null;
  sort_order?: number;
}

interface LinkCardProps {
  index: number;
  totalCount: number;
  link: EditableLinkItem;
  onChange: (clientId: string, field: keyof EditableLinkItem, value: unknown) => void;
  onRemove: (clientId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  copyFeedbackId: string | null;
  copyFeedbackStatus: 'success' | 'error' | null;
  onCopy: (id: string, text: string, fieldName: string) => Promise<void>;
}

export function LinkCard({
  index,
  totalCount,
  link,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  copyFeedbackId,
  copyFeedbackStatus,
  onCopy,
}: LinkCardProps) {
  const { t } = useLocale();

  const domain = getSafeDomain(link.url);
  const fallbackLabel =
    link.label?.trim() || domain || t(`recordModal.linkTypes.${link.link_type}`);

  const isCopied =
    copyFeedbackId === `link-${link.clientId}` && copyFeedbackStatus === 'success';
  const isCopyFailed =
    copyFeedbackId === `link-${link.clientId}` && copyFeedbackStatus === 'error';

  const hasValidUrl = domain.length > 0;

  return (
    <div
      data-testid={`link-card-${index}`}
      className="bg-white border border-slate-200 rounded-lg p-3 space-y-2.5 shadow-xs transition-colors"
    >
      {/* Top Header Card Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
            #{index + 1}
          </span>
          <span className="text-xs font-semibold text-slate-800 truncate max-w-[200px]" title={fallbackLabel}>
            {fallbackLabel}
          </span>
          <span className="text-[10px] font-medium text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
            {t(`recordModal.linkTypes.${link.link_type}`)}
          </span>
          {link.platform ? (
            <span className="text-[10px] font-medium text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
              {t(`platform.${link.platform}`)}
            </span>
          ) : null}
          {domain ? (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded truncate max-w-[150px]">
              {domain}
            </span>
          ) : null}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            aria-label={t('recordModal.moveUp')}
            title={t('recordModal.moveUp')}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            <IconArrowUp className="w-3.5 h-3.5" size={14} />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={index === totalCount - 1}
            aria-label={t('recordModal.moveDown')}
            title={t('recordModal.moveDown')}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            <IconArrowDown className="w-3.5 h-3.5" size={14} />
          </button>

          <button
            type="button"
            onClick={() => onCopy(`link-${link.clientId}`, link.url, fallbackLabel)}
            disabled={!link.url?.trim()}
            aria-label={t('recordModal.copyLink')}
            title={t('recordModal.copyLink')}
            className="inline-flex items-center gap-1 px-1.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            {isCopied ? (
              <>
                <IconCheck className="w-3.5 h-3.5 text-emerald-600" size={14} />
                <span className="text-emerald-700 text-[10px]">{t('recordModal.copied')}</span>
              </>
            ) : isCopyFailed ? (
              <span className="text-rose-600 text-[10px]">{t('recordModal.copyFailed')}</span>
            ) : (
              <IconCopy className="w-3.5 h-3.5" size={14} />
            )}
          </button>

          {hasValidUrl ? (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('recordModal.openLink')}
              title={t('recordModal.openLink')}
              className="p-1 text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded transition-colors inline-flex items-center"
            >
              <IconExternalLink className="w-3.5 h-3.5" size={14} />
            </a>
          ) : (
            <button
              type="button"
              disabled
              aria-label={t('recordModal.openLink')}
              title={t('recordModal.openLink')}
              className="p-1 text-slate-300 cursor-not-allowed"
            >
              <IconExternalLink className="w-3.5 h-3.5" size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={() => onRemove(link.clientId)}
            aria-label={t('recordModal.removeLinkAria')}
            title={t('recordModal.removeLinkAria')}
            className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
          >
            <IconTrash className="w-3.5 h-3.5" size={14} />
          </button>
        </div>
      </div>

      {/* Form Fields inside Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label
            htmlFor={`link-type-${link.clientId}`}
            className="text-[10px] text-slate-500 font-medium block"
          >
            {t('recordModal.linkType')}
          </label>
          <select
            id={`link-type-${link.clientId}`}
            value={link.link_type}
            onChange={(e) =>
              onChange(link.clientId, 'link_type', e.target.value as EditableLinkItem['link_type'])
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
          <label
            htmlFor={`link-platform-${link.clientId}`}
            className="text-[10px] text-slate-500 font-medium block"
          >
            {t('recordModal.platforms')}
          </label>
          <select
            id={`link-platform-${link.clientId}`}
            value={link.platform || ''}
            onChange={(e) =>
              onChange(link.clientId, 'platform', (e.target.value as Platform) || null)
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
          <label
            htmlFor={`link-label-${link.clientId}`}
            className="text-[10px] text-slate-500 font-medium block"
          >
            {t('recordModal.linkLabel')}
          </label>
          <input
            id={`link-label-${link.clientId}`}
            type="text"
            value={link.label || ''}
            onChange={(e) => onChange(link.clientId, 'label', e.target.value)}
            placeholder={t('recordModal.linkLabelPlaceholder')}
            className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor={`link-url-${link.clientId}`} className="text-[10px] text-slate-500 font-medium block">
          {t('recordModal.linkUrl')}
        </label>
        <input
          id={`link-url-${link.clientId}`}
          type="url"
          required
          value={link.url}
          onChange={(e) => onChange(link.clientId, 'url', e.target.value)}
          placeholder={t('recordModal.linkUrlPlaceholder')}
          className="w-full px-2.5 py-1 font-mono text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>
    </div>
  );
}
