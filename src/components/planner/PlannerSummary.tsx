import React, { useState } from 'react';
import { ContentItem, WorkflowStatus } from '@/types/planner';
import { useLocale } from '@/context/LocaleContext';
import { isTodayBangkok, isThisMonthBangkok } from '@/utils/date';
import {
  IconClock,
  IconCalendar,
  IconSparkles,
  IconLightbulb,
  IconCheck,
  IconChevronDown,
} from '@/components/common/Icons';

interface PlannerSummaryProps {
  items: ContentItem[];
  activeStatusFilter: string;
  onSelectStatusFilter: (status: string) => void;
}

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

export function PlannerSummary({
  items,
  activeStatusFilter,
  onSelectStatusFilter,
}: PlannerSummaryProps) {
  const { t } = useLocale();
  const [showMobileStages, setShowMobileStages] = useState<boolean>(false);

  // Compute metrics
  const plannedToday = items.filter(
    (item) => item.publish_at && isTodayBangkok(item.publish_at)
  ).length;

  const plannedThisMonth = items.filter(
    (item) => item.publish_at && isThisMonthBangkok(item.publish_at)
  ).length;

  const inProduction = items.filter((item) =>
    ['researching', 'scripting', 'recording', 'editing', 'reviewing'].includes(item.status)
  ).length;

  const ideasCaptured = items.filter((item) => item.status === 'idea').length;
  const readyToPublish = items.filter((item) => item.status === 'scheduled').length;
  const publishedThisMonth = items.filter(
    (item) => item.status === 'published' && isThisMonthBangkok(item.publish_at || item.updated_at)
  ).length;

  // Stage counts
  const stageCounts: Record<WorkflowStatus, number> = {
    idea: 0,
    researching: 0,
    scripting: 0,
    recording: 0,
    editing: 0,
    reviewing: 0,
    scheduled: 0,
    published: 0,
  };

  items.forEach((item) => {
    if (stageCounts[item.status] !== undefined) {
      stageCounts[item.status]++;
    }
  });

  return (
    <section aria-labelledby="summary-heading" className="space-y-3">
      {/* Mobile Compact Overview (md:hidden) — Height <= 70px to preserve 390x844 first viewport */}
      <div className="md:hidden space-y-2">
        <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
          {/* Today */}
          <div className="flex flex-col items-center justify-center p-1 rounded-lg bg-purple-50/50 border border-purple-100/60">
            <span className="text-[11px] font-semibold text-purple-900 truncate">
              {t('summary.compactToday')}
            </span>
            <span className="text-base font-bold font-mono text-purple-700">
              {plannedToday}
            </span>
          </div>

          {/* This Month */}
          <div className="flex flex-col items-center justify-center p-1 rounded-lg bg-sky-50/50 border border-sky-100/60">
            <span className="text-[11px] font-semibold text-sky-900 truncate">
              {t('summary.compactMonth')}
            </span>
            <span className="text-base font-bold font-mono text-sky-700">
              {plannedThisMonth}
            </span>
          </div>

          {/* In Prod */}
          <div className="flex flex-col items-center justify-center p-1 rounded-lg bg-amber-50/50 border border-amber-100/60">
            <span className="text-[11px] font-semibold text-amber-900 truncate">
              {t('summary.compactProd')}
            </span>
            <span className="text-base font-bold font-mono text-amber-700">
              {inProduction}
            </span>
          </div>
        </div>

        {/* Mobile Expandable Workflow Stages */}
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => setShowMobileStages(!showMobileStages)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-purple-600 transition-colors cursor-pointer"
          >
            <span>
              {showMobileStages
                ? t('summary.hideStages')
                : t('summary.showMoreStages', { count: ALL_STATUSES.length })}
            </span>
            <IconChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                showMobileStages ? 'rotate-180' : ''
              }`}
              size={14}
            />
          </button>

          {activeStatusFilter !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectStatusFilter('all')}
              className="text-xs font-medium text-purple-600 hover:text-purple-700 cursor-pointer"
            >
              {t('filters.reset')}
            </button>
          )}
        </div>

        {showMobileStages && (
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-1.5 animate-fadeIn">
            {ALL_STATUSES.map((st) => {
              const isSelected = activeStatusFilter === st;
              const count = stageCounts[st] || 0;
              const localizedStatus = t(`status.${st}`);
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => onSelectStatusFilter(isSelected ? 'all' : st)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title={t('summary.filterByStatus', { status: localizedStatus })}
                >
                  <span>{localizedStatus}</span>
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-purple-700/80 text-white' : 'bg-slate-200/80 text-slate-800'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Comprehensive Overview (hidden on mobile) */}
      <div className="hidden md:block space-y-4">
        <div>
          <h2 id="summary-heading" className="text-lg font-bold text-slate-900 tracking-tight">
            {t('summary.title')}
          </h2>
          <p className="text-xs text-slate-500">{t('summary.subtitle')}</p>
        </div>

        {/* Summary KPI Cards Strip */}
        <div className="grid grid-cols-6 gap-3">
          {/* Planned Today */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold text-slate-700">{t('summary.plannedToday')}</span>
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <IconClock className="w-4 h-4" size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-slate-900">{plannedToday}</span>
              <span className="text-xs text-slate-500">{t('common.items')}</span>
            </div>
            <div className="mt-2 h-1 w-full bg-purple-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full"
                style={{ width: `${Math.min(100, plannedToday * 33)}%` }}
              />
            </div>
          </div>

          {/* Planned This Month */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold text-slate-700">{t('summary.plannedThisMonth')}</span>
              <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                <IconCalendar className="w-4 h-4" size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-slate-900">{plannedThisMonth}</span>
              <span className="text-xs text-slate-500">{t('common.items')}</span>
            </div>
            <div className="mt-2 h-1 w-full bg-sky-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-600 rounded-full"
                style={{ width: `${Math.min(100, plannedThisMonth * 12)}%` }}
              />
            </div>
          </div>

          {/* In Production */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold text-slate-700">{t('summary.inProduction')}</span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <IconSparkles className="w-4 h-4" size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-amber-900">{inProduction}</span>
              <span className="text-xs text-slate-500">{t('common.items')}</span>
            </div>
            <div className="mt-2 h-1 w-full bg-amber-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${Math.min(100, inProduction * 20)}%` }}
              />
            </div>
          </div>

          {/* Ready to Publish */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold text-slate-700">{t('summary.readyToPublish')}</span>
              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
                <IconCheck className="w-4 h-4" size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-teal-900">{readyToPublish}</span>
              <span className="text-xs text-slate-500">{t('common.items')}</span>
            </div>
            <div className="mt-2 h-1 w-full bg-teal-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full"
                style={{ width: `${Math.min(100, readyToPublish * 30)}%` }}
              />
            </div>
          </div>

          {/* Idea Bank */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold text-slate-700">{t('summary.ideasCaptured')}</span>
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                <IconLightbulb className="w-4 h-4" size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-slate-800">{ideasCaptured}</span>
              <span className="text-xs text-slate-500">{t('common.items')}</span>
            </div>
            <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-400 rounded-full"
                style={{ width: `${Math.min(100, ideasCaptured * 25)}%` }}
              />
            </div>
          </div>

          {/* Published */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold text-slate-700">{t('summary.publishedThisMonth')}</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <IconCheck className="w-4 h-4" size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-emerald-800">
                {publishedThisMonth}
              </span>
              <span className="text-xs text-slate-500">{t('common.items')}</span>
            </div>
            <div className="mt-2 h-1 w-full bg-emerald-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full"
                style={{ width: `${Math.min(100, publishedThisMonth * 20)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Desktop Interactive Stage Breakdown Strip */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center justify-between">
            <span>{t('summary.pipelineHealth')}</span>
            {activeStatusFilter !== 'all' && (
              <button
                type="button"
                onClick={() => onSelectStatusFilter('all')}
                className="text-purple-600 hover:text-purple-700 text-xs font-medium cursor-pointer"
              >
                {t('filters.reset')}
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {ALL_STATUSES.map((st) => {
              const isSelected = activeStatusFilter === st;
              const count = stageCounts[st] || 0;
              const localizedStatus = t(`status.${st}`);
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => onSelectStatusFilter(isSelected ? 'all' : st)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title={t('summary.filterByStatus', { status: localizedStatus })}
                >
                  <span>{localizedStatus}</span>
                  <span
                    className={`font-mono text-xs px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-purple-700/80 text-white' : 'bg-slate-200/80 text-slate-800'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
