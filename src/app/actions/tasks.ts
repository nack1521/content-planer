"use server";

import { createClient } from "@/utils/supabase/server";
import type { ProductionTask, TaskStatus, TaskPriority, TaskType } from "@/types/planner";
import {
  validateUuid,
  sanitizeTitle,
  sanitizeOptionalText,
  validateDateOnly,
  validateTaskStatus,
  validateTaskPriority,
  validateTaskType,
} from "@/utils/validation";
import { revalidatePath } from "next/cache";

function safeRevalidatePath(path: string, type?: 'page' | 'layout') {
  try {
    revalidatePath(path, type);
  } catch {
    // Outside Next.js request scope
  }
}

interface SupabaseProductionTaskRow {
  id: string;
  user_id: string;
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

export async function getTasksAction(): Promise<{ tasks: ProductionTask[]; error?: string | null }> {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return { tasks: [], error: "unauthorized" };
    }

    const { data, error } = await supabase
      .from("production_tasks")
      .select(`
        *,
        content_item:content_items!content_item_id (id, title, source_number)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getTasksAction error:", error.message);
      return { tasks: [], error: "fetch_error" };
    }

    const tasks: ProductionTask[] = ((data as unknown as SupabaseProductionTaskRow[]) || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      content_item_id: row.content_item_id,
      title: row.title,
      status: row.status,
      due_date: row.due_date,
      priority: row.priority,
      task_type: row.task_type,
      description: row.description,
      import_key: row.import_key,
      created_at: row.created_at,
      updated_at: row.updated_at,
      content_item: row.content_item || null,
    }));

    return { tasks, error: null };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err && (err as { digest: string }).digest === "DYNAMIC_SERVER_USAGE") {
      throw err;
    }
    console.error("getTasksAction unexpected error:", err);
    return { tasks: [], error: "service_error" };
  }
}

export interface TaskInput {
  title: string;
  status: TaskStatus;
  priority?: TaskPriority | null;
  task_type?: TaskType | null;
  due_date?: string | null;
  description?: string | null;
  content_item_id?: string | null;
}

export async function createTaskAction(
  data: TaskInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return { success: false, error: "unauthorized" };
    }

    let cleanTitle: string;
    let status: TaskStatus;
    let cleanPriority: TaskPriority | null;
    let cleanType: TaskType | null;
    let cleanDueDate: string | null;
    let cleanDesc: string | null;
    let cleanItemId: string | null = null;

    try {
      cleanTitle = sanitizeTitle(data.title);
      status = validateTaskStatus(data.status);
      cleanPriority = validateTaskPriority(data.priority);
      cleanType = validateTaskType(data.task_type);
      cleanDueDate = validateDateOnly(data.due_date, "due_date");
      cleanDesc = sanitizeOptionalText(data.description, 5000);

      if (data.content_item_id) {
        cleanItemId = validateUuid(data.content_item_id, "content_item_id");
        // Ensure content item exists and belongs to this user
        const { data: itemCheck, error: itemErr } = await supabase
          .from("content_items")
          .select("id")
          .eq("id", cleanItemId)
          .eq("user_id", userId)
          .single();
        if (itemErr || !itemCheck) {
          return { success: false, error: "content_item_not_found" };
        }
      }
    } catch {
      return { success: false, error: "validation_failed" };
    }

    const { data: created, error } = await supabase
      .from("production_tasks")
      .insert({
        user_id: userId,
        title: cleanTitle,
        status,
        priority: cleanPriority,
        task_type: cleanType,
        due_date: cleanDueDate,
        description: cleanDesc,
        content_item_id: cleanItemId,
      })
      .select("id")
      .single();

    if (error || !created) {
      console.error("createTaskAction error:", error?.message);
      return { success: false, error: "save_failed" };
    }

    safeRevalidatePath("/[locale]/tasks", "page");
    return { success: true, id: created.id };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err && (err as { digest: string }).digest === "DYNAMIC_SERVER_USAGE") {
      throw err;
    }
    console.error("createTaskAction unexpected error:", err);
    return { success: false, error: "service_error" };
  }
}

export async function updateTaskAction(
  id: string,
  data: Partial<TaskInput>
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

    const updatePayload: Record<string, unknown> = {};

    try {
      if (data.title !== undefined) updatePayload.title = sanitizeTitle(data.title);
      if (data.status !== undefined) updatePayload.status = validateTaskStatus(data.status);
      if (data.priority !== undefined) updatePayload.priority = validateTaskPriority(data.priority);
      if (data.task_type !== undefined) updatePayload.task_type = validateTaskType(data.task_type);
      if (data.due_date !== undefined) updatePayload.due_date = validateDateOnly(data.due_date, "due_date");
      if (data.description !== undefined) updatePayload.description = sanitizeOptionalText(data.description, 5000);

      if (data.content_item_id !== undefined) {
        if (data.content_item_id) {
          const cleanItemId = validateUuid(data.content_item_id, "content_item_id");
          const { data: itemCheck, error: itemErr } = await supabase
            .from("content_items")
            .select("id")
            .eq("id", cleanItemId)
            .eq("user_id", userId)
            .single();
          if (itemErr || !itemCheck) {
            return { success: false, error: "content_item_not_found" };
          }
          updatePayload.content_item_id = cleanItemId;
        } else {
          updatePayload.content_item_id = null;
        }
      }
    } catch {
      return { success: false, error: "validation_failed" };
    }

    const { data: updatedRows, error } = await supabase
      .from("production_tasks")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");

    if (error) {
      console.error("updateTaskAction error:", error.message);
      return { success: false, error: "save_failed" };
    }

    if (!updatedRows || updatedRows.length === 0) {
      return { success: false, error: "not_found" };
    }

    safeRevalidatePath("/[locale]/tasks", "page");
    return { success: true };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err && (err as { digest: string }).digest === "DYNAMIC_SERVER_USAGE") {
      throw err;
    }
    console.error("updateTaskAction unexpected error:", err);
    return { success: false, error: "service_error" };
  }
}

export async function deleteTaskAction(id: string): Promise<{ success: boolean; error?: string }> {
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

    const { data: deletedRows, error } = await supabase
      .from("production_tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");

    if (error) {
      console.error("deleteTaskAction error:", error.message);
      return { success: false, error: "save_failed" };
    }

    if (!deletedRows || deletedRows.length === 0) {
      return { success: false, error: "not_found" };
    }

    safeRevalidatePath("/[locale]/tasks", "page");
    return { success: true };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err && (err as { digest: string }).digest === "DYNAMIC_SERVER_USAGE") {
      throw err;
    }
    console.error("deleteTaskAction unexpected error:", err);
    return { success: false, error: "service_error" };
  }
}
