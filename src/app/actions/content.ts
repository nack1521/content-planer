"use server";

import { createClient } from "@/utils/supabase/server";
import type {
  ContentItem,
  ContentPillar,
  ContentItemInput,
  ContentLinkInput,
  Platform,
  ContentFormat,
  ContentGoal,
  WorkflowStatus,
  ReviewStatus,
} from "@/types/planner";

export type { ContentItemInput, ContentLinkInput };
import {
  validateUuid,
  sanitizeTitle,
  sanitizeOptionalText,
  validateProgress,
  validatePublishTimeKnown,
  validateIsoDate,
  validateWorkflowStatus,
  validateContentFormat,
  validateContentGoal,
  validateReviewStatus,
  sanitizePlatforms,
  sanitizeHashtags,
  validateLinksArray,
} from "@/utils/validation";
import { revalidatePath } from "next/cache";
import { getUserPreferences } from "@/utils/supabase/preferences";

function safeRevalidatePath(path: string, type?: "page" | "layout") {
  try {
    revalidatePath(path, type);
  } catch {
    // Outside Next.js request scope
  }
}

function revalidateContentPages() {
  safeRevalidatePath("/[locale]/planner", "page");
  safeRevalidatePath("/[locale]/calendar", "page");
  safeRevalidatePath("/[locale]/ideas", "page");
}

interface SupabaseContentItemRow {
  id: string;
  user_id: string;
  content_pillar_id: string | null;
  title: string;
  platforms: Platform[];
  format: string | null;
  goal: string | null;
  status: string;
  progress: number;
  publish_at: string | null;
  publish_time_known: boolean;
  hook: string | null;
  caption: string | null;
  cta: string | null;
  hashtags: string[];
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  source_number: number | null;
  objective: string | null;
  production_detail: string | null;
  review_status: string | null;
  source_content_status: string | null;
  content_pillar?: ContentPillar | null;
  links?: unknown[];
  tasks?: unknown[];
}

export async function getContentPillarsAction(): Promise<{ pillars: ContentPillar[]; error?: string | null }> {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return { pillars: [], error: "unauthorized" };
    }

    const { data, error } = await supabase
      .from("content_pillars")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("getContentPillarsAction error:", error.message);
      return { pillars: [], error: "fetch_error" };
    }

    const pillars: ContentPillar[] = (data || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      name_en: row.name_en,
      name_th: row.name_th,
      color: row.color,
      sort_order: row.sort_order,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return { pillars, error: null };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err && (err as { digest: string }).digest === "DYNAMIC_SERVER_USAGE") {
      throw err;
    }
    console.error("getContentPillarsAction unexpected error:", err);
    return { pillars: [], error: "service_error" };
  }
}

export async function getContentItemsAction(): Promise<{ items: ContentItem[]; error?: string | null }> {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return { items: [], error: "unauthorized" };
    }

    const { data, error } = await supabase
      .from("content_items")
      .select(`
        *,
        content_pillar:content_pillars (*),
        links:content_links!content_item_id (*),
        tasks:production_tasks!content_item_id (*)
      `)
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getContentItemsAction error:", error.message);
      return { items: [], error: "fetch_error" };
    }

    const items: ContentItem[] = ((data as unknown as SupabaseContentItemRow[]) || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      content_pillar_id: row.content_pillar_id,
      title: row.title,
      platforms: row.platforms || ["tiktok"],
      format: row.format as ContentFormat,
      goal: row.goal as ContentGoal,
      status: row.status as WorkflowStatus,
      progress: row.progress ?? 0,
      publish_at: row.publish_at,
      publish_time_known: row.publish_time_known ?? true,
      hook: row.hook,
      caption: row.caption,
      cta: row.cta,
      hashtags: row.hashtags || [],
      notes: row.notes,
      archived_at: row.archived_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      source_number: row.source_number,
      objective: row.objective,
      production_detail: row.production_detail,
      review_status: row.review_status as ReviewStatus,
      source_content_status: row.source_content_status,
      pillar: row.content_pillar || undefined,
      links: (row.links as ContentItem['links']) || [],
      tasks: (row.tasks as ContentItem['tasks']) || [],
    }));

    return { items, error: null };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err && (err as { digest: string }).digest === "DYNAMIC_SERVER_USAGE") {
      throw err;
    }
    console.error("getContentItemsAction unexpected error:", err);
    return { items: [], error: "service_error" };
  }
}

export async function createContentItemAction(
  data: ContentItemInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return { success: false, error: "unauthorized" };
    }

    // Strict runtime validation
    let cleanTitle: string;
    let cleanPlatforms: Platform[];
    let cleanStatus: WorkflowStatus;
    let cleanFormat: ContentFormat | null;
    let cleanGoal: ContentGoal | null;
    let cleanReviewStatus: ReviewStatus | null;
    let cleanProgress: number;
    let cleanPublishAt: string | null;
    let cleanPublishTimeKnown: boolean;
    let cleanHook: string | null;
    let cleanCaption: string | null;
    let cleanCta: string | null;
    let cleanNotes: string | null;
    let cleanObjective: string | null;
    let cleanProdDetail: string | null;
    let cleanHashtags: string[];
    let cleanLinks: ContentLinkInput[];
    let cleanPillarId: string | null = null;

    try {
      cleanTitle = sanitizeTitle(data.title);
      cleanPlatforms = sanitizePlatforms(data.platforms);
      cleanStatus = data.status === undefined ? "idea" : validateWorkflowStatus(data.status);
      cleanFormat = validateContentFormat(data.format);
      cleanGoal = validateContentGoal(data.goal);
      cleanReviewStatus = validateReviewStatus(data.review_status);
      cleanProgress = validateProgress(data.progress);
      cleanPublishAt = validateIsoDate(data.publish_at);
      cleanPublishTimeKnown = data.publish_time_known !== undefined ? validatePublishTimeKnown(data.publish_time_known) : true;
      cleanHook = sanitizeOptionalText(data.hook, 500);
      cleanCaption = sanitizeOptionalText(data.caption, 5000);
      cleanCta = sanitizeOptionalText(data.cta, 500);
      cleanNotes = sanitizeOptionalText(data.notes, 5000);
      cleanObjective = sanitizeOptionalText(data.objective, 1000);
      cleanProdDetail = sanitizeOptionalText(data.production_detail, 2000);
      cleanHashtags = sanitizeHashtags(data.hashtags);
      cleanLinks = validateLinksArray(data.links);

      if (data.content_pillar_id) {
        cleanPillarId = validateUuid(data.content_pillar_id, "content_pillar_id");
      }
    } catch {
      return { success: false, error: "validation_failed" };
    }

    const payload = {
      title: cleanTitle,
      platforms: cleanPlatforms,
      content_pillar_id: cleanPillarId,
      format: cleanFormat,
      goal: cleanGoal,
      status: cleanStatus,
      progress: cleanProgress,
      publish_at: cleanPublishAt,
      publish_time_known: cleanPublishTimeKnown,
      hook: cleanHook,
      caption: cleanCaption,
      cta: cleanCta,
      hashtags: cleanHashtags,
      notes: cleanNotes,
      objective: cleanObjective,
      production_detail: cleanProdDetail,
      review_status: cleanReviewStatus,
    };

    // Atomic transaction via database RPC
    const { data: newId, error } = await supabase.rpc("upsert_content_item_with_links", {
      p_item: payload,
      p_links: cleanLinks,
    });

    if (error || !newId) {
      console.error("createContentItemAction rpc error:", error?.message);
      return { success: false, error: "save_failed" };
    }

    revalidateContentPages();
    return { success: true, id: newId };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err && (err as { digest: string }).digest === "DYNAMIC_SERVER_USAGE") {
      throw err;
    }
    console.error("createContentItemAction unexpected error:", err);
    return { success: false, error: "service_error" };
  }
}

export async function updateContentItemAction(
  id: string,
  data: Partial<ContentItemInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return { success: false, error: "unauthorized" };
    }

    try {
      validateUuid(id);
    } catch {
      return { success: false, error: "invalid_id" };
    }

    const updatePayload: Record<string, unknown> = { id };
    let validatedLinks: ContentLinkInput[] | null = null;

    try {
      if (data.title !== undefined) updatePayload.title = sanitizeTitle(data.title);
      if (data.platforms !== undefined) updatePayload.platforms = sanitizePlatforms(data.platforms);
      if (data.status !== undefined) updatePayload.status = validateWorkflowStatus(data.status);
      if (data.format !== undefined) updatePayload.format = validateContentFormat(data.format);
      if (data.goal !== undefined) updatePayload.goal = validateContentGoal(data.goal);
      if (data.review_status !== undefined) updatePayload.review_status = validateReviewStatus(data.review_status);
      if (data.progress !== undefined) updatePayload.progress = validateProgress(data.progress);
      if (data.publish_at !== undefined) updatePayload.publish_at = validateIsoDate(data.publish_at);
      if (data.publish_time_known !== undefined) updatePayload.publish_time_known = validatePublishTimeKnown(data.publish_time_known);
      if (data.hook !== undefined) updatePayload.hook = sanitizeOptionalText(data.hook, 500);
      if (data.caption !== undefined) updatePayload.caption = sanitizeOptionalText(data.caption, 5000);
      if (data.cta !== undefined) updatePayload.cta = sanitizeOptionalText(data.cta, 500);
      if (data.notes !== undefined) updatePayload.notes = sanitizeOptionalText(data.notes, 5000);
      if (data.objective !== undefined) updatePayload.objective = sanitizeOptionalText(data.objective, 1000);
      if (data.production_detail !== undefined) updatePayload.production_detail = sanitizeOptionalText(data.production_detail, 2000);
      if (data.hashtags !== undefined) updatePayload.hashtags = sanitizeHashtags(data.hashtags);
      if (data.content_pillar_id !== undefined) {
        updatePayload.content_pillar_id = data.content_pillar_id ? validateUuid(data.content_pillar_id, "content_pillar_id") : null;
      }
      if (data.links !== undefined) {
        validatedLinks = validateLinksArray(data.links);
        updatePayload.links_provided = true;
      }
    } catch {
      return { success: false, error: "validation_failed" };
    }

    // Atomic transaction via database RPC
    const { error } = await supabase.rpc("upsert_content_item_with_links", {
      p_item: updatePayload,
      p_links: validatedLinks !== null ? validatedLinks : null,
    });

    if (error) {
      console.error("updateContentItemAction rpc error:", error.message);
      if (error.code === "P0002") {
        return { success: false, error: "not_found" };
      }
      return { success: false, error: "save_failed" };
    }

    revalidateContentPages();
    return { success: true };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err && (err as { digest: string }).digest === "DYNAMIC_SERVER_USAGE") {
      throw err;
    }
    console.error("updateContentItemAction unexpected error:", err);
    return { success: false, error: "service_error" };
  }
}

export async function duplicateContentItemAction(
  id: string,
  locale = "th",
  prefixOverride?: string
): Promise<{ success: boolean; newId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return { success: false, error: "unauthorized" };
    }

    try {
      validateUuid(id);
    } catch {
      return { success: false, error: "invalid_id" };
    }

    const { data: original, error: fetchErr } = await supabase
      .from("content_items")
      .select("*, links:content_links!content_item_id(*)")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !original) {
      return { success: false, error: "not_found" };
    }

    const prefix = prefixOverride || (locale === "th" ? "ฉบับคัดลอกของ " : "Copy of ");
    const newTitle = `${prefix}${original.title}`.slice(0, 500);

    const payload = {
      title: newTitle,
      platforms: original.platforms,
      content_pillar_id: original.content_pillar_id,
      format: original.format,
      goal: original.goal,
      status: "idea",
      progress: 0,
      publish_at: null,
      publish_time_known: false,
      hook: original.hook,
      caption: original.caption,
      cta: original.cta,
      hashtags: original.hashtags,
      notes: original.notes,
      objective: original.objective,
      production_detail: original.production_detail,
      review_status: null,
    };

    const dupLinks = ((original.links as unknown as ContentLinkInput[]) || []).map((l, idx) => ({
      link_type: l.link_type,
      platform: l.platform,
      url: l.url,
      label: l.label,
      sort_order: idx,
    }));

    const { data: newId, error } = await supabase.rpc("upsert_content_item_with_links", {
      p_item: payload,
      p_links: dupLinks,
    });

    if (error || !newId) {
      console.error("duplicateContentItemAction rpc error:", error?.message);
      return { success: false, error: "save_failed" };
    }

    revalidateContentPages();
    return { success: true, newId };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err && (err as { digest: string }).digest === "DYNAMIC_SERVER_USAGE") {
      throw err;
    }
    console.error("duplicateContentItemAction error:", err);
    return { success: false, error: "service_error" };
  }
}

export async function archiveContentItemAction(
  id: string,
  archive = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return { success: false, error: "unauthorized" };
    }

    try {
      validateUuid(id);
    } catch {
      return { success: false, error: "invalid_id" };
    }

    const { data: updated, error } = await supabase
      .from("content_items")
      .update({ archived_at: archive ? new Date().toISOString() : null })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");

    if (error) {
      return { success: false, error: "save_failed" };
    }

    if (!updated || updated.length === 0) {
      return { success: false, error: "not_found" };
    }

    revalidateContentPages();
    return { success: true };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err && (err as { digest: string }).digest === "DYNAMIC_SERVER_USAGE") {
      throw err;
    }
    console.error("archiveContentItemAction error:", err);
    return { success: false, error: "service_error" };
  }
}

export async function deleteContentItemAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return { success: false, error: "unauthorized" };
    }

    try {
      validateUuid(id);
    } catch {
      return { success: false, error: "invalid_id" };
    }

    const { data: deleted, error } = await supabase
      .from("content_items")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");

    if (error) {
      return { success: false, error: "save_failed" };
    }

    if (!deleted || deleted.length === 0) {
      return { success: false, error: "not_found" };
    }

    revalidateContentPages();
    return { success: true };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err && (err as { digest: string }).digest === "DYNAMIC_SERVER_USAGE") {
      throw err;
    }
    console.error("deleteContentItemAction error:", err);
    return { success: false, error: "service_error" };
  }
}

export interface QuickCaptureInput {
  title: string;
  notes?: string | null;
}

export async function quickCaptureIdeaAction(
  data: QuickCaptureInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!data || typeof data !== "object") {
      return { success: false, error: "validation_failed" };
    }

    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return { success: false, error: "unauthorized" };
    }

    // Resolve owner's default platforms only inside quickCaptureIdeaAction
    const prefs = await getUserPreferences(supabase, userId);
    let resolvedPlatforms: Platform[] = ["tiktok"];
    if (prefs?.default_platforms && prefs.default_platforms.length > 0) {
      try {
        resolvedPlatforms = sanitizePlatforms(prefs.default_platforms);
      } catch {
        resolvedPlatforms = ["tiktok"];
      }
    }

    return await createContentItemAction({
      title: data.title,
      notes: data.notes || null,
      platforms: resolvedPlatforms,
      status: "idea",
      publish_at: null,
      publish_time_known: false,
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err && (err as { digest: string }).digest === "DYNAMIC_SERVER_USAGE") {
      throw err;
    }
    console.error("quickCaptureIdeaAction error:", err);
    return { success: false, error: "service_error" };
  }
}
