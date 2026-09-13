import React, { useState } from 'react';
import { ContentItem } from '@/types/planner';
import { useLocale } from '@/context/LocaleContext';
import { formatBangkokDateTime, isTodayBangkok } from '@/utils/date';
import { StatusBadge } from './StatusBadge';
import { PlatformBadge } from './PlatformBadge';
import { PillarBadge } from './PillarBadge';
import { ProgressBar } from './ProgressBar';
import { IconClock, IconCopy, IconCheck, IconMoreHorizontal } from '@/components/common/Icons';

interface PlannerCardsProps {
  items: ContentItem[];
  onSelectItem?: (item: ContentItem) => void;
}

export function PlannerCards({ items, onSelectItem }: PlannerCardsProps) {
  const { t, locale } = useLocale();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyHook = (e: React.MouseEvent, item: ContentItem) => {
    e.stopPropagation();
    if (!item.hook) return;
    navigator.clipboard.writeText(item.hook);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-3 md:hidden">
      {items.map((item) => {
        const isToday = isTodayBangkok(item.publish_at);
        const formattedSchedule = item.publish_at
          ? formatBangkokDateTime(item.publish_at, locale, true)
          : null;

        return (
          <article
            key={item.id}
            onClick={() => onSelectItem?.(item)}
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3 cursor-pointer active:scale-[0.99] transition-transform"
          >
            {/* Top Bar: Platforms, Pillar & Status */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5 items-center">
                {item.platforms.map((p) => (
                  <PlatformBadge key={p} platform={p} />
                ))}
                {item.pillar && <PillarBadge pillar={item.pillar} />}
              </div>
              <StatusBadge status={item.status} size="sm" />
            </div>

            {/* Title (>=16px for body readability) */}
            <div>
              <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2">
                {item.title}
              </h3>
            </div>

            {/* Hook Snippet (14px) */}
            {item.hook && (
              <div className="bg-slate-50 rounded-lg p-2.5 text-sm text-slate-600 border border-slate-100 flex items-start justify-between gap-2">
                <span className="italic line-clamp-2 leading-relaxed">
                  &ldquo;{item.hook}&rdquo;
                </span>
                <button
                  type="button"
                  onClick={(e) => handleCopyHook(e, item)}
                  className="text-slate-400 hover:text-purple-600 p-1 shrink-0 transition-colors"
                  title={t('table.copyHook')}
                  aria-label={t('table.copyHook')}
                >
                  {copiedId === item.id ? (
                    <IconCheck className="w-4 h-4 text-emerald-600" size={16} />
                  ) : (
                    <IconCopy className="w-4 h-4" size={16} />
                  )}
                </button>
              </div>
            )}

            {/* Format & Goal Tags */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {item.format && (
                <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-semibold text-xs border border-purple-100">
                  {t(`format.${item.format}`)}
                </span>
              )}
              {item.goal && (
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                  {t(`goal.${item.goal}`)}
                </span>
              )}
            </div>

            {/* Schedule & Progress (14px schedule) */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <IconClock className="w-4 h-4 text-slate-400" size={16} />
                  {formattedSchedule ? (
                    <span className="font-mono text-sm font-medium text-slate-800">
                      {formattedSchedule}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic text-sm">
                      {t('card.unscheduled')}
                    </span>
                  )}
                </div>

                {isToday && (
                  <span className="inline-flex items-center text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                    {t('common.today')}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-0.5">
                <ProgressBar progress={item.progress} className="flex-1" />
                <button
                  type="button"
                  className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={t('table.openMenu')}
                  aria-label={t('table.openMenu')}
                >
                  <IconMoreHorizontal className="w-4 h-4" size={16} />
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
