import type {
  Platform,
  ContentFormat,
  ContentGoal,
  WorkflowStatus,
  ReviewStatus,
  ContentLinkInput,
} from '@/types/planner';

export interface RecordFormState {
  title: string;
  platforms: Platform[];
  pillarId: string;
  format: ContentFormat | '';
  goal: ContentGoal | '';
  status: WorkflowStatus;
  progress: number;
  publishDate: string;
  publishTime: string;
  publishTimeKnown: boolean;
  hook: string;
  objective: string;
  productionDetail: string;
  cta: string;
  caption: string;
  hashtagsStr: string;
  reviewStatus: ReviewStatus | '';
  notes: string;
  links: ContentLinkInput[];
}

function normalizeText(val: string | null | undefined): string {
  return (val || '').trim();
}

export function areLinksEqual(
  a: ContentLinkInput[] | null | undefined,
  b: ContentLinkInput[] | null | undefined
): boolean {
  const listA = a || [];
  const listB = b || [];

  if (listA.length !== listB.length) return false;

  for (let i = 0; i < listA.length; i++) {
    const itemA = listA[i];
    const itemB = listB[i];

    if (itemA.link_type !== itemB.link_type) return false;
    if ((itemA.platform || null) !== (itemB.platform || null)) return false;
    if (normalizeText(itemA.url) !== normalizeText(itemB.url)) return false;
    if (normalizeText(itemA.label) !== normalizeText(itemB.label)) return false;
  }

  return true;
}

export function arePlatformsEqual(a: Platform[], b: Platform[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

export function isFormDirty(
  initial: RecordFormState,
  current: RecordFormState
): boolean {
  if (normalizeText(initial.title) !== normalizeText(current.title)) return true;
  if (!arePlatformsEqual(initial.platforms, current.platforms)) return true;
  if (normalizeText(initial.pillarId) !== normalizeText(current.pillarId)) return true;
  if ((initial.format || '') !== (current.format || '')) return true;
  if ((initial.goal || '') !== (current.goal || '')) return true;
  if ((initial.status || 'idea') !== (current.status || 'idea')) return true;
  if (initial.progress !== current.progress) return true;
  if (normalizeText(initial.publishDate) !== normalizeText(current.publishDate)) return true;

  // Only compare publishTime if publishDate is set and publishTimeKnown is true
  if (normalizeText(current.publishDate)) {
    if (Boolean(initial.publishTimeKnown) !== Boolean(current.publishTimeKnown)) return true;
    if (current.publishTimeKnown && normalizeText(initial.publishTime) !== normalizeText(current.publishTime)) {
      return true;
    }
  }

  if (normalizeText(initial.hook) !== normalizeText(current.hook)) return true;
  if (normalizeText(initial.objective) !== normalizeText(current.objective)) return true;
  if (normalizeText(initial.productionDetail) !== normalizeText(current.productionDetail)) return true;
  if (normalizeText(initial.cta) !== normalizeText(current.cta)) return true;
  if (normalizeText(initial.caption) !== normalizeText(current.caption)) return true;
  if (normalizeText(initial.hashtagsStr) !== normalizeText(current.hashtagsStr)) return true;
  if ((initial.reviewStatus || '') !== (current.reviewStatus || '')) return true;
  if (normalizeText(initial.notes) !== normalizeText(current.notes)) return true;

  if (!areLinksEqual(initial.links, current.links)) return true;

  return false;
}
