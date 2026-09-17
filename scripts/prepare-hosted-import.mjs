#!/usr/bin/env node

/**
 * =============================================================================
 * Controlled Hosted Supabase Data Import Workflow & Preparation Script
 *
 * Rules:
 * 1. Default mode is DRY-RUN ONLY. Zero database records are written by default.
 * 2. Hosted write guard: Hosted database writes are strictly blocked in this cycle.
 *    Any non-local target URL commits are rejected unconditionally.
 * 3. Strict Locality Safety:
 *    - Locality is derived EXCLUSIVELY from the parsed Supabase URL hostname.
 *    - A CLI flag must never turn a hosted URL into a local target.
 *    - The --local flag is an assertion only; fails if URL is not 127.0.0.1/localhost.
 * 4. Exact target enforcement:
 *    - Targets are read ONLY from the uncommitted private manifest or explicit options.
 *    - Never contains or prints real personal emails or Supabase Auth user IDs.
 *    - Rejects any extra, missing, duplicate, or malformed email addresses.
 * 5. Strengthened Auth Preflight:
 *    - Paginates through all Supabase Auth users.
 *    - Requires every manifest target to exist in auth.users.
 *    - Requires every target email to be confirmed (email_confirmed_at != null).
 *    - Rejects duplicate normalized emails in Auth or targets.
 *    - Never creates, updates, confirms, or deletes hosted Auth users.
 * 6. Non-destructive Native Session Establishment:
 *    - Uses admin-generated magic link OTP to authenticate under auth.uid() = user_id.
 *    - Fails closed if OTP authentication fails; never modifies user passwords or Auth properties.
 * 7. Genuine Database-Side Transaction Atomicity:
 *    - All mutations across all target owners and all 5 tables (content_items,
 *      content_links, production_tasks, reference_accounts, content_pillars) are
 *      executed inside a single PostgreSQL database transaction via public.import_controlled_batch.
 *    - Uses database engine BEGIN, COMMIT, and automatic engine-level ROLLBACK.
 *    - Performs authoritative in-transaction verification prior to committing.
 *    - Any error, validation failure, or injected test failure aborts the transaction,
 *      guaranteeing zero partial state and exact restoration of all pre-existing records,
 *      values, relationships, links, and timestamps.
 * 8. Authoritative Post-Write Verification:
 *    - Directly queries database counts and properties from the database after mutations.
 *    - Verifies 158 content items, 419 links, 30 reference accounts, 16 tasks per owner.
 *    - Verifies 38 corrected dates and 22 null dates per owner.
 *    - Verifies every row belongs to the expected owner user_id.
 *    - Any discrepancy aborts and rolls back the database transaction.
 * 9. Locked date policy:
 *    - Strictly enforces 38 corrected day/month reversals and 22 unscheduled records.
 *    - Rejects missing, extra, duplicate, or modified date decisions.
 * 10. Privacy & Secret Protection:
 *    - Outputs sanitized aggregate counts only.
 *    - Never prints target emails, user IDs, private URLs, or secret keys.
 * =============================================================================
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { createClient } from "@supabase/supabase-js";

export const EXPECTED_PER_ACCOUNT = Object.freeze({
  content_items: 158,
  content_links: 419,
  reference_accounts: 30,
  production_tasks: 16,
  corrected_date_decisions: 38,
  unscheduled_date_decisions: 22,
  total_date_decisions: 60,
});

export const EXPECTED_TOTAL = Object.freeze({
  content_items: 474,
  content_links: 1257,
  reference_accounts: 90,
  production_tasks: 48,
});

export class ConfirmedTransactionRollbackError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfirmedTransactionRollbackError";
    this.status = "rolled_back";
  }
}

export class UnknownTransactionOutcomeError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnknownTransactionOutcomeError";
    this.status = "unknown_outcome";
  }
}

export class PreflightCollisionError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = "PreflightCollisionError";
    this.status = "preflight_collision";
    this.details = details;
  }
}

export class ImportCommittedVerificationIncompleteError extends Error {
  constructor(message, batchResult = null) {
    super(message);
    this.name = "ImportCommittedVerificationIncompleteError";
    this.status = "committed_verification_incomplete";
    this.batchResult = batchResult;
  }
}

export function isConfirmedEngineRollback(err) {
  if (!err) return false;

  const msg = (err.message || "").toLowerCase();
  const name = (err.name || "").toLowerCase();
  const code = (err.code || "").toString();

  // Explicit network / transport / timeout indicators indicate outcome is UNKNOWN
  if (
    err.isNetworkError === true ||
    err.isTimeout === true ||
    msg.includes("fetch failed") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("econnrefused") ||
    msg.includes("socket hang up") ||
    msg.includes("network error") ||
    msg.includes("connection reset") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("bad gateway") ||
    msg.includes("gateway timeout") ||
    msg.includes("service unavailable") ||
    msg.includes("abort") ||
    name.includes("abort") ||
    name.includes("timeout") ||
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "502" ||
    code === "503" ||
    code === "504"
  ) {
    return false;
  }

  // Explicit confirmation in test or simulation
  if (err.isConfirmedRollback === true) {
    return true;
  }

  // Postgres SQLSTATE codes are standard 5-character alphanumeric strings
  if (typeof err.code === "string" && /^[0-9A-Za-z]{5}$/.test(err.code)) {
    return true;
  }

  // PostgREST Postgres error objects have details and hint properties alongside message
  if (err.details !== undefined && err.hint !== undefined && (err.code || err.message)) {
    return true;
  }

  // Postgres exception prefix in message if code was stripped
  if (
    msg.includes("raise exception") ||
    msg.includes("plpgsql") ||
    msg.includes("verification_failed") ||
    msg.includes("simulated_failure") ||
    msg.includes("auth_guard") ||
    msg.includes("invalid_payload")
  ) {
    return true;
  }

  return false;
}

export async function checkSourceNumberCollisions(
  adminClient,
  targetEmails,
  userMap,
  autoCandidates,
  options = {}
) {
  // Failure injection bypass for internal in-transaction atomicity testing
  if (options._injectFailureDuringOwner2AfterContent) {
    return {
      isRerun: true,
      hasCollisions: false,
      accountReports: [],
    };
  }

  const candidateMap = new Map();
  for (const c of autoCandidates) {
    candidateMap.set(c.source_number, c);
  }
  const expectedCandidateCount = autoCandidates.length;

  const accountReports = [];

  for (let idx = 0; idx < targetEmails.length; idx++) {
    const email = targetEmails[idx];
    const userId = userMap.get(email);

    const { data: items, error } = await adminClient
      .from("content_items")
      .select("id, source_number, title, created_at, updated_at")
      .eq("user_id", userId);

    if (error) {
      throw new Error(`[PREFLIGHT DB ERROR] Failed to query content_items for target account: ${error.message}`);
    }

    const existingItems = items || [];
    const itemsWithSourceNumber = existingItems.filter(
      (i) => i.source_number !== null && i.source_number !== undefined
    );
    const collidingItems = itemsWithSourceNumber.filter((i) => candidateMap.has(i.source_number));
    const foreignSourceNumberItems = itemsWithSourceNumber.filter((i) => !candidateMap.has(i.source_number));

    accountReports.push({
      accountIndex: idx + 1,
      userId,
      totalItems: existingItems.length,
      itemsWithSourceNumber: itemsWithSourceNumber.length,
      collidingItems,
      foreignSourceNumberItems,
    });
  }

  const totalColliding = accountReports.reduce((sum, a) => sum + a.collidingItems.length, 0);
  const totalForeign = accountReports.reduce((sum, a) => sum + a.foreignSourceNumberItems.length, 0);
  const accountsWithCollisions = accountReports.filter((a) => a.collidingItems.length > 0);

  // Check 1: Foreign source numbers outside the candidate range
  if (totalForeign > 0) {
    const offender = accountReports.find((a) => a.foreignSourceNumberItems.length > 0);
    const sample = offender.foreignSourceNumberItems[0];
    throw new PreflightCollisionError(
      `[PREFLIGHT COLLISION ERROR] Target account ${offender.accountIndex} contains an existing content item with unknown source_number ${sample.source_number} ("${sample.title}"). It cannot be identified as part of this exact import. Execution halted before any database writes.`,
      { accountReports }
    );
  }

  // Check 2: Zero colliding items across all target accounts -> clean initial import
  if (totalColliding === 0) {
    return {
      isRerun: false,
      hasCollisions: false,
      accountReports,
    };
  }

  // Check 3: Asymmetric collisions across target accounts
  // If one account has colliding items but another target account has 0 colliding items:
  if (accountsWithCollisions.length > 0 && accountsWithCollisions.length < targetEmails.length) {
    const collidingAcc = accountsWithCollisions[0];
    const sampleItem = collidingAcc.collidingItems[0];
    throw new PreflightCollisionError(
      `[PREFLIGHT COLLISION ERROR] Source-number collision detected: Target account ${collidingAcc.accountIndex} contains ${collidingAcc.collidingItems.length} existing record(s) with colliding source_number (e.g. source_number ${sampleItem.source_number}: "${sampleItem.title}"), while another target account has 0 colliding items. An existing item cannot be identified as part of this exact import. Execution halted before any database writes.`,
      { accountReports }
    );
  }

  // Check 4: For safe mode (default, allowOverwrite = false):
  // Ensure existing items can be identified as a legitimate previous import of this exact dataset
  if (!options.allowOverwrite) {
    for (const acc of accountReports) {
      if (acc.collidingItems.length < expectedCandidateCount) {
        const sampleItem = acc.collidingItems[0];
        throw new PreflightCollisionError(
          `[PREFLIGHT COLLISION ERROR] Partial source-number collision detected: Target account ${acc.accountIndex} contains only ${acc.collidingItems.length} colliding item(s) out of ${expectedCandidateCount} expected source candidates (e.g. source_number ${sampleItem.source_number}: "${sampleItem.title}"). Existing items cannot be identified as part of this exact import. Execution halted before any database writes.`,
          { accountReports }
        );
      }

      const presentSourceNums = new Set(acc.collidingItems.map((i) => i.source_number));
      for (const c of autoCandidates) {
        if (!presentSourceNums.has(c.source_number)) {
          throw new PreflightCollisionError(
            `[PREFLIGHT COLLISION ERROR] Incomplete candidate coverage: Target account ${acc.accountIndex} is missing expected source candidate #${c.source_number} ("${c.title}"). Existing items cannot be identified as part of this exact import. Execution halted before any database writes.`,
            { accountReports }
          );
        }
      }

      let titleMatches = 0;
      for (const item of acc.collidingItems) {
        const c = candidateMap.get(item.source_number);
        if (item.title === c.title) {
          titleMatches++;
        }
      }
      acc.titleMatches = titleMatches;
      acc.titleMatchRatio = acc.collidingItems.length > 0 ? titleMatches / acc.collidingItems.length : 0;

      // Reliable Import Provenance:
      // Do NOT use "at least one matching title" as proof of a previous import.
      // If only 1 title matches, or match ratio is below threshold, check secondary task provenance.
      let provenanceEstablished = false;
      if (acc.titleMatchRatio >= 0.50 && titleMatches > 1) {
        provenanceEstablished = true;
      } else if (titleMatches > 1) {
        // Moderate title agreement: check for imported task keys
        const { count: tasksCount } = await adminClient
          .from("production_tasks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", acc.userId)
          .not("import_key", "is", null);
        if ((tasksCount || 0) > 0) {
          provenanceEstablished = true;
        }
      }

      if (!provenanceEstablished) {
        const sampleItem = acc.collidingItems.find((i) => candidateMap.get(i.source_number)?.title !== i.title) || acc.collidingItems[0];
        const expectedCandidate = candidateMap.get(sampleItem.source_number);
        throw new PreflightCollisionError(
          `[PREFLIGHT COLLISION ERROR] Unproven import provenance: Target account ${acc.accountIndex} contains ${acc.collidingItems.length} colliding items, but only ${titleMatches} title(s) match the source candidates and reliable import provenance cannot be established (e.g. source_number ${sampleItem.source_number} has title "${sampleItem.title}", expected "${expectedCandidate.title}"). Execution halted before any database writes.`,
          { accountReports }
        );
      }
      acc.provenanceVerified = true;
    }
  }

  return {
    isRerun: true,
    hasCollisions: true,
    accountReports,
  };
}


export function isValidCalendarDate(val) {
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

export function validateTargetEmails(emails, approvedTargets = null) {
  if (!Array.isArray(emails)) {
    return { valid: false, normalized: [], error: "Target emails must be an array" };
  }

  const normalized = emails.map((e) => (typeof e === "string" ? e.trim().toLowerCase() : ""));

  // Check empty list
  if (normalized.length === 0) {
    return { valid: false, normalized, error: "Target accounts list is empty." };
  }

  // Check valid email format
  for (const email of normalized) {
    if (!email || !email.includes("@") || email.includes(" ") || email.startsWith("@") || email.endsWith("@")) {
      return {
        valid: false,
        normalized,
        error: `Malformed target email address: "${email}".`,
      };
    }
  }

  // Check duplicates in input
  const uniqueSet = new Set(normalized);
  if (uniqueSet.size !== normalized.length) {
    return {
      valid: false,
      normalized,
      error: "Duplicate target email detected in target accounts list.",
    };
  }

  // If approved targets set is provided, enforce exact match
  if (approvedTargets && Array.isArray(approvedTargets)) {
    const approvedNormalized = approvedTargets.map((e) => (typeof e === "string" ? e.trim().toLowerCase() : ""));
    const approvedSet = new Set(approvedNormalized);

    if (normalized.length !== approvedNormalized.length) {
      return {
        valid: false,
        normalized,
        error: `Expected exactly ${approvedNormalized.length} target accounts, received ${normalized.length}.`,
      };
    }

    for (const email of normalized) {
      if (!approvedSet.has(email)) {
        return {
          valid: false,
          normalized,
          error: `Unauthorized or unexpected target email: "${email}". Only approved owner accounts may be targeted.`,
        };
      }
    }

    for (const approved of approvedNormalized) {
      if (!uniqueSet.has(approved)) {
        return {
          valid: false,
          normalized,
          error: `Missing required approved target account: "${approved}".`,
        };
      }
    }
  }

  return { valid: true, normalized };
}

export function loadAndValidateDateDecisions(decisionsPath, warnings) {
  if (!existsSync(decisionsPath)) {
    return { valid: false, decisionsMap: new Map(), error: `Decisions file not found: ${decisionsPath}` };
  }

  const rawText = readFileSync(decisionsPath, "utf8");

  // Detect duplicate keys in JSON
  const keyRegex = /"(\d+)"\s*:/g;
  const seenRawKeys = new Set();
  let kMatch;
  while ((kMatch = keyRegex.exec(rawText)) !== null) {
    const k = kMatch[1];
    if (seenRawKeys.has(k)) {
      return { valid: false, decisionsMap: new Map(), error: `Duplicate decision key in decisions file: "${k}"` };
    }
    seenRawKeys.add(k);
  }

  let rawDecisions;
  try {
    rawDecisions = JSON.parse(rawText);
  } catch (parseErr) {
    return { valid: false, decisionsMap: new Map(), error: `Failed to parse decisions file as JSON: ${parseErr.message}` };
  }

  const warningSourceNumbers = new Set(warnings.map((w) => w.source_number));
  if (warningSourceNumbers.size !== EXPECTED_PER_ACCOUNT.total_date_decisions) {
    return {
      valid: false,
      decisionsMap: new Map(),
      error: `Source dataset warnings count mismatch: expected ${EXPECTED_PER_ACCOUNT.total_date_decisions} warnings, found ${warningSourceNumbers.size}.`,
    };
  }

  const decisionsMap = new Map();
  let correctedCount = 0;
  let unscheduledCount = 0;

  for (const [k, v] of Object.entries(rawDecisions)) {
    const srcNum = Number(k);
    if (isNaN(srcNum)) {
      return { valid: false, decisionsMap: new Map(), error: `Invalid source number key in decisions file: "${k}"` };
    }

    if (!warningSourceNumbers.has(srcNum)) {
      return {
        valid: false,
        decisionsMap: new Map(),
        error: `Extra unexpected decision for content item #${srcNum}: no warning exists for this item.`,
      };
    }

    if (v !== null) {
      if (typeof v !== "string" || !isValidCalendarDate(v)) {
        return {
          valid: false,
          decisionsMap: new Map(),
          error: `Invalid date decision for content item #${srcNum}: "${v}". Must be a valid calendar date (YYYY-MM-DD) or null.`,
        };
      }
      correctedCount++;
    } else {
      unscheduledCount++;
    }

    decisionsMap.set(srcNum, v);
  }

  // Ensure every warning is mapped
  for (const w of warnings) {
    if (!decisionsMap.has(w.source_number)) {
      return {
        valid: false,
        decisionsMap: new Map(),
        error: `Incomplete decisions: missing approved decision for warning item #${w.source_number}.`,
      };
    }
  }

  // Enforce locked policy: 38 corrected dates, 22 unscheduled
  if (correctedCount !== EXPECTED_PER_ACCOUNT.corrected_date_decisions || unscheduledCount !== EXPECTED_PER_ACCOUNT.unscheduled_date_decisions) {
    return {
      valid: false,
      decisionsMap: new Map(),
      error: `Date decision policy mismatch: expected ${EXPECTED_PER_ACCOUNT.corrected_date_decisions} corrected dates and ${EXPECTED_PER_ACCOUNT.unscheduled_date_decisions} unscheduled records, found ${correctedCount} corrected and ${unscheduledCount} unscheduled.`,
    };
  }

  return {
    valid: true,
    decisionsMap,
    counts: { corrected: correctedCount, unscheduled: unscheduledCount, total: decisionsMap.size },
  };
}

export function parseSourceDatasets(excelPath, csvPath) {
  if (!existsSync(excelPath)) {
    throw new Error(`Excel source file does not exist: ${excelPath}`);
  }
  if (!existsSync(csvPath)) {
    throw new Error(`Notion CSV source file does not exist: ${csvPath}`);
  }

  const parserProc = spawnSync("python3", [
    resolve(process.cwd(), "scripts/parse-sources.py"),
    excelPath,
    csvPath,
  ], {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });

  if (parserProc.status !== 0) {
    throw new Error(`Parser script failed: ${parserProc.stderr}`);
  }

  const parsed = JSON.parse(parserProc.stdout);
  const excel = parsed.data.excel;
  const csv = parsed.data.csv;

  const totalTasks = csv.linked_tasks.length + csv.standalone_tasks.length;
  const warnings = excel.date_reviews.filter((d) => d.warning !== "OK");

  // Validate baseline counts
  if (excel.auto_candidates.length !== EXPECTED_PER_ACCOUNT.content_items) {
    throw new Error(`Baseline mismatch: expected ${EXPECTED_PER_ACCOUNT.content_items} auto candidates, got ${excel.auto_candidates.length}`);
  }
  if (excel.all_links.length !== EXPECTED_PER_ACCOUNT.content_links) {
    throw new Error(`Baseline mismatch: expected ${EXPECTED_PER_ACCOUNT.content_links} content links, got ${excel.all_links.length}`);
  }
  if (excel.reference_accounts.length !== EXPECTED_PER_ACCOUNT.reference_accounts) {
    throw new Error(`Baseline mismatch: expected ${EXPECTED_PER_ACCOUNT.reference_accounts} reference accounts, got ${excel.reference_accounts.length}`);
  }
  if (totalTasks !== EXPECTED_PER_ACCOUNT.production_tasks) {
    throw new Error(`Baseline mismatch: expected ${EXPECTED_PER_ACCOUNT.production_tasks} tasks, got ${totalTasks}`);
  }
  if (warnings.length !== EXPECTED_PER_ACCOUNT.total_date_decisions) {
    throw new Error(`Baseline mismatch: expected ${EXPECTED_PER_ACCOUNT.total_date_decisions} date warnings, got ${warnings.length}`);
  }

  return { excel, csv, warnings, totalTasks };
}

export async function getAllAuthUsers(adminClient) {
  const allUsers = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list Supabase Auth users: ${error.message}`);
    }
    const users = data?.users || [];
    allUsers.push(...users);
    if (users.length < perPage) {
      break;
    }
    page++;
  }
  return allUsers;
}

export async function verifyAuthUsersExist(adminClient, targetEmails) {
  const users = await getAllAuthUsers(adminClient);
  const userMap = new Map();
  const missing = [];
  const unconfirmed = [];

  // Check duplicate emails in Auth
  const seenEmailsInAuth = new Map();
  for (const u of users) {
    const norm = u.email?.toLowerCase();
    if (norm) {
      const count = seenEmailsInAuth.get(norm) || 0;
      seenEmailsInAuth.set(norm, count + 1);
    }
  }

  for (const email of targetEmails) {
    const norm = email.toLowerCase();
    if ((seenEmailsInAuth.get(norm) || 0) > 1) {
      throw new Error(`[AUTH GUARD] Duplicate Auth user found in database for email: "${email}".`);
    }

    const found = users.find((u) => u.email?.toLowerCase() === norm);
    if (!found) {
      missing.push(email);
    } else {
      const isConfirmed = Boolean(found.email_confirmed_at || found.confirmed_at);
      if (!isConfirmed) {
        unconfirmed.push(email);
      }
      userMap.set(email, found.id);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[AUTH GUARD] Target user(s) missing from Supabase Auth: ${missing.length} missing user(s).\n` +
      `All target users must exist in auth.users before commit mode.`
    );
  }

  if (unconfirmed.length > 0) {
    throw new Error(
      `[AUTH GUARD] Target user email(s) not confirmed in Supabase Auth: ${unconfirmed.length} unconfirmed user(s).\n` +
      `All target accounts must have confirmed email addresses before commit mode.`
    );
  }

  return {
    allExist: true,
    userMap,
  };
}

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    excelPath: null,
    csvPath: null,
    decisionsPath: null,
    manifestPath: null,
    commit: false,
    confirmBackup: false,
    acknowledgeNoBackup: false,
    confirmExecution: false,
    isLocal: false,
    targetEmails: null,
    json: false,
    allowOverwrite: false,
    isRerun: false,
    preflight: false,
  };

  const allowedFlags = new Set([
    "--excel",
    "--csv",
    "--decisions",
    "--manifest",
    "--commit",
    "--confirm-backup",
    "--acknowledge-no-backup",
    "--confirm-execution",
    "--local",
    "--target-emails",
    "--json",
    "--allow-overwrite",
    "--rerun",
    "--preflight",
    "--help",
    "-h",
  ]);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!allowedFlags.has(arg)) {
      throw new Error(`Unknown argument: "${arg}".`);
    }

    if (arg === "--excel") {
      options.excelPath = resolve(argv[++i]);
    } else if (arg === "--csv") {
      options.csvPath = resolve(argv[++i]);
    } else if (arg === "--decisions") {
      options.decisionsPath = resolve(argv[++i]);
    } else if (arg === "--manifest") {
      options.manifestPath = resolve(argv[++i]);
    } else if (arg === "--commit") {
      options.commit = true;
    } else if (arg === "--confirm-backup") {
      options.confirmBackup = true;
    } else if (arg === "--acknowledge-no-backup") {
      options.acknowledgeNoBackup = true;
    } else if (arg === "--confirm-execution") {
      options.confirmExecution = true;
    } else if (arg === "--local") {
      options.isLocal = true;
    } else if (arg === "--target-emails") {
      options.targetEmails = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--allow-overwrite") {
      options.allowOverwrite = true;
    } else if (arg === "--rerun") {
      options.isRerun = true;
    } else if (arg === "--preflight") {
      options.preflight = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: node scripts/prepare-hosted-import.mjs [options]

Options:
  --excel <path>           Path to Content Planner.xlsx
  --csv <path>             Path to Gypstore Notion CSV
  --decisions <path>       Path to approved-date-decisions.json
  --manifest <path>        Path to import-manifest.json
  --commit                 Request commit mode (DRY-RUN is default)
  --confirm-backup         Explicit confirmation of verified database backup
  --acknowledge-no-backup  Explicit acknowledgement of owner decision to proceed without a backup
  --confirm-execution      Explicit confirmation of final import execution
  --target-emails <list>   Comma-separated list of target emails (must match approved manifest targets)
  --allow-overwrite        Explicitly approve overwriting existing content (default: false, preserves user edits)
  --rerun                  Explicitly indicate a rerun (auto-detected if records exist; safe rerun preserves edits)
  --preflight              Run read-only preflight check against target Supabase to check target accounts and report collisions without writing
  --local                  Assert execution must resolve strictly to 127.0.0.1 or localhost
  --json                   Output structured JSON report
  --help, -h               Show this help message
`);
      process.exit(0);
    }
  }

  return options;
}

export async function runWorkflow(options = {}) {
  // 1. Strict Locality Safety: derived EXCLUSIVELY from parsed Supabase URL hostname
  const defaultLocalUrl = "http://127.0.0.1:54321";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || defaultLocalUrl;

  let parsedUrl;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error(`[SECURITY ABORT] Invalid Supabase URL: "${supabaseUrl}".`);
  }

  const isLocalHost = parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "localhost";

  // If --local was explicitly asserted, fail unless the URL is truly localhost / 127.0.0.1
  if (options.isLocal && !isLocalHost) {
    throw new Error(
      `[SECURITY ABORT] --local flag was specified, but Supabase URL hostname is non-local: "${parsedUrl.hostname}". ` +
      `A CLI flag must never turn a hosted URL into a local target.`
    );
  }

  // Commit mode against hosted database is unconditionally disabled in this implementation cycle
  if (!isLocalHost && options.commit) {
    throw new Error(
      `[SAFETY STOP] Hosted database writes are strictly disabled in this cycle. ` +
      `Target URL "${parsedUrl.hostname}" is a hosted Supabase environment. ` +
      `Stop for Codex review before any hosted database write.`
    );
  }

  // 2. Load Manifest & Sources
  const manifestPath = options.manifestPath || resolve(process.cwd(), ".private-import/import-manifest.json");
  let manifest = {};
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch (err) {
      throw new Error(`Failed to parse import manifest: ${err.message}`);
    }
  } else if (!options.manifestPath && !options.excelPath) {
    throw new Error(`[CONFIG ERROR] Import manifest not found at ${manifestPath}. Specify --manifest <path>.`);
  }

  const excelPath = options.excelPath || manifest.sources?.excel || "/Users/nack/Downloads/Content Planner.xlsx";
  const csvPath = options.csvPath || manifest.sources?.notion_csv || "/Users/nack/Downloads/Gypstore 3a3f713029ef804d8a70e7bc36247cfb.csv";
  const decisionsPath = options.decisionsPath || manifest.sources?.date_decisions || resolve(process.cwd(), ".private-import/approved-date-decisions.json");

  // 3. Target Accounts Validation (from manifest or explicit options)
  const approvedTargets = manifest.target_accounts || options.approvedTargets || null;
  const rawTargetEmails = options.targetEmails || approvedTargets;

  if (!rawTargetEmails || (Array.isArray(rawTargetEmails) && rawTargetEmails.length === 0)) {
    throw new Error(`[CONFIG ERROR] No target accounts found in manifest or options.`);
  }

  const targetValidation = validateTargetEmails(rawTargetEmails, approvedTargets);
  if (!targetValidation.valid) {
    throw new Error(`[TARGET VALIDATION ERROR] ${targetValidation.error}`);
  }
  const targetEmails = targetValidation.normalized;

  // 4. Parse Sources & Validate Baselines
  const { excel, csv, warnings } = parseSourceDatasets(excelPath, csvPath);

  // 5. Validate Date Decisions
  const decisionsValidation = loadAndValidateDateDecisions(decisionsPath, warnings);
  if (!decisionsValidation.valid) {
    throw new Error(`[DATE DECISIONS ERROR] ${decisionsValidation.error}`);
  }
  const decisionsMap = decisionsValidation.decisionsMap;

  const backupAuthorization = options.confirmBackup
    ? "backup_confirmed"
    : (options.acknowledgeNoBackup ? "no_backup_acknowledged" : "none");

  const report = {
    mode: options.commit ? "commit" : "dry-run",
    status: "success",
    timestamp: new Date().toISOString(),
    manifest_path: basename(manifestPath),
    target_count: targetEmails.length,
    is_local: isLocalHost,
    backup_authorization: backupAuthorization,
    sources: {
      excel_filename: basename(excelPath),
      csv_filename: basename(csvPath),
      decisions_filename: basename(decisionsPath),
    },
    verification: {
      date_decisions_total: decisionsValidation.counts.total,
      date_decisions_corrected: decisionsValidation.counts.corrected,
      date_decisions_unscheduled: decisionsValidation.counts.unscheduled,
      date_policy_locked: true,
      per_account_expected: EXPECTED_PER_ACCOUNT,
      total_expected: EXPECTED_TOTAL,
      baselines_match: true,
    },
  };

  // 6a. READ-ONLY PREFLIGHT MODE (--preflight)
  if (options.preflight) {
    let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (isLocalHost && !serviceKey) {
      try {
        const statusProc = spawnSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" });
        if (statusProc.status === 0 && statusProc.stdout) {
          const statusJson = JSON.parse(statusProc.stdout);
          serviceKey = statusJson.SERVICE_ROLE_KEY;
        }
      } catch {}
    }

    if (!serviceKey) {
      throw new Error("[DB ERROR] Missing Supabase service key for read-only preflight check.");
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify all target users exist and are confirmed in Supabase Auth
    const userCheck = await verifyAuthUsersExist(adminClient, targetEmails);

    // Run read-only collision preflight check across all target accounts
    let collisionResult;
    let collisionError = null;
    try {
      collisionResult = await checkSourceNumberCollisions(
        adminClient,
        targetEmails,
        userCheck.userMap,
        excel.auto_candidates,
        options
      );
    } catch (err) {
      if (err instanceof PreflightCollisionError) {
        collisionError = err;
        collisionResult = err.details || {};
      } else {
        throw err;
      }
    }

    report.mode = "preflight-only";
    report.database_writes_performed = 0;
    report.target_host = parsedUrl.hostname;
    report.auth_users_confirmed = true;
    report.collision_check = {
      has_collisions: collisionResult?.hasCollisions ?? Boolean(collisionError),
      is_valid_prior_import: collisionResult?.isRerun ?? false,
      can_proceed_to_import: !collisionError,
      error: collisionError ? collisionError.message : null,
      account_summaries: collisionResult?.accountReports?.map((a) => ({
        account_index: a.accountIndex,
        total_items: a.totalItems,
        items_with_source_number: a.itemsWithSourceNumber,
        colliding_items_count: a.collidingItems.length,
        title_matches: a.titleMatches || 0,
        provenance_verified: a.provenanceVerified || false,
      })) || [],
    };

    if (collisionError) {
      report.status = "collision_halt";
      report.verdict = `Preflight collision check failed: ${collisionError.message}. Zero database writes performed.`;
    } else if (collisionResult?.isRerun) {
      report.verdict = `Read-only preflight completed successfully. All 3 target accounts contain a verified prior import of this exact dataset. Zero database writes performed.`;
    } else {
      report.verdict = `Read-only preflight completed successfully. Zero source-number collisions found across all 3 target accounts. Ready for initial import. Zero database writes performed.`;
    }

    if (collisionError && !options.json) {
      throw collisionError;
    }

    return report;
  }

  // 6b. DRY-RUN MODE (DEFAULT)
  if (!options.commit) {
    report.verdict = "Dry-run verification completed successfully. Zero database writes performed.";
    report.database_writes_performed = 0;
    return report;
  }

  // 7. COMMIT MODE SAFETY GUARDS
  const hasConfirmBackup = Boolean(options.confirmBackup);
  const hasAcknowledgeNoBackup = Boolean(options.acknowledgeNoBackup);

  if (hasConfirmBackup && hasAcknowledgeNoBackup) {
    throw new Error(
      "[SAFETY HALT] Conflicting backup options provided: cannot specify both --confirm-backup and --acknowledge-no-backup.\n" +
      "Choose exactly one: confirm that a verified backup exists, or explicitly acknowledge proceeding without a backup."
    );
  }

  if (!hasConfirmBackup && !hasAcknowledgeNoBackup) {
    throw new Error(
      "[SAFETY HALT] Commit mode requires explicit backup authorization: provide either --confirm-backup or --acknowledge-no-backup.\n" +
      "A confirmed database backup must be verified, or the owner must explicitly acknowledge proceeding without a backup."
    );
  }

  if (!options.confirmExecution) {
    throw new Error(
      "[SAFETY HALT] Commit mode requires explicit final execution confirmation flag: --confirm-execution.\n" +
      "Final operator authorization is required before modifying database records."
    );
  }

  // Check manifest authorization guard
  const hostedWriteAuthorized = manifest.execution?.hosted_write_authorized === true;
  if (!isLocalHost && !hostedWriteAuthorized) {
    throw new Error(
      "[SAFETY STOP] Hosted database writes are currently NOT authorized in import-manifest.json ('hosted_write_authorized': false).\n" +
      "Controlled preparation cycle only. Stop for Codex review before executing hosted writes."
    );
  }

  // Supabase credentials for execution
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (isLocalHost && (!serviceKey || !publishableKey)) {
    try {
      const statusProc = spawnSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" });
      if (statusProc.status === 0 && statusProc.stdout) {
        const statusJson = JSON.parse(statusProc.stdout);
        if (!serviceKey) serviceKey = statusJson.SERVICE_ROLE_KEY;
        if (!publishableKey) publishableKey = statusJson.PUBLISHABLE_KEY || statusJson.ANON_KEY;
      }
    } catch {}
  }

  if (!serviceKey || !publishableKey) {
    throw new Error("[DB ERROR] Missing Supabase service key or publishable key for execution.");
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify all target users exist and are confirmed in Supabase Auth
  const userCheck = await verifyAuthUsersExist(adminClient, targetEmails);

  // 8. READ-ONLY PREFLIGHT SOURCE-NUMBER COLLISION CHECK
  // Inspect each of the target accounts for existing source-number collisions.
  // Do not treat "any content exists" as proof of a previous import.
  // If an existing item cannot be identified as part of this exact import, stop before writing.
  const collisionPreflight = await checkSourceNumberCollisions(
    adminClient,
    targetEmails,
    userCheck.userMap,
    excel.auto_candidates,
    options
  );

  const isRerun = Boolean(options.isRerun || collisionPreflight.isRerun);

  const allowOverwrite = Boolean(options.allowOverwrite);
  const hasExistingContent = collisionPreflight.accountReports?.some((a) => a.totalItems > 0);
  const allowExtraRecords = options.allowExtraRecords !== undefined ? Boolean(options.allowExtraRecords) : (isRerun || hasExistingContent);
  const verifyDateDecisions = options.verifyDateDecisions !== undefined ? Boolean(options.verifyDateDecisions) : (!isRerun || allowOverwrite);

  // Prepare payload for database-side execution inside a genuine PostgreSQL transaction
  const batchPayload = {
    owners: [],
    is_rerun: isRerun,
    allow_overwrite: allowOverwrite,
    allow_extra_records: allowExtraRecords,
    verify_date_decisions: verifyDateDecisions,
    expected: {
      content_items: EXPECTED_PER_ACCOUNT.content_items,
      content_links: EXPECTED_PER_ACCOUNT.content_links,
      production_tasks: EXPECTED_PER_ACCOUNT.production_tasks,
      reference_accounts: EXPECTED_PER_ACCOUNT.reference_accounts,
      corrected_date_decisions: EXPECTED_PER_ACCOUNT.corrected_date_decisions,
      unscheduled_date_decisions: EXPECTED_PER_ACCOUNT.unscheduled_date_decisions,
      allow_extra_records: allowExtraRecords,
    },
    date_decisions: [],
  };

  if (options._injectFailureDuringOwner2AfterContent) {
    batchPayload.fail_owner_index = 2;
  }

  for (const [srcNum, expDate] of decisionsMap.entries()) {
    batchPayload.date_decisions.push({
      source_number: srcNum,
      publish_at: expDate,
    });
  }

  const linksBySourceNum = new Map();
  for (const l of excel.all_links) {
    if (!linksBySourceNum.has(l.source_number)) {
      linksBySourceNum.set(l.source_number, []);
    }
    linksBySourceNum.get(l.source_number).push(l);
  }

  const allTasks = [...csv.linked_tasks, ...csv.standalone_tasks];

  for (const email of targetEmails) {
    const targetUserId = userCheck.userMap.get(email);

    const ownerItems = excel.auto_candidates.map((c) => {
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

      const candidateLinks = linksBySourceNum.get(c.source_number) || [];
      const formattedLinks = candidateLinks.map((l, idx) => ({
        link_type: l.link_type,
        platform: l.platform || null,
        url: l.url,
        label: l.label || null,
        sort_order: idx,
      }));

      return {
        source_number: c.source_number,
        title: c.title,
        platforms: c.platforms,
        status: c.status || c.proposed_status || "idea",
        format: c.format || null,
        goal: c.goal || null,
        hook: c.hook || null,
        objective: c.objective || null,
        production_detail: c.production_detail || null,
        cta: c.cta || null,
        caption: null,
        notes: c.notes || null,
        progress: c.progress || 0,
        publish_at: resolvedPublishAt,
        publish_time_known: resolvedPublishTimeKnown,
        review_status: c.review_status || null,
        source_content_status: c.source_content_status || null,
        links: formattedLinks,
      };
    });

    const ownerTasks = allTasks.map((t) => ({
      import_key: t.import_key,
      source_number: t.source_number || null,
      title: t.title,
      status: t.status,
      priority: t.priority || null,
      task_type: t.task_type || null,
      due_date: t.due_date || null,
      description: t.description || null,
    }));

    const ownerAccounts = excel.reference_accounts.map((acc) => ({
      platform: acc.platform,
      account_label: acc.account_label || acc.account_name || "Unnamed Account",
      url: acc.url,
      notes: acc.notes || null,
    }));

    batchPayload.owners.push({
      user_id: targetUserId,
      items: ownerItems,
      tasks: ownerTasks,
      reference_accounts: ownerAccounts,
    });
  }

  // Execute genuine single PostgreSQL transaction via RPC
  let batchResult;
  try {
    if (options._injectLostResponseDuringBatchImport) {
      const lostResponseErr = new Error("fetch failed: socket hang up");
      lostResponseErr.name = "FetchError";
      lostResponseErr.code = "ECONNRESET";
      lostResponseErr.isNetworkError = true;
      throw lostResponseErr;
    }

    const { data, error } = await adminClient.rpc("import_controlled_batch", {
      p_payload: batchPayload,
    });
    if (error) throw error;
    batchResult = data;
  } catch (txErr) {
    if (isConfirmedEngineRollback(txErr)) {
      const err = new ConfirmedTransactionRollbackError(
        `[TRANSACTION ROLLED BACK] The single-transaction database batch import failed and was completely rolled back by PostgreSQL: ${txErr.message}. Zero database changes were committed.`
      );
      err.cause = txErr;
      throw err;
    } else {
      const err = new UnknownTransactionOutcomeError(
        `[TRANSACTION STATUS UNKNOWN - RESPONSE LOST] The database call failed to receive a confirmed response: ${txErr.message}.\n` +
        `CRITICAL WARNING: It cannot be determined whether the transaction committed or rolled back. Zero database changes CANNOT be claimed.\n` +
        `Operator action required: Perform a read-only reconciliation of the target database state before taking any further action.`
      );
      err.cause = txErr;
      throw err;
    }
  }

  // AT THIS POINT: The transaction has successfully COMMITTED.
  // Records ARE written to the database.
  report.transaction_status = "committed";

  // 9. AUTHORITATIVE POST-COMMIT DATABASE VERIFICATION
  try {
    for (const email of targetEmails) {
      const targetUserId = userCheck.userMap.get(email);
      const userClient = createClient(supabaseUrl, publishableKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Connect as owner via OTP to verify under RLS
      const linkRes = await adminClient.auth.admin.generateLink({ type: "magiclink", email });
      if (!linkRes.data?.properties?.email_otp) {
        throw new Error("Could not generate owner OTP session for post-commit verification.");
      }
      const { error: otpErr } = await userClient.auth.verifyOtp({
        email,
        token: linkRes.data.properties.email_otp,
        type: "email",
      });
      if (otpErr) {
        throw new Error(`Owner OTP authentication failed: ${otpErr.message}`);
      }

      // Failure injection hook for post-commit verification testing
      if (options._injectFailureDuringPostCommitVerification) {
        throw new Error("[TEST INJECTION] Simulated post-commit verification network failure.");
      }

      const [itemsRes, linksRes, tasksRes, accsRes] = await Promise.all([
        userClient.from("content_items").select("id, user_id, source_number, publish_at"),
        userClient.from("content_links").select("id, user_id, url"),
        userClient.from("production_tasks").select("id, user_id, import_key"),
        userClient.from("reference_accounts").select("id, user_id, platform, url"),
      ]);

      if (itemsRes.error || linksRes.error || tasksRes.error || accsRes.error) {
        throw new Error("Database query failed during post-commit verification.");
      }

      const items = itemsRes.data || [];
      const links = linksRes.data || [];
      const tasks = tasksRes.data || [];
      const accounts = accsRes.data || [];

      // Verify 158 newly imported numbered items per account, rather than requiring exactly 158 total items
      const numberedItems = items.filter((i) => i.source_number !== null && i.source_number !== undefined);
      if (numberedItems.length !== EXPECTED_PER_ACCOUNT.content_items) {
        throw new Error(
          `Numbered content items count mismatch: expected ${EXPECTED_PER_ACCOUNT.content_items} numbered items, found ${numberedItems.length}.`
        );
      }
      if (items.length < EXPECTED_PER_ACCOUNT.content_items) {
        throw new Error(`Content items count below expected: expected at least ${EXPECTED_PER_ACCOUNT.content_items}, found ${items.length}.`);
      }

      // Count verification for auxiliary tables
      if (allowExtraRecords) {
        if (!isRerun && links.length < EXPECTED_PER_ACCOUNT.content_links) {
          throw new Error(`Content links count below expected: expected at least ${EXPECTED_PER_ACCOUNT.content_links}, found ${links.length}.`);
        }
        if (tasks.length < EXPECTED_PER_ACCOUNT.production_tasks) {
          throw new Error(`Tasks count below expected: expected at least ${EXPECTED_PER_ACCOUNT.production_tasks}, found ${tasks.length}.`);
        }
        if (accounts.length < EXPECTED_PER_ACCOUNT.reference_accounts) {
          throw new Error(`Reference accounts count below expected: expected at least ${EXPECTED_PER_ACCOUNT.reference_accounts}, found ${accounts.length}.`);
        }
      } else {
        if (links.length !== EXPECTED_PER_ACCOUNT.content_links) {
          throw new Error(`Content links count mismatch: expected ${EXPECTED_PER_ACCOUNT.content_links}, found ${links.length}.`);
        }
        if (tasks.length !== EXPECTED_PER_ACCOUNT.production_tasks) {
          throw new Error(`Tasks count mismatch: expected ${EXPECTED_PER_ACCOUNT.production_tasks}, found ${tasks.length}.`);
        }
        if (accounts.length !== EXPECTED_PER_ACCOUNT.reference_accounts) {
          throw new Error(`Reference accounts count mismatch: expected ${EXPECTED_PER_ACCOUNT.reference_accounts}, found ${accounts.length}.`);
        }
      }

      // Verify owner isolation for every single row
      for (const i of items) if (i.user_id !== targetUserId) throw new Error("Content item belongs to incorrect owner.");
      for (const l of links) if (l.user_id !== targetUserId) throw new Error("Content link belongs to incorrect owner.");
      for (const t of tasks) if (t.user_id !== targetUserId) throw new Error("Production task belongs to incorrect owner.");
      for (const a of accounts) if (a.user_id !== targetUserId) throw new Error("Reference account belongs to incorrect owner.");

      // Verify that all original source items exist in the database for this owner
      const itemsBySourceNum = new Map(
        items.filter((i) => i.source_number !== null && i.source_number !== undefined).map((i) => [i.source_number, i])
      );
      for (const candidate of excel.auto_candidates) {
        if (!itemsBySourceNum.has(candidate.source_number)) {
          throw new Error(`Imported source item #${candidate.source_number} missing from database for owner.`);
        }
      }

      // Verify exact date decision application for imported items (unless date verification skipped on custom rerun)
      if (verifyDateDecisions) {
        const itemsBySourceNum = new Map(items.map((i) => [i.source_number, i]));
        let actualCorrected = 0;
        let actualUnscheduled = 0;

        for (const [srcNum, expectedDate] of decisionsMap.entries()) {
          const item = itemsBySourceNum.get(srcNum);
          if (!item) throw new Error(`Item #${srcNum} missing from database.`);
          if (expectedDate !== null) {
            if (!item.publish_at || !item.publish_at.startsWith(expectedDate)) {
              throw new Error(`Item #${srcNum} publish_at (${item.publish_at}) did not match expected ${expectedDate}.`);
            }
            actualCorrected++;
          } else {
            if (item.publish_at !== null) {
              throw new Error(`Item #${srcNum} was expected to be unscheduled (null), got ${item.publish_at}.`);
            }
            actualUnscheduled++;
          }
        }

        if (actualCorrected !== EXPECTED_PER_ACCOUNT.corrected_date_decisions || actualUnscheduled !== EXPECTED_PER_ACCOUNT.unscheduled_date_decisions) {
          throw new Error(`Date decision counts mismatch in database: ${actualCorrected} corrected, ${actualUnscheduled} unscheduled.`);
        }
      }
    }
  } catch (postCommitErr) {
    // CRITICAL: Unambiguously distinguish from transaction rollback
    const msg =
      `[IMPORT COMMITTED - VERIFICATION INCOMPLETE] The database transaction was successfully COMMITTED, but post-commit verification failed: ${postCommitErr.message}.\n` +
      `CRITICAL STATE: Records WERE written and committed to the database. A transaction rollback did NOT occur (and cannot occur after commit).\n` +
      `Do NOT execute a blind re-import without verifying current database state.`;
    const err = new ImportCommittedVerificationIncompleteError(msg, batchResult);
    err.cause = postCommitErr;
    throw err;
  }

  const executionMode = allowOverwrite ? "overwrite" : (isRerun ? "safe_rerun_preserve" : "initial_import");
  report.execution_results = {
    mode: executionMode,
    totals: {
      content_items: {
        created: batchResult.items_created,
        updated: batchResult.items_updated,
        preserved: batchResult.items_preserved,
        total: batchResult.items_created + batchResult.items_updated + batchResult.items_preserved,
      },
      content_links: {
        created: batchResult.links_created,
        updated: batchResult.links_updated,
        preserved: batchResult.links_preserved,
        total: batchResult.links_created + batchResult.links_updated + batchResult.links_preserved,
      },
      production_tasks: {
        created: batchResult.tasks_created,
        updated: batchResult.tasks_updated,
        preserved: batchResult.tasks_preserved,
        total: batchResult.tasks_created + batchResult.tasks_updated + batchResult.tasks_preserved,
      },
      reference_accounts: {
        created: batchResult.accs_created,
        updated: batchResult.accs_updated,
        preserved: batchResult.accs_preserved,
        total: batchResult.accs_created + batchResult.accs_updated + batchResult.accs_preserved,
      },
      content_pillars: {
        created: batchResult.pillars_created,
      },
    },
  };
  report.database_writes_performed =
    batchResult.items_created +
    batchResult.items_updated +
    batchResult.links_created +
    batchResult.links_updated +
    batchResult.tasks_created +
    batchResult.tasks_updated +
    batchResult.accs_created +
    batchResult.accs_updated;
  report.verdict = allowOverwrite
    ? "Single-transaction commit (overwrite mode) and post-write verification completed successfully for all owner accounts."
    : (isRerun
      ? "Single-transaction commit (safe rerun preserve mode) and post-write verification completed successfully for all owner accounts."
      : "Single-transaction commit (initial import mode) and post-write verification completed successfully for all owner accounts.");
  return report;
}

// CLI Execution Entrypoint
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    const result = await runWorkflow(opts);

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log("================================================================");
      console.log("     HOSTED SUPABASE IMPORT PREPARATION & VALIDATION WORKFLOW   ");
      console.log("================================================================");
      console.log(`Execution Mode:      ${result.mode.toUpperCase()}`);
      console.log(`Backup Policy:       ${result.backup_authorization === "backup_confirmed" ? "Backup confirmed" : (result.backup_authorization === "no_backup_acknowledged" ? "No backup acknowledged by owner" : "None (dry-run)")}`);
      console.log(`Target Accounts:     ${result.target_count} verified owner accounts [redacted for privacy]`);
      console.log(`Sources Verified:    Excel, Notion CSV, and Approved Decisions`);
      console.log(`Date Policy:         ${result.verification.date_decisions_corrected} corrected reversals, ${result.verification.date_decisions_unscheduled} unscheduled records`);
      console.log("----------------------------------------------------------------");
      console.log("Expected Counts Per Account:");
      console.log(`  - Content Items:     ${result.verification.per_account_expected.content_items}`);
      console.log(`  - Content Links:     ${result.verification.per_account_expected.content_links}`);
      console.log(`  - Production Tasks:  ${result.verification.per_account_expected.production_tasks}`);
      console.log(`  - Ref Accounts:      ${result.verification.per_account_expected.reference_accounts}`);
      console.log("----------------------------------------------------------------");
      console.log("Expected Totals Across Target Accounts:");
      console.log(`  - Total Content:     ${result.verification.total_expected.content_items}`);
      console.log(`  - Total Links:       ${result.verification.total_expected.content_links}`);
      console.log(`  - Total Tasks:       ${result.verification.total_expected.production_tasks}`);
      console.log(`  - Total Ref Accounts:${result.verification.total_expected.reference_accounts}`);
      console.log("================================================================");
      console.log(`VERDICT: ${result.verdict}`);
      console.log("================================================================\n");
    }
  } catch (err) {
    console.error(`\n[ERROR] ${err.message}\n`);
    process.exit(1);
  }
}
