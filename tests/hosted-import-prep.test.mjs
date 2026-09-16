import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { writeFileSync, unlinkSync, existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  EXPECTED_PER_ACCOUNT,
  EXPECTED_TOTAL,
  validateTargetEmails,
  loadAndValidateDateDecisions,
  parseSourceDatasets,
  runWorkflow,
} from "../scripts/prepare-hosted-import.mjs";

const SCRIPT_PATH = resolve(process.cwd(), "scripts/prepare-hosted-import.mjs");
const FIXTURE_EXCEL = resolve(process.cwd(), "tests/fixtures/portable-planner.xlsx");
const FIXTURE_CSV = resolve(process.cwd(), "tests/fixtures/portable-notion.csv");
const FIXTURE_DECISIONS = resolve(process.cwd(), "tests/fixtures/portable-decisions.json");
const FIXTURE_MANIFEST = resolve(process.cwd(), "tests/fixtures/portable-manifest.json");

const SYNTHETIC_TARGETS = Object.freeze([
  "owner1@example.test",
  "owner2@example.test",
  "owner3@example.test",
]);
const UNAUTHORIZED_TARGET = "unauthorized@example.test";

function getLocalAdminClient() {
  const statusProc = spawnSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" });
  assert.equal(statusProc.status, 0, "Failed to query local supabase status");
  const statusJson = JSON.parse(statusProc.stdout);
  return {
    supabaseUrl: statusJson.API_URL || "http://127.0.0.1:54321",
    serviceRoleKey: statusJson.SERVICE_ROLE_KEY,
    publishableKey: statusJson.PUBLISHABLE_KEY || statusJson.ANON_KEY,
    adminClient: createClient(statusJson.API_URL || "http://127.0.0.1:54321", statusJson.SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  };
}

async function ensureSyntheticUsersExist(adminClient, confirmed = true) {
  const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers();
  if (listErr) throw new Error(`Listing users: ${listErr.message}`);
  const existingUsers = listData?.users || [];

  for (const email of SYNTHETIC_TARGETS) {
    const found = existingUsers.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!found) {
      const { error: createErr } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: confirmed,
        user_metadata: { role: "owner" },
      });
      if (createErr && !createErr.message.includes("already registered")) {
        throw new Error(`Creating synthetic user ${email}: ${createErr.message}`);
      }
    }
  }
}

async function cleanSyntheticUsers(adminClient) {
  try {
    const { data: listData } = await adminClient.auth.admin.listUsers();
    const users = listData?.users || [];

    for (const email of SYNTHETIC_TARGETS) {
      const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (user) {
        await adminClient.from("production_tasks").delete().eq("user_id", user.id);
        await adminClient.from("content_links").delete().eq("user_id", user.id);
        await adminClient.from("content_items").delete().eq("user_id", user.id);
        await adminClient.from("reference_accounts").delete().eq("user_id", user.id);
        await adminClient.from("content_pillars").delete().eq("user_id", user.id);
        await adminClient.auth.admin.deleteUser(user.id);
      }
    }
  } catch (err) {
    throw new Error(`[CLEANUP FAILURE] Failed cleaning synthetic users: ${err.message}`);
  }
}


async function captureDatabaseSnapshot(adminClient, userIds) {
  const [pillarsRes, itemsRes, linksRes, tasksRes, accsRes] = await Promise.all([
    adminClient.from("content_pillars").select("*").in("user_id", userIds).order("id"),
    adminClient.from("content_items").select("*").in("user_id", userIds).order("id"),
    adminClient.from("content_links").select("*").in("user_id", userIds).order("id"),
    adminClient.from("production_tasks").select("*").in("user_id", userIds).order("id"),
    adminClient.from("reference_accounts").select("*").in("user_id", userIds).order("id"),
  ]);

  if (pillarsRes.error) throw pillarsRes.error;
  if (itemsRes.error) throw itemsRes.error;
  if (linksRes.error) throw linksRes.error;
  if (tasksRes.error) throw tasksRes.error;
  if (accsRes.error) throw accsRes.error;

  return {
    pillars: pillarsRes.data || [],
    items: itemsRes.data || [],
    links: linksRes.data || [],
    tasks: tasksRes.data || [],
    accounts: accsRes.data || [],
  };
}

function runScript(args = [], env = {}) {
  return spawnSync(process.execPath, [SCRIPT_PATH, "--manifest", FIXTURE_MANIFEST, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
    },
  });
}

// -----------------------------------------------------------------------------
// 1. EXACT TARGET ENFORCEMENT (SYNTHETIC ADDRESSES ONLY)
// -----------------------------------------------------------------------------
test("Target Enforcement: Exact manifest targets accepted, rejects extra, missing, duplicate, or malformed", () => {
  const approved = [...SYNTHETIC_TARGETS];

  // Exact match
  const validRes = validateTargetEmails(approved, approved);
  assert.equal(validRes.valid, true);
  assert.equal(validRes.normalized.length, 3);

  // Missing target
  const missingRes = validateTargetEmails([approved[0], approved[1]], approved);
  assert.equal(missingRes.valid, false);
  assert.match(missingRes.error, /Expected exactly 3 target accounts/);

  // Extra target
  const extraRes = validateTargetEmails([...approved, UNAUTHORIZED_TARGET], approved);
  assert.equal(extraRes.valid, false);
  assert.match(extraRes.error, /Expected exactly 3 target accounts/);

  // Duplicate target
  const dupRes = validateTargetEmails([approved[0], approved[0], approved[1]], approved);
  assert.equal(dupRes.valid, false);
  assert.match(dupRes.error, /Duplicate target email detected/);

  // Malformed target
  const malformedRes = validateTargetEmails([approved[0], "not-an-email", approved[2]], approved);
  assert.equal(malformedRes.valid, false);
  assert.match(malformedRes.error, /Malformed target email/);

  // Replaced with unauthorized target
  const unauthRes = validateTargetEmails([approved[0], UNAUTHORIZED_TARGET, approved[2]], approved);
  assert.equal(unauthRes.valid, false);
  assert.match(unauthRes.error, /Unauthorized or unexpected target email/);
});

test("Target Enforcement: CLI rejects unauthorized or extra target email arguments", () => {
  const res = runScript([
    "--target-emails",
    `${SYNTHETIC_TARGETS[0]},${SYNTHETIC_TARGETS[1]},${UNAUTHORIZED_TARGET}`,
  ]);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /Unauthorized or unexpected target email/);
});

// -----------------------------------------------------------------------------
// 2. REMOTE BYPASS REGRESSION TESTS (PROVE ZERO NETWORK/DB CALLS)
// -----------------------------------------------------------------------------
test("Remote Bypass Regression: --allow-hosted-write is completely removed and rejected before any execution", () => {
  const res = runScript(["--allow-hosted-write"]);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /Unknown argument: "--allow-hosted-write"/);
});

test("Remote Bypass Regression: --local with hosted URL hostname fails as assertion before any network/database call", () => {
  const res = runScript(["--local"], {
    NEXT_PUBLIC_SUPABASE_URL: "https://remote-project-bypass-attempt.supabase.co",
  });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /\[SECURITY ABORT\]/);
  assert.match(res.stderr, /--local flag was specified, but Supabase URL hostname is non-local/);
  assert.match(res.stderr, /A CLI flag must never turn a hosted URL into a local target/);
});

test("Remote Bypass Regression: Non-local target URL strictly halts commit mode", () => {
  const res = runScript(
    ["--commit", "--confirm-backup", "--confirm-execution"],
    {
      NEXT_PUBLIC_SUPABASE_URL: "https://remote-project.supabase.co",
    }
  );
  assert.equal(res.status, 1);
  assert.match(res.stderr, /\[SAFETY STOP\] Hosted database writes are strictly disabled in this cycle/);
});

// -----------------------------------------------------------------------------
// 3. DATE POLICY ENFORCEMENT & LOCKED POLICY
// -----------------------------------------------------------------------------
test("Date Policy Enforcement: Locked decisions required, rejects missing, extra, invalid calendar dates, or policy count deviations", () => {
  const dummyWarnings = Array.from({ length: 60 }, (_, i) => ({ source_number: i + 1, warning: "Reversal" }));

  // Valid 38 dates, 22 nulls
  const validDecisions = {};
  for (let i = 1; i <= 38; i++) validDecisions[i] = "2026-06-15";
  for (let i = 39; i <= 60; i++) validDecisions[i] = null;

  const validPath = resolve(process.cwd(), "tests/fixtures/temp-valid-decisions.json");
  writeFileSync(validPath, JSON.stringify(validDecisions));

  try {
    const res = loadAndValidateDateDecisions(validPath, dummyWarnings);
    assert.equal(res.valid, true);
    assert.equal(res.counts.corrected, 38);
    assert.equal(res.counts.unscheduled, 22);
    assert.equal(res.counts.total, 60);
  } finally {
    if (existsSync(validPath)) unlinkSync(validPath);
  }

  // Policy deviation: 39 dates, 21 nulls
  const deviatedDecisions = { ...validDecisions, 39: "2026-07-20" };
  const deviatedPath = resolve(process.cwd(), "tests/fixtures/temp-deviated-decisions.json");
  writeFileSync(deviatedPath, JSON.stringify(deviatedDecisions));

  try {
    const res = loadAndValidateDateDecisions(deviatedPath, dummyWarnings);
    assert.equal(res.valid, false);
    assert.match(res.error, /Date decision policy mismatch/);
  } finally {
    if (existsSync(deviatedPath)) unlinkSync(deviatedPath);
  }

  // Invalid calendar date (e.g. leap year mismatch or 31st on 30-day month)
  const invalidDateDecisions = { ...validDecisions, 1: "2026-02-30" };
  const invalidPath = resolve(process.cwd(), "tests/fixtures/temp-invalid-decisions.json");
  writeFileSync(invalidPath, JSON.stringify(invalidDateDecisions));

  try {
    const res = loadAndValidateDateDecisions(invalidPath, dummyWarnings);
    assert.equal(res.valid, false);
    assert.match(res.error, /Must be a valid calendar date/);
  } finally {
    if (existsSync(invalidPath)) unlinkSync(invalidPath);
  }

  // Extra decision key not in warnings
  const extraDecisions = { ...validDecisions, 999: "2026-08-01" };
  const extraPath = resolve(process.cwd(), "tests/fixtures/temp-extra-decisions.json");
  writeFileSync(extraPath, JSON.stringify(extraDecisions));

  try {
    const res = loadAndValidateDateDecisions(extraPath, dummyWarnings);
    assert.equal(res.valid, false);
    assert.match(res.error, /Extra unexpected decision for content item #999/);
  } finally {
    if (existsSync(extraPath)) unlinkSync(extraPath);
  }
});

// -----------------------------------------------------------------------------
// 4. SAFETY GUARDS: BACKUP, CONFIRMATION, & AUTH PREFLIGHT
// -----------------------------------------------------------------------------
test("Safety Guards: Commit mode strictly requires --confirm-backup and --confirm-execution", () => {
  const res1 = runScript(["--commit"]);
  assert.equal(res1.status, 1);
  assert.match(res1.stderr, /Commit mode requires explicit backup confirmation flag: --confirm-backup/);

  const res2 = runScript(["--commit", "--confirm-backup"]);
  assert.equal(res2.status, 1);
  assert.match(res2.stderr, /Commit mode requires explicit final execution confirmation flag: --confirm-execution/);
});

test("Auth Preflight: Commit mode halts if target user is missing or email is unconfirmed", async () => {
  const { adminClient } = getLocalAdminClient();
  await cleanSyntheticUsers(adminClient);

  try {
    // Missing user test
    const resMissing = runScript(["--commit", "--confirm-backup", "--confirm-execution"]);
    assert.equal(resMissing.status, 1);
    assert.match(resMissing.stderr, /Target user\(s\) missing from Supabase Auth/);

    // Unconfirmed email test
    await ensureSyntheticUsersExist(adminClient, false); // created with email_confirm = false
    const resUnconfirmed = runScript(["--commit", "--confirm-backup", "--confirm-execution"]);
    assert.equal(resUnconfirmed.status, 1);
    assert.match(resUnconfirmed.stderr, /Target user email\(s\) not confirmed in Supabase Auth/);
  } finally {
    await cleanSyntheticUsers(adminClient);
  }
});

// -----------------------------------------------------------------------------
// 5. DRY-RUN SAFETY & PRIVACY
// -----------------------------------------------------------------------------
test("Dry-Run Safety: Default CLI mode performs zero database writes and reports dry-run status", () => {
  const res = runScript([]);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /Execution Mode:\s+DRY-RUN/);
  assert.match(res.stdout, /Target Accounts:\s+3 verified owner accounts \[redacted for privacy\]/);
  assert.match(res.stdout, /VERDICT: Dry-run verification completed successfully\. Zero database writes performed\./);
});

test("Dry-Run Safety: CLI with --json outputs structured validation report with 0 writes performed without leaking emails", () => {
  const res = runScript(["--json"]);
  assert.equal(res.status, 0);
  const data = JSON.parse(res.stdout);
  assert.equal(data.mode, "dry-run");
  assert.equal(data.status, "success");
  assert.equal(data.database_writes_performed, 0);
  assert.equal(data.target_count, 3);
  // Guarantee no emails or user IDs in JSON report
  assert.equal(data.target_accounts, undefined);
  assert.equal(data.user_ids, undefined);
  assert.equal(data.verification.date_decisions_total, 60);
  assert.equal(data.verification.date_decisions_corrected, 38);
  assert.equal(data.verification.date_decisions_unscheduled, 22);
  assert.equal(data.verification.baselines_match, true);
});

test("Privacy & Secret Leakage: Zero private source URLs, tokens, passwords, or emails in CLI output", () => {
  const res = runScript([]);
  assert.equal(res.status, 0);

  // Reject external URLs or domains
  assert.doesNotMatch(res.stdout, /https:\/\//);
  assert.doesNotMatch(res.stdout, /tiktok\.com|instagram\.com|drive\.google\.com|notion\.so/i);
  // Reject keys, secrets, tokens
  assert.doesNotMatch(res.stdout, /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);
  assert.doesNotMatch(res.stdout, /sb_secret_/);
  assert.doesNotMatch(res.stdout, /service_role/i);
  // Reject email addresses in stdout
  assert.doesNotMatch(res.stdout, /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
});

test("Portable Fixture Privacy: workbook and task fixtures contain synthetic content only", () => {
  const { excel, csv } = parseSourceDatasets(FIXTURE_EXCEL, FIXTURE_CSV);

  for (const item of excel.auto_candidates) {
    assert.match(item.title, /^Synthetic content topic \d{3}$/);
    assert.match(item.objective, /^Synthetic objective \d{3}$/);
    assert.match(item.hook, /^Synthetic main message \d{3}$/);
    assert.match(item.production_detail, /^Synthetic production detail \d{3}$/);
    assert.match(item.cta, /^Synthetic call to action \d{3}$/);
  }

  for (const link of excel.all_links) {
    assert.equal(new URL(link.url).hostname, "example.test");
  }

  for (const account of excel.reference_accounts) {
    assert.match(account.account_label, /^synthetic-reference-\d{2}$/);
    assert.equal(new URL(account.url).hostname, "example.test");
  }

  const tasks = [...csv.linked_tasks, ...csv.standalone_tasks];
  for (const task of tasks) {
    assert.match(task.title, /synthetic/i);
    assert.match(task.description, /synthetic/i);
  }
});

// -----------------------------------------------------------------------------
// 6. GENUINE IMPORT-LEVEL ATOMICITY: SEEDED CONFLICTS, FAILURE INJECTION, DEEP EQUALITY ROLLBACK, SUCCESSFUL COMMIT, & IDEMPOTENT RERUN
// -----------------------------------------------------------------------------
test("Import-Level Atomicity: Seeded pre-existing records with conflicting values, failure injection during owner 2, deep equality restoration, successful commit, and idempotent rerun", async () => {
  const { adminClient, supabaseUrl, publishableKey } = getLocalAdminClient();

  try {
    await ensureSyntheticUsersExist(adminClient, true);
    await cleanSyntheticUsers(adminClient);
    await ensureSyntheticUsersExist(adminClient, true);

    const { data: usersData } = await adminClient.auth.admin.listUsers();
    const targetUsers = SYNTHETIC_TARGETS.map((email) => {
      const u = usersData.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
      assert.ok(u, `Target user ${email} must exist in auth.users`);
      return u;
    });
    const userIds = targetUsers.map((u) => u.id);

    const { excel, csv } = parseSourceDatasets(FIXTURE_EXCEL, FIXTURE_CSV);
    const allTasks = [...csv.linked_tasks, ...csv.standalone_tasks];
    const firstTaskKey = allTasks[0].import_key;
    const firstAcc = excel.reference_accounts[0];
    const firstItemLink = excel.all_links.find((l) => l.source_number === 1);

    // Seed every target owner with pre-existing content items, links, tasks, pillars, and reference accounts
    // containing values different from the import dataset
    for (const u of targetUsers) {
      // 1. Pre-existing pillar
      const { data: pillar, error: pillarErr } = await adminClient
        .from("content_pillars")
        .insert({
          user_id: u.id,
          name_en: "Pre-existing Seed Pillar",
          name_th: "หมวดเดิมสำหรับการทดสอบ",
          color: "#e11d48",
          sort_order: 99,
        })
        .select("id")
        .single();
      if (pillarErr) throw pillarErr;

      // 2. Pre-existing content item (#1) with conflicting values
      const { data: item, error: itemErr } = await adminClient
        .from("content_items")
        .insert({
          user_id: u.id,
          content_pillar_id: pillar.id,
          source_number: 1,
          title: "Pre-existing Conflicting Item Title",
          status: "scripting",
          platforms: ["facebook"],
          format: "story",
          goal: "growth",
          hook: "Old Hook Value",
          objective: "Old Objective Value",
          production_detail: "Old Production Detail Value",
          cta: "Old CTA Value",
          caption: "Old Caption Value",
          notes: "Old Seed Notes Value",
          progress: 42,
          publish_at: "2025-01-01T10:00:00Z",
          publish_time_known: true,
          review_status: "in_process",
          source_content_status: "raw",
        })
        .select("id")
        .single();
      if (itemErr) throw itemErr;

      // 3. Pre-existing content link attached to item #1 matching import URL with conflicting label
      const { error: linkErr } = await adminClient.from("content_links").insert({
        user_id: u.id,
        content_item_id: item.id,
        link_type: firstItemLink.link_type,
        platform: firstItemLink.platform,
        url: firstItemLink.url,
        label: "Pre-existing Conflicting Seed Link Label",
        sort_order: 99,
      });
      if (linkErr) throw linkErr;

      // 4. Pre-existing task with matching import_key but conflicting values
      const { error: taskErr } = await adminClient.from("production_tasks").insert({
        user_id: u.id,
        content_item_id: item.id,
        import_key: firstTaskKey,
        title: "Pre-existing Conflicting Task Title",
        status: "in_progress",
        due_date: "2025-02-01",
        priority: "low",
        task_type: "video",
        description: "Pre-existing conflicting task description",
      });
      if (taskErr) throw taskErr;

      // 5. Pre-existing reference account with matching platform:url but conflicting label/notes
      const { error: accErr } = await adminClient.from("reference_accounts").insert({
        user_id: u.id,
        platform: firstAcc.platform,
        url: firstAcc.url,
        account_label: "Pre-existing Conflicting Account Label",
        notes: "Pre-existing conflicting account notes",
      });
      if (accErr) throw accErr;
    }

    // Capture complete row-level snapshot before failure attempt
    const snapshotBefore = await captureDatabaseSnapshot(adminClient, userIds);
    assert.equal(snapshotBefore.pillars.length, 3, "Expected 3 seeded pillars");
    assert.equal(snapshotBefore.items.length, 3, "Expected 3 seeded items");
    assert.equal(snapshotBefore.links.length, 3, "Expected 3 seeded links");
    assert.equal(snapshotBefore.tasks.length, 3, "Expected 3 seeded tasks");
    assert.equal(snapshotBefore.accounts.length, 3, "Expected 3 seeded accounts");

    // Execute with failure injection hook active (triggers failure during owner 2 after content updates)
    let caughtErr = null;
    try {
      await runWorkflow({
        commit: true,
        confirmBackup: true,
        confirmExecution: true,
        manifestPath: FIXTURE_MANIFEST,
        excelPath: FIXTURE_EXCEL,
        csvPath: FIXTURE_CSV,
        decisionsPath: FIXTURE_DECISIONS,
        _injectFailureDuringOwner2AfterContent: true,
      });
    } catch (err) {
      caughtErr = err;
    }

    assert.ok(caughtErr, "Workflow must fail on injected error");
    assert.match(caughtErr.message, /\[TEST INJECTION\] Simulated failure during owner 2 after content creation/);

    // Capture complete row-level snapshot after failure attempt
    const snapshotAfterFailure = await captureDatabaseSnapshot(adminClient, userIds);

    // Assert exact deep equality between database before and after failure
    assert.deepEqual(
      snapshotAfterFailure,
      snapshotBefore,
      "Database state after transaction abort must be deeply equal to exact pre-import state across all tables and values"
    );

    // -------------------------------------------------------------------------
    // Successful Commit & Authoritative Verification (with explicit overwrite)
    // -------------------------------------------------------------------------
    const res1 = await runWorkflow({
      commit: true,
      confirmBackup: true,
      confirmExecution: true,
      manifestPath: FIXTURE_MANIFEST,
      excelPath: FIXTURE_EXCEL,
      csvPath: FIXTURE_CSV,
      decisionsPath: FIXTURE_DECISIONS,
      allowOverwrite: true,
    });

    assert.equal(res1.status, "success");
    // Pre-existing item #1 was updated for all 3 owners; items 2..158 were created
    assert.equal(res1.execution_results.totals.content_items.updated, 3);
    assert.equal(res1.execution_results.totals.content_items.created, EXPECTED_TOTAL.content_items - 3);
    assert.equal(res1.execution_results.totals.content_items.total, EXPECTED_TOTAL.content_items);

    // Pre-existing task was updated for all 3 owners; other tasks created
    assert.equal(res1.execution_results.totals.production_tasks.updated, 3);
    assert.equal(res1.execution_results.totals.production_tasks.created, EXPECTED_TOTAL.production_tasks - 3);
    assert.equal(res1.execution_results.totals.production_tasks.total, EXPECTED_TOTAL.production_tasks);

    // Pre-existing reference account was updated for all 3 owners; other accounts created
    assert.equal(res1.execution_results.totals.reference_accounts.updated, 3);
    assert.equal(res1.execution_results.totals.reference_accounts.created, EXPECTED_TOTAL.reference_accounts - 3);
    assert.equal(res1.execution_results.totals.reference_accounts.total, EXPECTED_TOTAL.reference_accounts);

    // Content links were created
    assert.equal(res1.execution_results.totals.content_links.total, EXPECTED_TOTAL.content_links);

    // Authoritative check that database row counts per owner match expected totals under RLS
    const decisionsData = JSON.parse(readFileSync(FIXTURE_DECISIONS, "utf8"));
    for (const email of SYNTHETIC_TARGETS) {
      const linkRes = await adminClient.auth.admin.generateLink({ type: "magiclink", email });
      assert.ok(linkRes.data?.properties?.email_otp);
      const userClient = createClient(supabaseUrl, publishableKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: authData } = await userClient.auth.verifyOtp({
        email,
        token: linkRes.data.properties.email_otp,
        type: "email",
      });
      const userId = authData.user.id;

      const [itemsRes, linksRes, tasksRes, accsRes] = await Promise.all([
        userClient.from("content_items").select("id, user_id, source_number, publish_at"),
        userClient.from("content_links").select("id, user_id"),
        userClient.from("production_tasks").select("id, user_id"),
        userClient.from("reference_accounts").select("id, user_id"),
      ]);

      const items = itemsRes.data || [];
      const links = linksRes.data || [];
      const tasks = tasksRes.data || [];
      const accounts = accsRes.data || [];

      assert.equal(items.length, EXPECTED_PER_ACCOUNT.content_items);
      assert.equal(links.length, EXPECTED_PER_ACCOUNT.content_links);
      assert.equal(tasks.length, EXPECTED_PER_ACCOUNT.production_tasks);
      assert.equal(accounts.length, EXPECTED_PER_ACCOUNT.reference_accounts);

      for (const i of items) assert.equal(i.user_id, userId);
      for (const l of links) assert.equal(l.user_id, userId);
      for (const t of tasks) assert.equal(t.user_id, userId);
      for (const a of accounts) assert.equal(a.user_id, userId);

      // Verify date decisions in database
      const itemsBySrc = new Map(items.map((i) => [i.source_number, i]));
      let correctedCount = 0;
      let unscheduledCount = 0;
      for (const [srcStr, expDate] of Object.entries(decisionsData)) {
        const item = itemsBySrc.get(Number(srcStr));
        assert.ok(item, `Missing item #${srcStr}`);
        if (expDate !== null) {
          assert.ok(item.publish_at && item.publish_at.startsWith(expDate));
          correctedCount++;
        } else {
          assert.equal(item.publish_at, null);
          unscheduledCount++;
        }
      }
      assert.equal(correctedCount, EXPECTED_PER_ACCOUNT.corrected_date_decisions);
      assert.equal(unscheduledCount, EXPECTED_PER_ACCOUNT.unscheduled_date_decisions);
    }

    // -------------------------------------------------------------------------
    // Idempotent Rerun (with explicit overwrite)
    // -------------------------------------------------------------------------
    const res2 = await runWorkflow({
      commit: true,
      confirmBackup: true,
      confirmExecution: true,
      manifestPath: FIXTURE_MANIFEST,
      excelPath: FIXTURE_EXCEL,
      csvPath: FIXTURE_CSV,
      decisionsPath: FIXTURE_DECISIONS,
      allowOverwrite: true,
    });

    assert.equal(res2.status, "success");
    assert.equal(res2.execution_results.totals.content_items.created, 0);
    assert.equal(res2.execution_results.totals.content_items.updated, EXPECTED_TOTAL.content_items);
    assert.equal(res2.execution_results.totals.content_links.created, 0);
    assert.equal(res2.execution_results.totals.content_links.updated, EXPECTED_TOTAL.content_links);
    assert.equal(res2.execution_results.totals.production_tasks.created, 0);
    assert.equal(res2.execution_results.totals.production_tasks.updated, EXPECTED_TOTAL.production_tasks);
    assert.equal(res2.execution_results.totals.reference_accounts.created, 0);
    assert.equal(res2.execution_results.totals.reference_accounts.updated, EXPECTED_TOTAL.reference_accounts);
  } finally {
    await cleanSyntheticUsers(adminClient);
  }
});

// -----------------------------------------------------------------------------
// 7. FULL EXECUTION, AUTHORITATIVE POST-WRITE VERIFICATION, & RERUN IDEMPOTENCY
// -----------------------------------------------------------------------------
test("Full Execution & Authoritative Post-Write Verification: 158/419/30/16 per owner, exact date decisions, and idempotent rerun", async () => {
  const { adminClient, supabaseUrl, publishableKey } = getLocalAdminClient();

  try {
    await ensureSyntheticUsersExist(adminClient, true);
    await cleanSyntheticUsers(adminClient);
    await ensureSyntheticUsersExist(adminClient, true);

    // 1. First Execution
    const res1 = await runWorkflow({
      commit: true,
      confirmBackup: true,
      confirmExecution: true,
      manifestPath: FIXTURE_MANIFEST,
      excelPath: FIXTURE_EXCEL,
      csvPath: FIXTURE_CSV,
      decisionsPath: FIXTURE_DECISIONS,
    });

    assert.equal(res1.status, "success");
    assert.equal(res1.execution_results.totals.content_items.created, EXPECTED_TOTAL.content_items);
    assert.equal(res1.execution_results.totals.content_items.updated, 0);
    assert.equal(res1.execution_results.totals.content_links.created, EXPECTED_TOTAL.content_links);
    assert.equal(res1.execution_results.totals.content_links.updated, 0);
    assert.equal(res1.execution_results.totals.production_tasks.created, EXPECTED_TOTAL.production_tasks);
    assert.equal(res1.execution_results.totals.production_tasks.updated, 0);
    assert.equal(res1.execution_results.totals.reference_accounts.created, EXPECTED_TOTAL.reference_accounts);
    assert.equal(res1.execution_results.totals.reference_accounts.updated, 0);

    // 2. Authoritative Database Verification under RLS per synthetic owner
    const decisionsData = JSON.parse(readFileSync(FIXTURE_DECISIONS, "utf8"));

    for (const email of SYNTHETIC_TARGETS) {
      const linkRes = await adminClient.auth.admin.generateLink({ type: "magiclink", email });
      assert.ok(linkRes.data?.properties?.email_otp);
      const userClient = createClient(supabaseUrl, publishableKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: authData } = await userClient.auth.verifyOtp({
        email,
        token: linkRes.data.properties.email_otp,
        type: "email",
      });
      const userId = authData.user.id;

      // Query row counts directly from database
      const [itemsRes, linksRes, tasksRes, accsRes] = await Promise.all([
        userClient.from("content_items").select("id, user_id, source_number, publish_at"),
        userClient.from("content_links").select("id, user_id"),
        userClient.from("production_tasks").select("id, user_id"),
        userClient.from("reference_accounts").select("id, user_id"),
      ]);

      const items = itemsRes.data || [];
      const links = linksRes.data || [];
      const tasks = tasksRes.data || [];
      const accounts = accsRes.data || [];

      assert.equal(items.length, EXPECTED_PER_ACCOUNT.content_items);
      assert.equal(links.length, EXPECTED_PER_ACCOUNT.content_links);
      assert.equal(tasks.length, EXPECTED_PER_ACCOUNT.production_tasks);
      assert.equal(accounts.length, EXPECTED_PER_ACCOUNT.reference_accounts);

      // Verify every row belongs to current owner user_id
      for (const i of items) assert.equal(i.user_id, userId);
      for (const l of links) assert.equal(l.user_id, userId);
      for (const t of tasks) assert.equal(t.user_id, userId);
      for (const a of accounts) assert.equal(a.user_id, userId);

      // Verify 38 corrected dates and 22 null dates exactly
      const itemsBySrc = new Map(items.map((i) => [i.source_number, i]));
      let correctedCount = 0;
      let unscheduledCount = 0;

      for (const [srcStr, expDate] of Object.entries(decisionsData)) {
        const item = itemsBySrc.get(Number(srcStr));
        assert.ok(item, `Missing item #${srcStr}`);
        if (expDate !== null) {
          assert.ok(item.publish_at && item.publish_at.startsWith(expDate));
          correctedCount++;
        } else {
          assert.equal(item.publish_at, null);
          unscheduledCount++;
        }
      }

      assert.equal(correctedCount, 38);
      assert.equal(unscheduledCount, 22);
    }

    // 3. Idempotent Rerun: second run updates existing records with 0 created
    const res2 = await runWorkflow({
      commit: true,
      confirmBackup: true,
      confirmExecution: true,
      manifestPath: FIXTURE_MANIFEST,
      excelPath: FIXTURE_EXCEL,
      csvPath: FIXTURE_CSV,
      decisionsPath: FIXTURE_DECISIONS,
      allowOverwrite: true,
    });

    assert.equal(res2.execution_results.totals.content_items.created, 0);
    assert.equal(res2.execution_results.totals.content_items.updated, EXPECTED_TOTAL.content_items);
    assert.equal(res2.execution_results.totals.content_links.created, 0);
    assert.equal(res2.execution_results.totals.content_links.updated, EXPECTED_TOTAL.content_links);
    assert.equal(res2.execution_results.totals.production_tasks.created, 0);
    assert.equal(res2.execution_results.totals.production_tasks.updated, EXPECTED_TOTAL.production_tasks);
    assert.equal(res2.execution_results.totals.reference_accounts.created, 0);
    assert.equal(res2.execution_results.totals.reference_accounts.updated, EXPECTED_TOTAL.reference_accounts);
  } finally {
    await cleanSyntheticUsers(adminClient);
  }
});

// -----------------------------------------------------------------------------
// 8. SAFE RERUN: PRESERVE WEBSITE EDITS, EXTRA LINKS, AND LINK IDS
// -----------------------------------------------------------------------------
test("Safe Rerun: Preserves user edits made in website, extra user-added links, and original link IDs", async () => {
  const { adminClient } = getLocalAdminClient();

  try {
    await ensureSyntheticUsersExist(adminClient, true);
    await cleanSyntheticUsers(adminClient);
    await ensureSyntheticUsersExist(adminClient, true);

    // 1. Initial Import (Clean commit)
    const initialRes = await runWorkflow({
      commit: true,
      confirmBackup: true,
      confirmExecution: true,
      manifestPath: FIXTURE_MANIFEST,
      excelPath: FIXTURE_EXCEL,
      csvPath: FIXTURE_CSV,
      decisionsPath: FIXTURE_DECISIONS,
    });
    assert.equal(initialRes.status, "success");
    assert.equal(initialRes.execution_results.totals.content_items.created, EXPECTED_TOTAL.content_items);

    const { data: usersData } = await adminClient.auth.admin.listUsers();
    const owner1 = usersData.users.find((u) => u.email?.toLowerCase() === SYNTHETIC_TARGETS[0].toLowerCase());
    assert.ok(owner1);

    // 2. Query Item #1 and its pre-existing links for Owner 1
    const { data: item1 } = await adminClient
      .from("content_items")
      .select("id, title, notes, status, progress")
      .eq("user_id", owner1.id)
      .eq("source_number", 1)
      .single();
    assert.ok(item1);

    const { data: initialLinks } = await adminClient
      .from("content_links")
      .select("id, url, sort_order")
      .eq("user_id", owner1.id)
      .eq("content_item_id", item1.id)
      .order("sort_order");
    assert.ok(initialLinks && initialLinks.length > 0);
    const originalFirstLinkId = initialLinks[0].id;
    const originalFirstLinkUrl = initialLinks[0].url;

    // 3. Simulate User Edits in the Website
    const editedTitle = "Website Edited Title for Item 1";
    const editedNotes = "Custom notes written in web interface";
    const editedStatus = "reviewing";
    const editedProgress = 85;

    const { error: updateErr } = await adminClient
      .from("content_items")
      .update({
        title: editedTitle,
        notes: editedNotes,
        status: editedStatus,
        progress: editedProgress,
      })
      .eq("id", item1.id);
    assert.ifError(updateErr);

    // User adds an extra link in the website to item #1
    const extraLinkUrl = "https://custom.example.test/user-extra-footage-link";
    const { data: extraLink, error: extraLinkErr } = await adminClient
      .from("content_links")
      .insert({
        user_id: owner1.id,
        content_item_id: item1.id,
        link_type: "asset",
        platform: "youtube",
        url: extraLinkUrl,
        label: "Extra User Asset Added in Web",
        sort_order: 99,
      })
      .select("id")
      .single();
    assert.ifError(extraLinkErr);
    const extraLinkId = extraLink.id;

    // 4. Trigger Safe Rerun (allowOverwrite: false by default, allowExtraRecords: true)
    const rerunRes = await runWorkflow({
      commit: true,
      confirmBackup: true,
      confirmExecution: true,
      manifestPath: FIXTURE_MANIFEST,
      excelPath: FIXTURE_EXCEL,
      csvPath: FIXTURE_CSV,
      decisionsPath: FIXTURE_DECISIONS,
      allowOverwrite: false,
      allowExtraRecords: true,
      verifyDateDecisions: false,
    });

    assert.equal(rerunRes.status, "success");
    // All items preserved without overwriting user edits
    assert.equal(rerunRes.execution_results.totals.content_items.created, 0);
    assert.equal(rerunRes.execution_results.totals.content_items.updated, 0);
    assert.equal(rerunRes.execution_results.totals.content_items.preserved, EXPECTED_TOTAL.content_items);

    // 5. Authoritative Verification: Check that Website Edits, Extra Link, and Link IDs Survived!
    const { data: itemAfterRerun } = await adminClient
      .from("content_items")
      .select("id, title, notes, status, progress")
      .eq("id", item1.id)
      .single();

    assert.equal(itemAfterRerun.title, editedTitle, "User edited title must survive rerun");
    assert.equal(itemAfterRerun.notes, editedNotes, "User edited notes must survive rerun");
    assert.equal(itemAfterRerun.status, editedStatus, "User edited status must survive rerun");
    assert.equal(itemAfterRerun.progress, editedProgress, "User edited progress must survive rerun");

    // Verify existing link ID survived
    const { data: preservedLink } = await adminClient
      .from("content_links")
      .select("id, url")
      .eq("id", originalFirstLinkId)
      .single();
    assert.ok(preservedLink, "Original link ID must survive rerun without being deleted/recreated");
    assert.equal(preservedLink.url, originalFirstLinkUrl);

    // Verify extra link added in website survived
    const { data: preservedExtraLink } = await adminClient
      .from("content_links")
      .select("id, url, label")
      .eq("id", extraLinkId)
      .single();
    assert.ok(preservedExtraLink, "Extra link added in website must survive rerun");
    assert.equal(preservedExtraLink.url, extraLinkUrl);
  } finally {
    await cleanSyntheticUsers(adminClient);
  }
});

// -----------------------------------------------------------------------------
// 9. ERROR DIFFERENTIATION: DISTINGUISH TRANSACTION ROLLBACK FROM VERIFICATION INCOMPLETE
// -----------------------------------------------------------------------------
test("Error Differentiation: In-transaction failure causes rollback, while post-commit failure reports verification incomplete without rollback", async () => {
  const { adminClient } = getLocalAdminClient();

  try {
    await ensureSyntheticUsersExist(adminClient, true);
    await cleanSyntheticUsers(adminClient);
    await ensureSyntheticUsersExist(adminClient, true);

    // Case 1: In-transaction failure causes engine rollback
    let rollbackErr = null;
    try {
      await runWorkflow({
        commit: true,
        confirmBackup: true,
        confirmExecution: true,
        manifestPath: FIXTURE_MANIFEST,
        excelPath: FIXTURE_EXCEL,
        csvPath: FIXTURE_CSV,
        decisionsPath: FIXTURE_DECISIONS,
        _injectFailureDuringOwner2AfterContent: true,
      });
    } catch (err) {
      rollbackErr = err;
    }

    assert.ok(rollbackErr);
    assert.match(rollbackErr.message, /\[TRANSACTION ROLLED BACK\]/);
    assert.match(rollbackErr.message, /Zero database changes were committed/);

    // Verify database was completely rolled back: 0 items for all owners
    const { data: usersData } = await adminClient.auth.admin.listUsers();
    for (const email of SYNTHETIC_TARGETS) {
      const u = usersData.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
      const { count } = await adminClient.from("content_items").select("*", { count: "exact", head: true }).eq("user_id", u.id);
      assert.equal(count, 0, `Database must be empty after rollback for ${email}`);
    }

    // Case 2: Post-commit failure reports verification incomplete while keeping database committed
    let postCommitErr = null;
    try {
      await runWorkflow({
        commit: true,
        confirmBackup: true,
        confirmExecution: true,
        manifestPath: FIXTURE_MANIFEST,
        excelPath: FIXTURE_EXCEL,
        csvPath: FIXTURE_CSV,
        decisionsPath: FIXTURE_DECISIONS,
        _injectFailureDuringPostCommitVerification: true,
      });
    } catch (err) {
      postCommitErr = err;
    }

    assert.ok(postCommitErr);
    assert.equal(postCommitErr.name, "ImportCommittedVerificationIncompleteError");
    assert.match(postCommitErr.message, /\[IMPORT COMMITTED - VERIFICATION INCOMPLETE\]/);
    assert.match(postCommitErr.message, /The database transaction was successfully COMMITTED/);
    assert.match(postCommitErr.message, /A transaction rollback did NOT occur/);

    // Verify database records WERE written and committed (NOT rolled back)
    for (const email of SYNTHETIC_TARGETS) {
      const u = usersData.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
      const { count } = await adminClient.from("content_items").select("*", { count: "exact", head: true }).eq("user_id", u.id);
      assert.equal(count, EXPECTED_PER_ACCOUNT.content_items, `Records must be committed in database for ${email}`);
    }
  } finally {
    await cleanSyntheticUsers(adminClient);
  }
});
