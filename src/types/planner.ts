export type Locale = 'th' | 'en';

export type WorkflowStatus =
  | 'idea'
  | 'researching'
  | 'scripting'
  | 'recording'
  | 'editing'
  | 'reviewing'
  | 'scheduled'
  | 'published';

export type Platform = 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'x';

export type ContentFormat = 'short' | 'carousel' | 'long' | 'infographic' | 'story';

export type ContentGoal = 'awareness' | 'engagement' | 'growth' | 'leads' | 'conversion';

export interface ContentPillar {
  id: string;
  name_en: string;
  name_th: string;
  color: string;
  sort_order: number;
}

export interface ContentItem {
  id: string;
  user_id?: string;
  title: string;
  platforms: Platform[];
  content_pillar_id: string | null;
  pillar?: ContentPillar;
  format: ContentFormat | null;
  goal: ContentGoal | null;
  status: WorkflowStatus;
  progress: number; // 0..100
  publish_at: string | null; // ISO-8601 string
  hook: string | null;
  caption: string | null;
  cta: string | null;
  hashtags: string[];
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlannerFilterState {
  search: string;
  platform: string; // 'all' or Platform
  status: string; // 'all' or WorkflowStatus
  pillarId: string; // 'all' or pillar.id
  format: string; // 'all' or ContentFormat
  goal: string; // 'all' or ContentGoal
}

export interface PlannerStats {
  plannedToday: number;
  plannedThisMonth: number;
  inProduction: number;
  ideasCaptured: number;
  readyToPublish: number;
  publishedThisMonth: number;
  stageCounts: Record<WorkflowStatus, number>;
}
