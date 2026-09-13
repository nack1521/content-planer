import React, { useState } from 'react';
import { ContentItem } from '@/types/planner';
import { useLocale } from '@/context/LocaleContext';
import { formatBangkokDateTime, isTodayBangkok } from '@/utils/date';
import { StatusBadge } from './StatusBadge';
import { PlatformBadge } from './PlatformBadge';
import { PillarBadge } from './PillarBadge';
import { ProgressBar } from './ProgressBar';
import { IconClock, IconCopy, IconCheck, IconMoreHorizontal } from '@/components/common/Icons';

interface PlannerTableProps {
  items: ContentItem[];
  onSelectItem?: (item: ContentItem) => void;
}

export function PlannerTable({ items, onSelectItem }: PlannerTableProps) {
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[980px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-600">
              <th scope="col" className="py-3 px-4 w-[34%]">
                {t('table.headerTitle')}
              </th>
              <th scope="col" className="py-3 px-3 w-[11%]">
                {t('table.headerPlatform')}
              </th>
              <th scope="col" className="py-3 px-3 w-[12%]">
                {t('table.headerPillar')}
              </th>
              <th scope="col" className="py-3 px-3 w-[14%]">
                {t('table.headerFormatGoal')}
              </th>
              <th scope="col" className="py-3 px-3 w-[13%]">
                {t('table.headerSchedule')}
              </th>
              <th scope="col" className="py-3 px-3 w-[10%]">
                {t('table.headerStatus')}
              </th>
              <th scope="col" className="py-3 px-3 w-[12%]">
                {t('table.headerProgress')}
              </th>
              <th scope="col" className="py-3 px-3 text-right w-[4%]">
                <span className="sr-only">{t('table.headerActions')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {items.map((item) => {
              const isToday = isTodayBangkok(item.publish_at);
              const formattedSchedule = item.publish_at
                ? formatBangkokDateTime(item.publish_at, locale, true)
                : null;

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectItem?.(item)}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                >
                  {/* Title & Hook */}
                  <td className="py-3.5 px-4 align-top">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 line-clamp-1 group-hover:text-purple-600 transition-colors">
                          {item.title}
                        </span>
                      </div>

                      {item.hook && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <span className="italic line-clamp-1">&ldquo;{item.hook}&rdquo;</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyHook(e, item)}
                            className="text-slate-400 hover:text-purple-600 p-0.5 rounded transition-colors"
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

                      {item.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {item.hashtags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {item.hashtags.length > 3 && (
                            <span className="text-xs font-mono text-slate-400">
                              +{item.hashtags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Platforms */}
                  <td className="py-3.5 px-3 align-top">
                    <div className="flex flex-wrap gap-1 items-center">
                      {item.platforms.map((p) => (
                        <PlatformBadge key={p} platform={p} />
                      ))}
                    </div>
                  </td>

                  {/* Pillar */}
                  <td className="py-3.5 px-3 align-top">
                    <PillarBadge pillar={item.pillar} />
                  </td>

                  {/* Format & Goal */}
                  <td className="py-3.5 px-3 align-top">
                    <div className="space-y-1">
                      {item.format && (
                        <div className="text-slate-800 font-medium text-xs sm:text-sm truncate max-w-[150px]">
                          {t(`format.${item.format}`)}
                        </div>
                      )}
                      {item.goal && (
                        <div className="text-xs text-slate-500 truncate max-w-[150px]">
                          {t(`goal.${item.goal}`)}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Schedule */}
                  <td className="py-3.5 px-3 align-top">
                    {formattedSchedule ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                          <IconClock className="w-4 h-4 text-slate-400 shrink-0" size={16} />
                          <span className="font-mono text-xs sm:text-sm">{formattedSchedule}</span>
                        </div>
                        {isToday && (
                          <span className="inline-flex items-center text-xs font-bold text-purple-700 bg-purple-100/70 px-1.5 py-0.5 rounded">
                            {t('common.today')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs sm:text-sm text-slate-400 italic">
                        {t('table.unscheduled')}
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-3 align-top">
                    <StatusBadge status={item.status} size="sm" />
                  </td>

                  {/* Progress */}
                  <td className="py-3.5 px-3 align-top">
                    <ProgressBar progress={item.progress} />
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-3 align-top text-right">
                    <button
                      type="button"
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title={t('table.openMenu')}
                      aria-label={t('table.openMenu')}
                    >
                      <IconMoreHorizontal className="w-4 h-4" size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
