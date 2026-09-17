import type { ContentItem, Locale, WorkflowStatus } from '@/types/planner';

export const PLANNER_PAGE_SIZE = 25;

export type PlannerSortKey =
  | 'title'
  | 'platform'
  | 'pillar'
  | 'formatGoal'
  | 'schedule'
  | 'status'
  | 'progress';

export type PlannerSort = { key: PlannerSortKey; direction: 'asc' | 'desc' };

const WORKFLOW_ORDER: WorkflowStatus[] = [
  'idea', 'researching', 'scripting', 'recording',
  'editing', 'reviewing', 'scheduled', 'published',
];

function sortValue(item: ContentItem, key: PlannerSortKey, locale: Locale): string | number | null {
  switch (key) {
    case 'title':
      return item.title;
    case 'platform':
      return [...item.platforms].sort().join(', ');
    case 'pillar':
      return item.pillar?.[locale === 'th' ? 'name_th' : 'name_en'] ?? null;
    case 'formatGoal':
      return item.format ? `${item.format} ${item.goal ?? ''}` : item.goal;
    case 'schedule':
      return item.publish_at ? Date.parse(item.publish_at) : null;
    case 'status':
      return WORKFLOW_ORDER.indexOf(item.status);
    case 'progress':
      return item.progress;
  }
}

export function sortPlannerItems(items: ContentItem[], sort: PlannerSort | null, locale: Locale): ContentItem[] {
  if (!sort) return items;

  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
  return items
    .map((item, index) => ({ item, index, value: sortValue(item, sort.key, locale) }))
    .sort((a, b) => {
      // Unscheduled and missing values stay at the end in both directions.
      if (a.value == null) return b.value == null ? a.index - b.index : 1;
      if (b.value == null) return -1;

      const comparison = typeof a.value === 'number' && typeof b.value === 'number'
        ? a.value - b.value
        : collator.compare(String(a.value), String(b.value));
      return comparison === 0 ? a.index - b.index : comparison * (sort.direction === 'asc' ? 1 : -1);
    })
    .map(({ item }) => item);
}

export function getPlannerPage(items: ContentItem[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / PLANNER_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.trunc(requestedPage) || 1), totalPages);
  const start = (page - 1) * PLANNER_PAGE_SIZE;
  return {
    items: items.slice(start, start + PLANNER_PAGE_SIZE),
    page,
    totalPages,
    start: items.length ? start + 1 : 0,
    end: Math.min(start + PLANNER_PAGE_SIZE, items.length),
  };
}
