#!/usr/bin/env node

/**
 * =============================================================================
 * Safe Data Importer for Content Planner (Milestone 3)
 *
 * Rules:
 * 1. Default mode is DRY-RUN ONLY. Writes require explicit --commit flag.
 * 2. Strictly local execution guard: rejects any non-local Supabase URL;
 *    hosted imports are strictly disabled until a separately approved milestone.
 * 3. Never commit source files, private URLs, or secret credentials.
 * 4. Strictly checks and halts on EVERY Supabase query, insert, update, and delete error.
 * 5. Counters increment only on verified successful operations.
 * 6. Date safety: requires complete 1-to-1 reviewed date decisions for all warnings.
 * 7. Executes under RLS using authenticated user session or local admin credentials.
 * 8. Uses atomic database functions to prevent partial content/link writes.
 * =============================================================================
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function isValidCalendarDate(val) {
  if (typeof val !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val.trim());
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    excelPath: null,
    csvPath: null,
    commit: false,
    decisionsPath: null,
    email: null,
  };

  const allowedFlags = new Set(["--excel", "--csv", "--commit", "--decisions", "--email", "--help", "-h"]);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!allowedFlags.has(arg)) {
      console.error(`\n[ERROR] Unknown or unsupported argument: "${arg}".`);
      console.error("Supported arguments: --excel <path>, --csv <path>, --commit, --decisions <path>, --email <email>");
      process.exit(1);
    }

    if (arg === "--excel") {
      if (!args[i + 1] || args[i + 1].startsWith("--")) {
        console.error("\n[ERROR] Argument --excel requires a file path.");
        process.exit(1);
      }
      options.excelPath = resolve(args[++i]);
    } else if (arg === "--csv") {
      if (!args[i + 1] || args[i + 1].startsWith("--")) {
        console.error("\n[ERROR] Argument --csv requires a file path.");
        process.exit(1);
      }
      options.csvPath = resolve(args[++i]);
    } else if (arg === "--commit") {
      options.commit = true;

    } else if (arg === "--decisions") {
      if (!args[i + 1] || args[i + 1].startsWith("--")) {
        console.error("\n[ERROR] Argument --decisions requires a file path.");
        process.exit(1);
      }
      options.decisionsPath = resolve(args[++i]);
    } else if (arg === "--email") {
      if (!args[i + 1] || args[i + 1].startsWith("--")) {
        console.error("\n[ERROR] Argument --email requires an email address.");
        process.exit(1);
      }
      options.email = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node scripts/import-data.mjs --excel <path> --csv <path> [--commit] [--decisions <path>] [--email <email>]");
      process.exit(0);
    }
  }

  return options;
}

function checkError(error, context) {
  if (error) {
    throw new Error(`[DB ERROR] ${context}: ${error.message} (code: ${error.code || "UNKNOWN"})'`);
  }
}

async function main() {
  const options = parseArgs();

  console.log("================================================================");
  console.log("            CONTENT PLANNER DATA IMPORTER (MILESTONE 3)         ");
  console.log("================================================================");
  console.log(`Execution Mode:  ${options.commit ? ">>> COMMIT (WRITE TO DATABASE) <<<" : "DRY-RUN (NO WRITES)"}`);

  // Read environment variables from .env.local
  const envPath = resolve(process.cwd(), ".env.local");
  let envVars = {};
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        envVars[match[1].trim()] = match[2].trim();
      }
    }
  }

  // Discover local Supabase development configuration
  const statusProc = spawnSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" });
  const statusJson = statusProc.status === 0 && statusProc.stdout ? JSON.parse(statusProc.stdout) : {};

  // Credentials and URL from env or locally discovered Supabase development configuration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || statusJson.API_URL || envVars.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  if (supabaseUrl) {
    const parsedUrl = new URL(supabaseUrl);
    const isLocalHost = parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "localhost";
    if (!isLocalHost) {
      console.error(`\n[SECURITY ABORT] Milestone 3 importer cannot run against non-local host: "${parsedUrl.hostname}".`);
      console.error("All imports in Milestone 3 must strictly target local Supabase (127.0.0.1 or localhost).");
      console.error("Hosted imports are strictly disabled until a separately approved hosted-import milestone.");
      process.exit(1);
    }
  }

  if (!options.excelPath || !options.csvPath) {
    console.error("\n[ERROR] Missing required arguments:");
    console.error("  --excel <path to Content Planner.xlsx>");
    console.error("  --csv   <path to Gypstore Notion.csv>");
    console.error("Example:");
    console.error("  node scripts/import-data.mjs --excel \"/Users/nack/Downloads/Content Planner.xlsx\" --csv \"/Users/nack/Downloads/Gypstore 3a3f713029ef804d8a70e7bc36247cfb.csv\"\n");
    process.exit(1);
  }

  if (!existsSync(options.excelPath)) {
    console.error(`\n[ERROR] Excel source file does not exist: ${options.excelPath}`);
    process.exit(1);
  }

  if (!existsSync(options.csvPath)) {
    console.error(`\n[ERROR] Notion CSV source file does not exist: ${options.csvPath}`);
    process.exit(1);
  }

  console.log(`\nSources:`);
  console.log(`  - Excel:  ${basename(options.excelPath)}`);
  console.log(`  - CSV:    ${basename(options.csvPath)}`);

  // 1. Parse sources via python parser
  console.log(`\nParsing external source files...`);
  const parserProc = spawnSync("python3", [
    resolve(process.cwd(), "scripts/parse-sources.py"),
    options.excelPath,
    options.csvPath,
  ], {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });

  if (parserProc.status !== 0) {
    console.error(`\n[ERROR] Parser script failed:`, parserProc.stderr);
    process.exit(1);
  }

  const parsedData = JSON.parse(parserProc.stdout);
  const excel = parsedData.data.excel;
  const csv = parsedData.data.csv;

  // 2. Summary of extracted entities
  console.log(`\nParsed Entity Summary:`);
  console.log(`  - Automatic Content Candidates: ${excel.auto_candidates.length}`);
  console.log(`  - Incomplete Row Flagged:       ${excel.incomplete_rows.length}`);
  console.log(`  - Empty Placeholder Rows:       ${excel.placeholder_rows.length}`);
  console.log(`  - Embedded Links Extracted:     ${excel.all_links.length}`);
  console.log(`  - Reference Accounts:           ${excel.reference_accounts.length}`);
  console.log(`  - Notion Production Tasks:      ${csv.linked_tasks.length} linked, ${csv.standalone_tasks.length} standalone, ${csv.skipped_blank_tasks?.length ?? 0} skipped blank`);

  // 3. Date Review Audit Table
  console.log("\n================================================================");
  console.log("                   PUBLICATION DATE REVIEW REPORT               ");
  console.log("================================================================");
  const warnings = excel.date_reviews.filter(d => d.warning !== "OK");
  const verifiedDates = excel.date_reviews.filter(d => d.warning === "OK");

  console.log(`Total Dates Checked: ${excel.date_reviews.length}`);
  console.log(`  - Consistent (OK):  ${verifiedDates.length}`);
  console.log(`  - Flagged Warnings: ${warnings.length}`);

  if (warnings.length > 0) {
    console.log("\nFlagged Ambiguous Dates Requiring Explicit Review:");
    console.log("No. | Visual Month | Proposed Date | Warning Reason");
    console.log("----+--------------+---------------+-------------------------------------");
    for (const w of warnings) {
      console.log(
        `${String(w.source_number).padEnd(3)} | ` +
        `${(w.month_group || "").padEnd(12)} | ` +
        `${(w.proposed_date || "NONE").padEnd(13)} | ` +
        `${w.warning}`
      );
    }
  }

  // Check and strictly validate decisions file if commit is requested
  const decisionsMap = new Map();
  if (options.decisionsPath) {
    if (!existsSync(options.decisionsPath)) {
      console.error(`\n[ERROR] Decisions file not found: ${options.decisionsPath}`);
      process.exit(1);
    }
    const rawText = readFileSync(options.decisionsPath, "utf8");

    // Detect duplicate keys in JSON
    const keyRegex = /"(\d+)":/g;
    const seenRawKeys = new Set();
    let kMatch;
    while ((kMatch = keyRegex.exec(rawText)) !== null) {
      const k = kMatch[1];
      if (seenRawKeys.has(k)) {
        console.error(`\n[ERROR] Duplicate decision key in decisions file: "${k}"`);
        process.exit(1);
      }
      seenRawKeys.add(k);
    }

    let rawDecisions;
    try {
      rawDecisions = JSON.parse(rawText);
    } catch (parseErr) {
      console.error(`\n[ERROR] Failed to parse decisions file as JSON: ${parseErr.message}`);
      process.exit(1);
    }

    const warningSourceNumbers = new Set(warnings.map(w => w.source_number));

    // Validate decisions entries
    for (const [k, v] of Object.entries(rawDecisions)) {
      const srcNum = Number(k);
      if (isNaN(srcNum)) {
        console.error(`\n[ERROR] Invalid source number key in decisions file: "${k}"`);
        process.exit(1);
      }

      // Check for extra unexpected decisions
      if (!warningSourceNumbers.has(srcNum)) {
        console.error(`\n[ERROR] Extra unexpected decision for content item #${srcNum}: no warning exists for this item.`);
        process.exit(1);
      }

      // Validate decision value: must be null or genuine calendar date
      if (v !== null) {
        if (typeof v !== "string" || !isValidCalendarDate(v)) {
          console.error(`\n[ERROR] Invalid date decision for content item #${srcNum}: "${v}". Must be a valid calendar date (YYYY-MM-DD) or null.`);
          process.exit(1);
        }
      }

      decisionsMap.set(srcNum, v);
    }

    console.log(`\nLoaded and validated ${decisionsMap.size} reviewed date decisions from ${basename(options.decisionsPath)}`);
  }

  // 4. Dry-Run Verdict
  if (!options.commit) {
    console.log("\n================================================================");
    console.log("                        DRY-RUN VERDICT                         ");
    console.log("================================================================");
    console.log("Dry-run preview completed successfully.");
    console.log("No database records were created or modified.");
    console.log(`Audited baseline match: ${excel.auto_candidates.length === 158 && csv.linked_tasks.length === 12 && csv.standalone_tasks.length === 4 ? "VERIFIED (100% MATCH)" : "MISMATCH"}`);
    console.log("To commit records to local Supabase, resolve date review findings and provide --commit flag.");
    console.log("================================================================\n");
    return;
  }

  // 5. Commit Mode Safety Guards: Complete 1-to-1 decision enforcement
  if (warnings.length > 0) {
    if (!options.decisionsPath) {
      console.error(`\n[SAFETY STOP] Refusing to commit records with ${warnings.length} ambiguous date warnings.`);
      console.error("The importer requires a reviewed decisions file before writing ambiguous dates to the database.");
      console.error("Provide a decisions file via --decisions <path> or resolve ambiguous dates first.");
      process.exit(1);
    }

    // Ensure EVERY single warning has an entry
    const missingDecisions = [];
    for (const w of warnings) {
      if (!decisionsMap.has(w.source_number)) {
        missingDecisions.push(w.source_number);
      }
    }

    if (missingDecisions.length > 0) {
      console.error(`\n[SAFETY STOP] Decisions file is incomplete: missing ${missingDecisions.length} decisions out of ${warnings.length} warnings.`);
      console.error(`Missing items: ${missingDecisions.slice(0, 10).join(", ")}${missingDecisions.length > 10 ? "..." : ""}`);
      process.exit(1);
    }
  }

  console.log("\n>>> COMMIT MODE ACTIVATED <<<");

  if (!supabaseUrl) {
    console.error("\n[ERROR] Missing NEXT_PUBLIC_SUPABASE_URL.");
    process.exit(1);
  }
  const parsedUrl = new URL(supabaseUrl);
  console.log(`Database Host: ${parsedUrl.hostname}:${parsedUrl.port || "default"} (LOCAL SAFEGUARD PASS)`);

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || statusJson.SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || statusJson.PUBLISHABLE_KEY || statusJson.ANON_KEY || envVars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!serviceKey || !publishableKey) {
    console.error("\n[ERROR] Missing Supabase keys. Ensure local Supabase is running (npx supabase status).");
    process.exit(1);
  }

  const targetEmail = options.email || process.env.LOCAL_IMPORT_EMAIL || envVars.ALLOWED_EMAIL || "testowner@example.com";
  const targetPassword = process.env.LOCAL_IMPORT_PASSWORD || randomUUID();

  // Admin client ensures local user exists with genuine credentials
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: usersData, error: listUsersErr } = await adminClient.auth.admin.listUsers();
  checkError(listUsersErr, "Listing local users");

  let targetUserId;
  const existingUser = usersData?.users?.find((u) => u.email === targetEmail);
  if (existingUser) {
    targetUserId = existingUser.id;
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(targetUserId, {
      password: targetPassword,
      email_confirm: true,
    });
    checkError(updateErr, `Updating local user ${targetEmail}`);
  } else {
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email: targetEmail,
      password: targetPassword,
      email_confirm: true,
    });
    checkError(createErr, `Creating local user ${targetEmail}`);
    targetUserId = newUser.user.id;
  }

  // Authenticate userClient via signInWithPassword so that user session is active and auth.uid() is genuinely populated
  const supabase = createClient(supabaseUrl, publishableKey);
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: targetEmail,
    password: targetPassword,
  });
  checkError(signInErr, `Authenticating as local user ${targetEmail}`);
  console.log(`[AUTH] Authenticated as genuine local user: ${targetEmail} (ID: ${targetUserId})`);

  // Query default content pillar
  const { data: existingPillars, error: pillarErr } = await supabase
    .from("content_pillars")
    .select("id, name_en, name_th");

  checkError(pillarErr, "Querying content pillars");

  let defaultPillarId = null;
  if (existingPillars && existingPillars.length > 0) {
    defaultPillarId = existingPillars[0].id;
  } else {
    const { data: newPillar, error: createPillarErr } = await supabase
      .from("content_pillars")
      .insert({
        user_id: targetUserId,
        name_en: "General Knowledge",
        name_th: "ความรู้ทั่วไปและสินค้า",
        color: "#8b5cf6",
        sort_order: 1,
      })
      .select("id")
      .single();

    checkError(createPillarErr, "Creating default content pillar");
    defaultPillarId = newPillar.id;
  }

  // 1. Process Content Items & Links Atomically
  console.log(`\nImporting ${excel.auto_candidates.length} content items and links atomically...`);

  const linksBySourceNum = new Map();
  for (const l of excel.all_links) {
    if (!linksBySourceNum.has(l.source_number)) {
      linksBySourceNum.set(l.source_number, []);
    }
    linksBySourceNum.get(l.source_number).push(l);
  }

  const { data: existingItems, error: existingItemsErr } = await supabase
    .from("content_items")
    .select("id, source_number");
  checkError(existingItemsErr, "Querying existing content items");

  const sourceNumberToId = new Map();
  for (const item of existingItems || []) {
    if (item.source_number) {
      sourceNumberToId.set(item.source_number, item.id);
    }
  }

  let itemsCreated = 0;
  let itemsUpdated = 0;
  let linksCreated = 0;
  let linksUpdated = 0;

  for (const c of excel.auto_candidates) {
    const candidateLinks = linksBySourceNum.get(c.source_number) || [];
    const existingId = sourceNumberToId.get(c.source_number);
    const isUpdate = Boolean(existingId);

    let resolvedPublishAt = c.publish_at;
    let resolvedPublishTimeKnown = Boolean(c.publish_time_known);

    if (decisionsMap.has(c.source_number)) {
      const decisionDate = decisionsMap.get(c.source_number);
      if (decisionDate) {
        resolvedPublishAt = `${decisionDate}T00:00:00+00:00`;
        resolvedPublishTimeKnown = false;
      } else {
        resolvedPublishAt = null;
        resolvedPublishTimeKnown = false;
      }
    }

    const itemPayload = {
      title: c.title,
      platforms: c.platforms,
      status: c.status || c.proposed_status || "idea",
      source_number: c.source_number,
      format: c.format,
      goal: c.goal,
      hook: c.hook,
      objective: c.objective,
      production_detail: c.production_detail,
      cta: c.cta,
      caption: null,
      notes: c.notes,
      progress: c.progress || 0,
      publish_at: resolvedPublishAt,
      publish_time_known: resolvedPublishTimeKnown,
      review_status: c.review_status,
      source_content_status: c.source_content_status,
      content_pillar_id: defaultPillarId,
    };

    if (isUpdate) {
      itemPayload.id = existingId;
    }

    const formattedLinks = candidateLinks.map((l, idx) => ({
      link_type: l.link_type,
      platform: l.platform || null,
      url: l.url,
      label: l.label || null,
      sort_order: idx,
    }));

    const { data: savedId, error: saveErr } = await supabase.rpc("upsert_content_item_with_links", {
      p_item: itemPayload,
      p_links: formattedLinks,
    });

    checkError(saveErr, `Saving content item #${c.source_number}`);

    if (savedId) {
      if (isUpdate) {
        itemsUpdated++;
        linksUpdated += formattedLinks.length;
      } else {
        itemsCreated++;
        linksCreated += formattedLinks.length;
      }
      sourceNumberToId.set(c.source_number, savedId);
    }
  }

  console.log(`[OK] Content items: ${itemsCreated + itemsUpdated} (created: ${itemsCreated}, updated: ${itemsUpdated}).`);
  console.log(`[OK] Content links: ${linksCreated + linksUpdated} (created: ${linksCreated}, updated: ${linksUpdated}).`);

  // 2. Process Production Tasks
  console.log(`\nProcessing production tasks...`);
  const { data: existingTasks, error: existingTasksErr } = await supabase
    .from("production_tasks")
    .select("id, import_key");

  checkError(existingTasksErr, "Querying existing production tasks");

  const existingTasksByKey = new Map();
  for (const t of existingTasks || []) {
    if (t.import_key) {
      existingTasksByKey.set(t.import_key, t.id);
    }
  }

  const allTasks = [...csv.linked_tasks, ...csv.standalone_tasks];
  let tasksCreated = 0;
  let tasksUpdated = 0;

  for (const t of allTasks) {
    const linkedItemId = t.source_number ? sourceNumberToId.get(t.source_number) || null : null;
    const taskData = {
      user_id: targetUserId,
      content_item_id: linkedItemId,
      title: t.title,
      status: t.status,
      priority: t.priority,
      task_type: t.task_type,
      due_date: t.due_date,
      description: t.description,
      import_key: t.import_key,
    };

    const existingTaskId = existingTasksByKey.get(t.import_key);
    if (existingTaskId) {
      const { data: updated, error: taskUpdateErr } = await supabase
        .from("production_tasks")
        .update(taskData)
        .eq("id", existingTaskId)
        .select("id");

      checkError(taskUpdateErr, `Updating task "${t.title}"`);
      if (updated && updated.length > 0) tasksUpdated++;
    } else {
      const { data: inserted, error: taskInsertErr } = await supabase
        .from("production_tasks")
        .insert(taskData)
        .select("id");

      checkError(taskInsertErr, `Inserting task "${t.title}"`);
      if (inserted && inserted.length > 0) tasksCreated++;
    }
  }

  console.log(`[OK] Production tasks: ${tasksCreated + tasksUpdated} (created: ${tasksCreated}, updated: ${tasksUpdated}).`);

  // 3. Process Reference Accounts
  console.log(`\nProcessing ${excel.reference_accounts.length} reference accounts...`);
  const { data: existingAccs, error: accsFetchErr } = await supabase
    .from("reference_accounts")
    .select("id, platform, url");
  checkError(accsFetchErr, "Querying existing reference accounts");

  const existingAccKeys = new Map((existingAccs || []).map((a) => [`${a.platform}:${a.url}`, a.id]));
  let accountsCreated = 0;
  let accountsUpdated = 0;

  for (const acc of excel.reference_accounts) {
    const key = `${acc.platform}:${acc.url}`;
    const existingAccId = existingAccKeys.get(key);

    const accData = {
      user_id: targetUserId,
      platform: acc.platform,
      account_label: acc.account_label || acc.account_name || "Unnamed Account",
      url: acc.url,
      notes: acc.notes || null,
    };

    if (existingAccId) {
      const { data: updated, error: accErr } = await supabase
        .from("reference_accounts")
        .update(accData)
        .eq("id", existingAccId)
        .select("id");
      checkError(accErr, `Updating reference account ${accData.account_label}`);
      if (updated && updated.length > 0) accountsUpdated++;
    } else {
      const { data: inserted, error: accErr } = await supabase
        .from("reference_accounts")
        .insert(accData)
        .select("id");
      checkError(accErr, `Inserting reference account ${accData.account_label}`);
      if (inserted && inserted.length > 0) accountsCreated++;
    }
  }

  console.log(`[OK] Reference accounts: ${accountsCreated + accountsUpdated} (created: ${accountsCreated}, updated: ${accountsUpdated}).`);

  console.log("\n================================================================");
  console.log("                    IMPORT COMMIT COMPLETE                      ");
  console.log("================================================================");
  console.log(`Content items:      ${itemsCreated + itemsUpdated} (created: ${itemsCreated}, updated: ${itemsUpdated})`);
  console.log(`Content links:      ${linksCreated + linksUpdated} (created: ${linksCreated}, updated: ${linksUpdated})`);
  console.log(`Production tasks:   ${tasksCreated + tasksUpdated} (created: ${tasksCreated}, updated: ${tasksUpdated})`);
  console.log(`Reference accounts: ${accountsCreated + accountsUpdated} (created: ${accountsCreated}, updated: ${accountsUpdated})`);
  console.log("All records committed successfully without errors.");
  console.log("================================================================\n");
}

main().catch((err) => {
  console.error("\n[FATAL ERROR]", err.message);
  process.exit(1);
});
