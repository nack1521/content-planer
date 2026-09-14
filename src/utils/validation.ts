import type {
  WorkflowStatus,
  ReviewStatus,
  ContentFormat,
  ContentGoal,
  Platform,
  TaskStatus,
  TaskPriority,
  TaskType,
  ContentLink,
} from "../types/planner";

export const WORKFLOW_STATUSES: WorkflowStatus[] = [
  "idea",
  "researching",
  "scripting",
  "recording",
  "editing",
  "reviewing",
  "scheduled",
  "published",
];

export const REVIEW_STATUSES: ReviewStatus[] = ["in_process", "revise", "approved"];

export const CONTENT_FORMATS: ContentFormat[] = [
  "short",
  "carousel",
  "long",
  "infographic",
  "story",
  "photo",
];

export const CONTENT_GOALS: ContentGoal[] = [
  "awareness",
  "engagement",
  "growth",
  "leads",
  "conversion",
];

export const PLATFORMS: Platform[] = ["tiktok", "instagram", "youtube", "facebook", "x"];

export const LINK_TYPES = ["idea_source", "asset", "published", "note"] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export const TASK_STATUSES: TaskStatus[] = ["not_started", "in_progress", "done"];
export const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
export const TASK_TYPES: TaskType[] = ["video", "photo", "post", "other"];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(val: unknown): val is string {
  return typeof val === "string" && UUID_REGEX.test(val);
}

export function validateUuid(val: unknown, fieldName = "id"): string {
  if (!isValidUuid(val)) {
    throw new Error(`Invalid ${fieldName}: must be a valid UUID`);
  }
  return val;
}

export function sanitizeTitle(val: unknown, maxLen = 500): string {
  if (typeof val !== "string") {
    throw new Error("Title is required and must be a string");
  }
  const trimmed = val.trim();
  if (trimmed.length === 0) {
    throw new Error("Title is required and cannot be empty");
  }
  if (trimmed.length > maxLen) {
    throw new Error(`Title exceeds maximum allowed length of ${maxLen} characters`);
  }
  return trimmed;
}

export function sanitizeOptionalText(val: unknown, maxLen = 5000): string | null {
  if (val === undefined || val === null) return null;
  if (typeof val !== "string") {
    throw new Error(`Invalid text type: expected string, got ${typeof val}`);
  }
  const trimmed = val.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLen) {
    throw new Error(`Text exceeds maximum allowed length of ${maxLen} characters (length: ${trimmed.length})`);
  }
  return trimmed;
}

export function validateProgress(val: unknown): number {
  if (val === undefined || val === null) return 0;
  if (typeof val !== "number" || !Number.isFinite(val)) {
    throw new Error("Progress must be a finite number between 0 and 100");
  }
  const rounded = Math.round(val);
  if (rounded < 0 || rounded > 100) {
    throw new Error("Progress must be between 0 and 100");
  }
  return rounded;
}

export function validatePublishTimeKnown(val: unknown): boolean {
  if (typeof val !== "boolean") {
    throw new Error("publish_time_known must be a boolean");
  }
  return val;
}

export function isValidUrl(val: unknown): boolean {
  if (typeof val !== "string") return false;
  try {
    const parsed = new URL(val.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateUrl(val: unknown, fieldName = "url"): string {
  if (!isValidUrl(val)) {
    throw new Error(`${fieldName} must be a valid http or https URL`);
  }
  return (val as string).trim();
}

export function sanitizePlatforms(val: unknown): Platform[] {
  if (!Array.isArray(val) || val.length === 0) {
    throw new Error("At least one valid platform must be selected");
  }
  const set = new Set<Platform>();
  for (const item of val) {
    if (typeof item === "string" && (PLATFORMS as string[]).includes(item)) {
      set.add(item as Platform);
    } else {
      throw new Error(`Invalid platform: ${String(item)}`);
    }
  }
  return Array.from(set);
}

export function sanitizeHashtags(val: unknown): string[] {
  if (val === undefined || val === null) return [];
  if (!Array.isArray(val)) {
    throw new Error("Hashtags must be an array of strings");
  }
  const tags: string[] = [];
  for (const item of val) {
    if (typeof item === "string") {
      const clean = item.trim().replace(/^#+/, "").trim();
      if (clean.length > 0) {
        if (clean.length > 100) {
          throw new Error(`Hashtag exceeds maximum length of 100 characters: ${clean}`);
        }
        tags.push(`#${clean}`);
      }
    } else {
      throw new Error("Invalid hashtag item: must be a string");
    }
  }
  if (tags.length > 50) {
    throw new Error("Cannot specify more than 50 hashtags");
  }
  return tags;
}

/**
 * Validates a genuine calendar date in YYYY-MM-DD format.
 * Strictly verifies real calendar days, accounting for leap years and month boundaries (rejects Feb 30, Apr 31, etc.).
 */
export function isValidDateOnly(val: unknown): boolean {
  if (typeof val !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val.trim());
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth = [
    31,
    isLeap ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return day <= daysInMonth[month - 1];
}

export function validateDateOnly(val: unknown, fieldName = "due_date"): string | null {
  if (val === undefined || val === null || val === "") return null;
  if (!isValidDateOnly(val)) {
    throw new Error(`${fieldName} must be a valid calendar date in YYYY-MM-DD format`);
  }
  return (val as string).trim();
}

/**
 * Validates an ISO-8601 timestamp string with genuine calendar date verification.
 */
export function isValidIsoDate(val: unknown): boolean {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.exec(trimmed);
  if (!match) return false;

  const datePart = `${match[1]}-${match[2]}-${match[3]}`;
  if (!isValidDateOnly(datePart)) return false;

  const d = new Date(trimmed);
  return !isNaN(d.getTime());
}

export function validateIsoDate(val: unknown, fieldName = "publish_at"): string | null {
  if (val === undefined || val === null || val === "") return null;
  if (!isValidIsoDate(val)) {
    throw new Error(`${fieldName} must be a valid ISO-8601 date-time string with a genuine calendar date`);
  }
  return new Date(val as string).toISOString();
}

export function validateWorkflowStatus(val: unknown): WorkflowStatus {
  if (typeof val !== "string" || !(WORKFLOW_STATUSES as string[]).includes(val)) {
    throw new Error(`Invalid status: "${String(val)}". Expected one of: ${WORKFLOW_STATUSES.join(", ")}`);
  }
  return val as WorkflowStatus;
}

export function validateTaskStatus(val: unknown): TaskStatus {
  if (typeof val !== "string" || !(TASK_STATUSES as string[]).includes(val)) {
    throw new Error(`Invalid task status: "${String(val)}". Expected one of: ${TASK_STATUSES.join(", ")}`);
  }
  return val as TaskStatus;
}

export function validateTaskPriority(val: unknown): TaskPriority | null {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val !== "string" || !(TASK_PRIORITIES as string[]).includes(val)) {
    throw new Error(`Invalid task priority: "${String(val)}". Expected one of: ${TASK_PRIORITIES.join(", ")}`);
  }
  return val as TaskPriority;
}

export function validateTaskType(val: unknown): TaskType | null {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val !== "string" || !(TASK_TYPES as string[]).includes(val)) {
    throw new Error(`Invalid task type: "${String(val)}". Expected one of: ${TASK_TYPES.join(", ")}`);
  }
  return val as TaskType;
}

export function validateContentFormat(val: unknown): ContentFormat | null {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val !== "string" || !(CONTENT_FORMATS as string[]).includes(val)) {
    throw new Error(`Invalid format: "${String(val)}"`);
  }
  return val as ContentFormat;
}

export function validateContentGoal(val: unknown): ContentGoal | null {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val !== "string" || !(CONTENT_GOALS as string[]).includes(val)) {
    throw new Error(`Invalid goal: "${String(val)}"`);
  }
  return val as ContentGoal;
}

export function validateReviewStatus(val: unknown): ReviewStatus | null {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val !== "string" || !(REVIEW_STATUSES as string[]).includes(val)) {
    throw new Error(`Invalid review status: "${String(val)}"`);
  }
  return val as ReviewStatus;
}

export function validateContentLink(val: unknown): Omit<ContentLink, "id" | "content_item_id" | "created_at"> {
  if (!val || typeof val !== "object") {
    throw new Error("Link item must be an object");
  }
  const obj = val as Record<string, unknown>;
  const linkType = obj.link_type;
  if (typeof linkType !== "string" || !(LINK_TYPES as readonly string[]).includes(linkType)) {
    throw new Error(`Invalid link_type: "${String(linkType)}". Expected one of: ${LINK_TYPES.join(", ")}`);
  }

  const url = validateUrl(obj.url, "Link URL");
  let platform: Platform | null = null;
  if (obj.platform !== undefined && obj.platform !== null && obj.platform !== "") {
    if (typeof obj.platform !== "string" || !(PLATFORMS as string[]).includes(obj.platform)) {
      throw new Error(`Invalid link platform: "${String(obj.platform)}"`);
    }
    platform = obj.platform as Platform;
  }

  const label = sanitizeOptionalText(obj.label, 200);
  const sortOrder = typeof obj.sort_order === "number" && Number.isFinite(obj.sort_order) ? obj.sort_order : 0;

  return {
    link_type: linkType as LinkType,
    url,
    platform,
    label,
    sort_order: sortOrder,
  };
}

export function validateLinksArray(val: unknown): Array<Omit<ContentLink, "id" | "content_item_id" | "created_at">> {
  if (val === undefined || val === null) return [];
  if (!Array.isArray(val)) {
    throw new Error("Links must be an array");
  }
  return val.map((item) => validateContentLink(item));
}
