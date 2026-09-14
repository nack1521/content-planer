'use server';

import { createClient } from "@/utils/supabase/server";
import type { Platform, ReferenceAccount } from "@/types/planner";
import { validateUuid, sanitizeTitle, sanitizeOptionalText, validateUrl } from "@/utils/validation";
import { revalidatePath } from "next/cache";

export interface ReferenceAccountInput {
  platform: Platform;
  account_label: string;
  url: string;
  notes?: string | null;
}

const VALID_PLATFORMS: Platform[] = ["tiktok", "instagram", "youtube", "facebook", "x"];

function safeRevalidatePath(path: string, type?: "page" | "layout") {
  try {
    revalidatePath(path, type);
  } catch {
    // safe no-op outside request scope
  }
}

export async function getReferenceAccountsAction(): Promise<{
  accounts: ReferenceAccount[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return { accounts: [], error: "unauthorized" };
    }

    const { data, error } = await supabase
      .from("reference_accounts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return { accounts: [], error: "failed_to_load" };
    }

    return { accounts: (data as ReferenceAccount[]) || [], error: null };
  } catch {
    return { accounts: [], error: "service_error" };
  }
}

export async function createReferenceAccountAction(
  input: ReferenceAccountInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return { success: false, error: "unauthorized" };
    }

    if (!input || !VALID_PLATFORMS.includes(input.platform)) {
      return { success: false, error: "validation_failed" };
    }

    let label: string;
    let validUrl: string;
    let notes: string | null;

    try {
      label = sanitizeTitle(input.account_label);
      validUrl = validateUrl(input.url);
      notes = sanitizeOptionalText(input.notes);
    } catch {
      return { success: false, error: "validation_failed" };
    }

    const { data, error } = await supabase
      .from("reference_accounts")
      .insert({
        user_id: userId,
        platform: input.platform,
        account_label: label,
        url: validUrl,
        notes: notes,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: "db_error" };
    }

    safeRevalidatePath("/ideas");
    safeRevalidatePath("/[locale]/ideas", "page");

    return { success: true, id: data.id };
  } catch {
    return { success: false, error: "service_error" };
  }
}

export async function updateReferenceAccountAction(
  id: string,
  input: Partial<ReferenceAccountInput>
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

    if (input.platform !== undefined) {
      if (!VALID_PLATFORMS.includes(input.platform)) {
        return { success: false, error: "validation_failed" };
      }
      updatePayload.platform = input.platform;
    }

    if (input.account_label !== undefined) {
      try {
        updatePayload.account_label = sanitizeTitle(input.account_label);
      } catch {
        return { success: false, error: "validation_failed" };
      }
    }

    if (input.url !== undefined) {
      try {
        updatePayload.url = validateUrl(input.url);
      } catch {
        return { success: false, error: "validation_failed" };
      }
    }

    if (input.notes !== undefined) {
      try {
        updatePayload.notes = sanitizeOptionalText(input.notes);
      } catch {
        return { success: false, error: "validation_failed" };
      }
    }

    const { data: updated, error } = await supabase
      .from("reference_accounts")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");

    if (error) {
      return { success: false, error: "db_error" };
    }

    if (!updated || updated.length !== 1) {
      return { success: false, error: "not_found" };
    }

    safeRevalidatePath("/ideas");
    safeRevalidatePath("/[locale]/ideas", "page");

    return { success: true };
  } catch {
    return { success: false, error: "service_error" };
  }
}

export async function deleteReferenceAccountAction(
  id: string
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

    const { data: deleted, error } = await supabase
      .from("reference_accounts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");

    if (error) {
      return { success: false, error: "db_error" };
    }

    if (!deleted || deleted.length !== 1) {
      return { success: false, error: "not_found" };
    }

    safeRevalidatePath("/ideas");
    safeRevalidatePath("/[locale]/ideas", "page");

    return { success: true };
  } catch {
    return { success: false, error: "service_error" };
  }
}
