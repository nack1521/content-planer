import React from 'react';
import { ContentItem, WorkflowStatus } from '@/types/planner';
import { useLocale } from '@/context/LocaleContext';
import { isTodayBangkok, isThisMonthBangkok } from '@/utils/date';
import {
  IconClock,
  IconCalendar,
  IconSparkles,
  IconLightbulb,
  IconCheck,
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

  // Stage counts for workflow breakdown
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
    <section aria-labelledby="summary-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="summary-heading" className="text-lg font-bold text-slate-900 tracking-tight">
            {t('summary.title')}
          </h2>
          <p className="text-xs text-slate-500">{t('summary.subtitle')}</p>
        </div>
      </div>

      {/* Summary KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Planned Today */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t('summary.plannedToday')}</span>
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
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t('summary.plannedThisMonth')}</span>
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
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t('summary.inProduction')}</span>
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

        {/* Ready to Publish (Scheduled) */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t('summary.readyToPublish')}</span>
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
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t('summary.ideasCaptured')}</span>
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
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t('summary.publishedThisMonth')}</span>
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

      {/* Stage Breakdown Interactive Strip */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
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
            return (
              <button
                key={st}
                type="button"
                onClick={() => onSelectStatusFilter(isSelected ? 'all' : st)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title={`Filter by ${t(`status.${st}`)}`}
              >
                <span>{t(`status.${st}`)}</span>
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
      </div>
    </section>
  );
}
