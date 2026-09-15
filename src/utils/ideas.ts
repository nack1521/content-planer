import type { ContentItem } from "@/types/planner";

/**
 * Predicate determining whether a record is an unscheduled idea:
 * - Non-archived (!archived_at)
 * - Workflow status is strictly "idea"
 * - Has no publication schedule (!publish_at)
 */
export function isUnscheduledIdea(
  item: Pick<ContentItem, "status" | "publish_at" | "archived_at">
): boolean {
  return !item.archived_at && item.status === "idea" && !item.publish_at;
}

/**
 * Filters a list of content items to only non-archived unscheduled ideas.
 */
export function filterUnscheduledIdeas(items: ContentItem[]): ContentItem[] {
  return items.filter(isUnscheduledIdea);
}
