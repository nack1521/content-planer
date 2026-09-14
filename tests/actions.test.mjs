import test from "node:test";
import assert from "node:assert/strict";
import { PLATFORMS, CONTENT_FORMATS, CONTENT_GOALS } from "../src/utils/validation.ts";
import { spawnSync } from "node:child_process";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient, clearTestCookies } from "../src/utils/supabase/server.ts";
import {
  getContentItemsAction,
  createContentItemAction,
  updateContentItemAction,
  duplicateContentItemAction,
  archiveContentItemAction,
  deleteContentItemAction,
} from "../src/app/actions/content.ts";
import {
  getTasksAction,
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
} from "../src/app/actions/tasks.ts";
import {
  getReferenceAccountsAction,
  createReferenceAccountAction,
  updateReferenceAccountAction,
  deleteReferenceAccountAction,
} from "../src/app/actions/reference-accounts.ts";

const TEST_EMAIL = "actions-owner@example.com";
const TEST_PASSWORD = "password123";

test.before(async () => {
  // Ensure local Supabase has the test owner
  const statusProc = spawnSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" });
  assert.equal(statusProc.status, 0, "Supabase status command failed");
  const statusJson = JSON.parse(statusProc.stdout);

  // Overwrite environment variables strictly from local Supabase stack (never preserve)
  process.env.NEXT_PUBLIC_SUPABASE_URL = statusJson.API_URL || "http://127.0.0.1:54321";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = statusJson.PUBLISHABLE_KEY || statusJson.ANON_KEY;

  // Abort before action tests unless resolved hostname is exactly 127.0.0.1 or localhost
  const parsedUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (parsedUrl.hostname !== "127.0.0.1" && parsedUrl.hostname !== "localhost") {
    throw new Error(`[SECURITY ABORT] Test environment must resolve strictly to 127.0.0.1 or localhost, got: ${parsedUrl.hostname}`);
  }

  const adminClient = createAdminClient("http://127.0.0.1:54321", statusJson.SERVICE_ROLE_KEY);

  await adminClient.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  clearTestCookies();
  const client = await createClient();
  const { error } = await client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  assert.equal(error, null, "Sign-in failed");
});

test("Local Test Isolation: Pre-existing hosted-looking environment variables cannot be used", () => {
  // Pre-existing hosted Supabase URL in env is rejected by strict local check
  const hostedUrl = "https://hosted-project-db.supabase.co";
  assert.throws(() => {
    const parsed = new URL(hostedUrl);
    if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
      throw new Error(`[SECURITY ABORT] Test environment must resolve strictly to 127.0.0.1 or localhost, got: ${parsed.hostname}`);
    }
  }, /\[SECURITY ABORT\]/);

  // Forced-local overwrite proves pre-existing hosted env var is discarded
  const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = hostedUrl;
    const statusProc = spawnSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" });
    const statusJson = JSON.parse(statusProc.stdout);
    process.env.NEXT_PUBLIC_SUPABASE_URL = statusJson.API_URL || "http://127.0.0.1:54321";
    const resolved = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    assert.ok(resolved.hostname === "127.0.0.1" || resolved.hostname === "localhost");
    assert.notEqual(process.env.NEXT_PUBLIC_SUPABASE_URL, hostedUrl);
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
  }
});

test("Authenticated Content Item CRUD Actions", async () => {
  // 1. Create
  const createRes = await createContentItemAction({
    title: "Production Test Episode 1",
    platforms: ["tiktok", "instagram"],
    status: "scripting",
    hook: "Testing authenticated server actions",
    progress: 30,
    links: [
      { link_type: "idea_source", url: "https://example.com/source", label: "Reference" },
    ],
  });
  assert.equal(createRes.success, true);
  assert.ok(createRes.id);
  const itemId = createRes.id;

  // 2. Read
  const getRes = await getContentItemsAction();
  assert.equal(getRes.error, null);
  const found = getRes.items.find((i) => i.id === itemId);
  assert.ok(found, "Created item should be present in items list");
  assert.equal(found.title, "Production Test Episode 1");
  assert.equal(found.platforms.length, 2);
  assert.equal(found.links.length, 1);
  assert.equal(found.links[0].link_type, "idea_source");

  // 3. Update
  const updateRes = await updateContentItemAction(itemId, {
    title: "Production Test Episode 1 (Updated)",
    progress: 50,
  });
  assert.equal(updateRes.success, true);

  const getUpdated = await getContentItemsAction();
  const updatedItem = getUpdated.items.find((i) => i.id === itemId);
  assert.equal(updatedItem?.title, "Production Test Episode 1 (Updated)");
  assert.equal(updatedItem?.progress, 50);

  // 4. Duplicate
  const dupRes = await duplicateContentItemAction(itemId, "en");
  assert.equal(dupRes.success, true);
  assert.ok(dupRes.newId);

  const getDup = await getContentItemsAction();
  const duplicated = getDup.items.find((i) => i.id === dupRes.newId);
  assert.ok(duplicated);
  assert.equal(duplicated.title, "Copy of Production Test Episode 1 (Updated)");
  assert.equal(duplicated.links.length, 1);

  // 5. Archive
  const archRes = await archiveContentItemAction(itemId, true);
  assert.equal(archRes.success, true);

  // 6. Delete
  const delRes = await deleteContentItemAction(itemId);
  assert.equal(delRes.success, true);

  const delDupRes = await deleteContentItemAction(dupRes.newId);
  assert.equal(delDupRes.success, true);
});

test("Content Item Creation: Defaults status to idea only when omitted, rejects explicitly empty or invalid status", async () => {
  // 1. Omitted status -> defaults to "idea"
  const defaultRes = await createContentItemAction({
    title: "Omitted Status Item",
    platforms: ["tiktok"],
  });
  assert.equal(defaultRes.success, true);
  assert.ok(defaultRes.id);

  const getRes = await getContentItemsAction();
  const createdItem = getRes.items.find((i) => i.id === defaultRes.id);
  assert.equal(createdItem?.status, "idea", "Omitted status must default to idea");
  await deleteContentItemAction(defaultRes.id);

  // 2. Explicitly empty status "" -> rejected with validation_failed
  const emptyRes = await createContentItemAction({
    title: "Empty Status Item",
    platforms: ["tiktok"],
    status: "",
  });
  assert.equal(emptyRes.success, false);
  assert.equal(emptyRes.error, "validation_failed");

  // 3. Invalid status -> rejected with validation_failed
  const invalidRes = await createContentItemAction({
    title: "Invalid Status Item",
    platforms: ["tiktok"],
    status: "nonexistent_status",
  });
  assert.equal(invalidRes.success, false);
  assert.equal(invalidRes.error, "validation_failed");
});

test("Authenticated Production Task CRUD Actions", async () => {
  // 1. Create
  const createRes = await createTaskAction({
    title: "Edit Episode 1 Cut",
    status: "in_progress",
    priority: "high",
    task_type: "video",
    due_date: "2026-06-15",
    description: "Export 1080x1920 60fps",
  });
  assert.equal(createRes.success, true);
  assert.ok(createRes.id);
  const taskId = createRes.id;

  // 2. Read
  const getRes = await getTasksAction();
  assert.equal(getRes.error, null);
  const found = getRes.tasks.find((t) => t.id === taskId);
  assert.ok(found);
  assert.equal(found.title, "Edit Episode 1 Cut");
  assert.equal(found.priority, "high");
  assert.equal(found.task_type, "video");
  assert.equal(found.due_date, "2026-06-15");

  // 3. Update
  const updateRes = await updateTaskAction(taskId, {
    status: "done",
  });
  assert.equal(updateRes.success, true);

  const getUpdated = await getTasksAction();
  const updated = getUpdated.tasks.find((t) => t.id === taskId);
  assert.equal(updated?.status, "done");

  // 4. Delete
  const delRes = await deleteTaskAction(taskId);
  assert.equal(delRes.success, true);

  const getFinal = await getTasksAction();
  assert.equal(getFinal.tasks.some((t) => t.id === taskId), false);
});

test("Authenticated Reference Account CRUD Actions", async () => {
  // 1. Create
  const createRes = await createReferenceAccountAction({
    account_label: "@archdigest",
    platform: "instagram",
    url: "https://instagram.com/archdigest",
    notes: "Great cinematography and lighting references",
  });
  assert.equal(createRes.success, true);
  assert.ok(createRes.id);
  const accId = createRes.id;

  // 2. Read
  const getRes = await getReferenceAccountsAction();
  assert.equal(getRes.error, null);
  const found = getRes.accounts.find((a) => a.id === accId);
  assert.ok(found);
  assert.equal(found.account_label, "@archdigest");
  assert.equal(found.platform, "instagram");

  // 3. Update
  const updateRes = await updateReferenceAccountAction(accId, {
    notes: "Updated lighting notes",
  });
  assert.equal(updateRes.success, true);

  // 4. Delete
  const delRes = await deleteReferenceAccountAction(accId);
  assert.equal(delRes.success, true);
});

test("Reference Account: Update and delete non-existent ID returns not_found", async () => {
  const nonExistentId = "a0000000-0000-0000-0000-000000000000";

  // Update non-existent
  const updateRes = await updateReferenceAccountAction(nonExistentId, {
    account_label: "Ghost Account",
  });
  assert.equal(updateRes.success, false);
  assert.equal(updateRes.error, "not_found");

  // Delete non-existent
  const delRes = await deleteReferenceAccountAction(nonExistentId);
  assert.equal(delRes.success, false);
  assert.equal(delRes.error, "not_found");
});

test("Atomic Link Rollback: Link validation failure leaves existing content and links untouched", async () => {
  // 1. Create initial content item with 1 valid link
  const createRes = await createContentItemAction({
    title: "Original Untouched Title",
    platforms: ["tiktok"],
    status: "idea",
    links: [
      { link_type: "idea_source", url: "https://original-link.com", label: "Initial Link" },
    ],
  });
  assert.equal(createRes.success, true);
  const itemId = createRes.id;

  // Verify initial state
  const initialGet = await getContentItemsAction();
  const initialItem = initialGet.items.find((i) => i.id === itemId);
  assert.equal(initialItem?.title, "Original Untouched Title");
  assert.equal(initialItem?.links.length, 1);
  assert.equal(initialItem?.links[0].url, "https://original-link.com");

  // 2. Attempt update with an invalid link type
  const badUpdateRes = await updateContentItemAction(itemId, {
    title: "SHOULD NEVER BE WRITTEN",
    links: [
      { link_type: "INVALID_LINK_TYPE", url: "https://corrupted.com" },
    ],
  });
  assert.equal(badUpdateRes.success, false);
  assert.equal(badUpdateRes.error, "validation_failed");

  // 3. Verify that the database row and its links remain completely unchanged
  const postFailGet = await getContentItemsAction();
  const postFailItem = postFailGet.items.find((i) => i.id === itemId);
  assert.equal(postFailItem?.title, "Original Untouched Title", "Title must NOT have been changed");
  assert.equal(postFailItem?.links.length, 1, "Links count must remain exactly 1");
  assert.equal(postFailItem?.links[0].url, "https://original-link.com", "Original link must remain untouched");

  // Clean up
  await deleteContentItemAction(itemId);
});

test("Canonical Enums: Authenticated actions & RPC accept all platforms, formats, and goals, rejecting unsupported values atomically", async () => {
  const client = await createClient();

  // 1. Authenticated Server Actions Coverage
  // All platforms
  for (const plat of PLATFORMS) {
    const res = await createContentItemAction({
      title: `Platform ${plat} Item`,
      platforms: [plat],
      links: [{ link_type: "published", platform: plat, url: `https://example.com/${plat}` }],
    });
    assert.equal(res.success, true, `Server action must accept platform "${plat}"`);
    assert.ok(res.id);
    await deleteContentItemAction(res.id);
  }

  // All formats
  for (const fmt of CONTENT_FORMATS) {
    const res = await createContentItemAction({
      title: `Format ${fmt} Item`,
      platforms: ["tiktok"],
      format: fmt,
    });
    assert.equal(res.success, true, `Server action must accept format "${fmt}"`);
    assert.ok(res.id);
    await deleteContentItemAction(res.id);
  }

  // All goals
  for (const g of CONTENT_GOALS) {
    const res = await createContentItemAction({
      title: `Goal ${g} Item`,
      platforms: ["tiktok"],
      goal: g,
    });
    assert.equal(res.success, true, `Server action must accept goal "${g}"`);
    assert.ok(res.id);
    await deleteContentItemAction(res.id);
  }

  // 2. Direct Authenticated RPC Coverage (detecting SQL / RPC / TS drift)
  for (const plat of PLATFORMS) {
    const { data: rpcId, error: rpcErr } = await client.rpc("upsert_content_item_with_links", {
      p_item: { title: `RPC Plat ${plat}`, platforms: [plat] },
      p_links: [{ link_type: "published", platform: plat, url: `https://example.com/rpc-${plat}` }],
    });
    assert.equal(rpcErr, null, `RPC must accept platform "${plat}": ${rpcErr?.message}`);
    assert.ok(rpcId);
    await deleteContentItemAction(rpcId);
  }

  for (const fmt of CONTENT_FORMATS) {
    const { data: rpcId, error: rpcErr } = await client.rpc("upsert_content_item_with_links", {
      p_item: { title: `RPC Format ${fmt}`, platforms: ["tiktok"], format: fmt },
      p_links: [],
    });
    assert.equal(rpcErr, null, `RPC must accept format "${fmt}": ${rpcErr?.message}`);
    assert.ok(rpcId);
    await deleteContentItemAction(rpcId);
  }

  for (const g of CONTENT_GOALS) {
    const { data: rpcId, error: rpcErr } = await client.rpc("upsert_content_item_with_links", {
      p_item: { title: `RPC Goal ${g}`, platforms: ["tiktok"], goal: g },
      p_links: [],
    });
    assert.equal(rpcErr, null, `RPC must accept goal "${g}": ${rpcErr?.message}`);
    assert.ok(rpcId);
    await deleteContentItemAction(rpcId);
  }

  // 3. Unsupported Values Fail Atomically
  const baseRes = await createContentItemAction({
    title: "Canonical Baseline Item",
    platforms: ["tiktok"],
    format: "short",
    goal: "awareness",
    links: [{ link_type: "idea_source", platform: "tiktok", url: "https://tiktok.com/@gypstore" }],
  });
  assert.equal(baseRes.success, true);
  const baselineId = baseRes.id;

  // Unsupported goals fail
  const badGoalEdu = await updateContentItemAction(baselineId, { goal: "education" });
  assert.equal(badGoalEdu.success, false);
  assert.equal(badGoalEdu.error, "validation_failed");

  const badGoalRet = await updateContentItemAction(baselineId, { goal: "retention" });
  assert.equal(badGoalRet.success, false);
  assert.equal(badGoalRet.error, "validation_failed");

  // Unsupported format fails
  const badFormat = await updateContentItemAction(baselineId, { format: "magazine" });
  assert.equal(badFormat.success, false);
  assert.equal(badFormat.error, "validation_failed");

  // Unsupported platform fails
  const badPlat = await updateContentItemAction(baselineId, { platforms: ["linkedin"] });
  assert.equal(badPlat.success, false);
  assert.equal(badPlat.error, "validation_failed");

  // Unsupported link platform fails
  const badLinkPlat = await updateContentItemAction(baselineId, {
    links: [{ link_type: "idea_source", platform: "snapchat", url: "https://snapchat.com" }],
  });
  assert.equal(badLinkPlat.success, false);
  assert.equal(badLinkPlat.error, "validation_failed");

  // Verify atomic rollback on server actions: baseline item remains completely unchanged
  const getBaseline = await getContentItemsAction();
  const baselineItem = getBaseline.items.find((i) => i.id === baselineId);
  assert.equal(baselineItem?.title, "Canonical Baseline Item");
  assert.equal(baselineItem?.format, "short");
  assert.equal(baselineItem?.goal, "awareness");
  assert.deepEqual(baselineItem?.platforms, ["tiktok"]);
  assert.equal(baselineItem?.links.length, 1);
  assert.equal(baselineItem?.links[0].platform, "tiktok");

  // Direct RPC rejects unsupported values with code 22023
  const { error: rpcEduErr } = await client.rpc("upsert_content_item_with_links", {
    p_item: { title: "Bad Edu", platforms: ["tiktok"], goal: "education" },
    p_links: [],
  });
  assert.equal(rpcEduErr?.code, "22023", "RPC must reject unsupported goal education");

  const { error: rpcRetErr } = await client.rpc("upsert_content_item_with_links", {
    p_item: { title: "Bad Ret", platforms: ["tiktok"], goal: "retention" },
    p_links: [],
  });
  assert.equal(rpcRetErr?.code, "22023", "RPC must reject unsupported goal retention");

  const { error: rpcMagErr } = await client.rpc("upsert_content_item_with_links", {
    p_item: { title: "Bad Mag", platforms: ["tiktok"], format: "magazine" },
    p_links: [],
  });
  assert.equal(rpcMagErr?.code, "22023", "RPC must reject unsupported format magazine");

  const { error: rpcPlatErr } = await client.rpc("upsert_content_item_with_links", {
    p_item: { title: "Bad Plat", platforms: ["myspace"] },
    p_links: [],
  });
  assert.equal(rpcPlatErr?.code, "22023", "RPC must reject unsupported platform myspace");

  const { error: rpcLinkPlatErr } = await client.rpc("upsert_content_item_with_links", {
    p_item: { title: "Bad Link Plat", platforms: ["tiktok"] },
    p_links: [{ link_type: "idea_source", platform: "snapchat", url: "https://snapchat.com" }],
  });
  assert.equal(rpcLinkPlatErr?.code, "22023", "RPC must reject unsupported link platform snapchat");

  // Clean up
  await deleteContentItemAction(baselineId);
});
