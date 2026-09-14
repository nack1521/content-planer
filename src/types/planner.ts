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

export type ReviewStatus = 'in_process' | 'revise' | 'approved';

export type Platform = 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'x';

export type ContentFormat = 'short' | 'carousel' | 'long' | 'infographic' | 'story' | 'photo';

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
  source_number?: number | null;
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
  objective?: string | null;
  production_detail?: string | null;
  review_status?: ReviewStatus | null;
  source_content_status?: string | null;
  publish_time_known?: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  links?: ContentLink[];
  tasks?: ProductionTask[];
}

export interface ContentLink {
  id: string;
  user_id?: string;
  content_item_id: string;
  link_type: 'idea_source' | 'asset' | 'published' | 'note';
  platform: Platform | null;
  url: string;
  label: string | null;
  sort_order?: number;
  created_at: string;
}

export type TaskStatus = 'not_started' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskType = 'video' | 'photo' | 'post' | 'other';

export interface ProductionTask {
  id: string;
  user_id?: string;
  content_item_id: string | null;
  title: string;
  status: TaskStatus;
  due_date: string | null;
  priority: TaskPriority | null;
  task_type: TaskType | null;
  description: string | null;
  import_key: string | null;
  created_at: string;
  updated_at: string;
  content_item?: {
    id: string;
    title: string;
    source_number: number | null;
  } | null;
}

export interface ReferenceAccount {
  id: string;
  user_id?: string;
  platform: Platform;
  account_label: string | null;
  url: string;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
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

export interface ContentLinkInput {
  id?: string;
  link_type: 'idea_source' | 'asset' | 'published' | 'note';
  platform?: Platform | null;
  url: string;
  label?: string | null;
  sort_order?: number;
}

export interface ContentItemInput {
  title: string;
  platforms?: Platform[];
  content_pillar_id?: string | null;
  format?: ContentFormat | null;
  goal?: ContentGoal | null;
  status?: WorkflowStatus;
  progress?: number;
  publish_at?: string | null;
  publish_time_known?: boolean;
  hook?: string | null;
  objective?: string | null;
  production_detail?: string | null;
  cta?: string | null;
  caption?: string | null;
  hashtags?: string[];
  review_status?: ReviewStatus | null;
  source_content_status?: string | null;
  notes?: string | null;
  links?: ContentLinkInput[];
}
