import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SCRIPT_PATH = resolve(process.cwd(), "scripts/import-data.mjs");
const FIXTURE_EXCEL = resolve(process.cwd(), "tests/fixtures/sample-planner.xlsx");
const FIXTURE_CSV = resolve(process.cwd(), "tests/fixtures/sample-notion.csv");
const DECISIONS_VALID = resolve(process.cwd(), "tests/fixtures/sample-decisions.json");
const DECISIONS_INCOMPLETE = resolve(process.cwd(), "tests/fixtures/sample-incomplete-decisions.json");
const DECISIONS_INVALID_DATE = resolve(process.cwd(), "tests/fixtures/sample-invalid-date-decisions.json");
const DECISIONS_EXTRA = resolve(process.cwd(), "tests/fixtures/sample-extra-decisions.json");
const DECISIONS_DUPLICATE = resolve(process.cwd(), "tests/fixtures/sample-duplicate-decisions.json");

const TEST_EMAIL = "testowner@example.com";
const TEST_PASSWORD = "password123";

function getLocalAdminClient() {
  const statusProc = spawnSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" });
  assert.equal(statusProc.status, 0, "Failed to get local supabase status");
  const statusJson = JSON.parse(statusProc.stdout);
  return {
    adminClient: createClient("http://127.0.0.1:54321", statusJson.SERVICE_ROLE_KEY),
    publishableKey: statusJson.PUBLISHABLE_KEY || statusJson.ANON_KEY,
  };
}

async function cleanTestUser() {
  const { adminClient } = getLocalAdminClient();
  const { data: usersData } = await adminClient.auth.admin.listUsers();
  const user = usersData?.users?.find((u) => u.email === TEST_EMAIL);
  if (user) {
    await adminClient.auth.admin.deleteUser(user.id);
  }
}

function runImporter(args = [], env = {}) {
  return spawnSync(
    process.execPath,
    [SCRIPT_PATH, "--excel", FIXTURE_EXCEL, "--csv", FIXTURE_CSV, ...args],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        LOCAL_IMPORT_PASSWORD: TEST_PASSWORD,
        ...env,
      },
    }
  );
}

test.before(async () => {
  await cleanTestUser();
});

test.after(async () => {
  await cleanTestUser();
});

test("Importer CLI: Default dry-run mode succeeds without database writes", () => {
  const res = runImporter();
  assert.equal(res.status, 0, `Dry-run failed: ${res.stderr}`);
  assert.match(res.stdout, /DRY-RUN \(NO WRITES\)/);
  assert.match(res.stdout, /Dry-run preview completed successfully/);
  assert.match(res.stdout, /Automatic Content Candidates: 2/);
  assert.match(res.stdout, /Flagged Warnings: 2/);
});

test("Importer CLI: Rejects unknown CLI arguments", () => {
  const res1 = spawnSync(process.execPath, [SCRIPT_PATH, "--notion", "file.csv"], { encoding: "utf8" });
  assert.equal(res1.status, 1);
  assert.match(res1.stderr, /Unknown or unsupported argument: "--notion"/);

  const res2 = spawnSync(process.execPath, [SCRIPT_PATH, "--password", "secret"], { encoding: "utf8" });
  assert.equal(res2.status, 1);
  assert.match(res2.stderr, /Unknown or unsupported argument: "--password"/);

  const res3 = spawnSync(process.execPath, [SCRIPT_PATH, "--allow-non-owner-dev"], { encoding: "utf8" });
  assert.equal(res3.status, 1);
  assert.match(res3.stderr, /Unknown or unsupported argument: "--allow-non-owner-dev"/);

  const res4 = spawnSync(process.execPath, [SCRIPT_PATH, "--user-id", "00000000-0000-0000-0000-000000000000"], { encoding: "utf8" });
  assert.equal(res4.status, 1);
  assert.match(res4.stderr, /Unknown or unsupported argument: "--user-id"/);
});

test("Importer CLI: Regression: Pre-existing hosted-looking environment variables are rejected with SECURITY ABORT", () => {
  const res = runImporter([], { NEXT_PUBLIC_SUPABASE_URL: "https://remote-hosted-project.supabase.co" });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /\[SECURITY ABORT\]/);
  assert.match(res.stderr, /cannot run against non-local host/);
});

test("Importer CLI: Commit mode halts if decisions file is not provided for warnings", () => {
  const res = runImporter(["--commit"]);
  assert.equal(res.status, 1, "Should exit with status 1");
  assert.match(res.stderr, /Refusing to commit records with 2 ambiguous date warnings/);
});

test("Importer CLI: Incomplete decisions file (1 entry for 2 warnings) is strictly rejected", () => {
  const res = runImporter(["--commit", "--decisions", DECISIONS_INCOMPLETE]);
  assert.equal(res.status, 1, "Should exit with status 1");
  assert.match(res.stderr, /missing 1 decisions out of 2 warnings/);
});

test("Importer CLI: Invalid calendar date (e.g. 2026-02-30) in decisions file is strictly rejected", () => {
  const res = runImporter(["--commit", "--decisions", DECISIONS_INVALID_DATE]);
  assert.equal(res.status, 1, "Should exit with status 1");
  assert.match(res.stderr, /Must be a valid calendar date/);
});

test("Importer CLI: Extra decision key not in warnings is strictly rejected", () => {
  const res = runImporter(["--commit", "--decisions", DECISIONS_EXTRA]);
  assert.equal(res.status, 1, "Should exit with status 1");
  assert.match(res.stderr, /Extra unexpected decision for content item #999/);
});

test("Importer CLI: Duplicate decision keys are strictly rejected", () => {
  const res = runImporter(["--commit", "--decisions", DECISIONS_DUPLICATE]);
  assert.equal(res.status, 1, "Should exit with status 1");
  assert.match(res.stderr, /Duplicate decision key in decisions file/);
});

test("Importer CLI: Strict privacy: Reports reject HTTP URLs, source URLs, credentials, and private absolute paths", () => {
  const res = runImporter(["--decisions", DECISIONS_VALID]);
  assert.equal(res.status, 0);

  // Reject HTTPS URLs
  assert.doesNotMatch(res.stdout, /https:\/\//);

  // Reject HTTP URLs except local loopback
  assert.doesNotMatch(res.stdout, /http:\/\/(?!127\.0\.0\.1|localhost)/);

  // Reject source external URLs
  assert.doesNotMatch(res.stdout, /tiktok\.com|instagram\.com|gypstore/i);

  // Reject credentials / passwords
  assert.doesNotMatch(res.stdout, /password123/i);
  assert.doesNotMatch(res.stdout, /service_role/i);

  // Reject unintended private absolute filesystem paths
  assert.doesNotMatch(res.stdout, /\/Users\//);
});

test("Importer CLI: Two consecutive runs verify clean first-run creation counts and idempotent second-run update counts with data integrity", async () => {
  // Guarantee isolated clean starting state for this test
  await cleanTestUser();

  const authArgs = ["--email", TEST_EMAIL];

  // 1. First run with commit from clean state
  const run1 = runImporter(["--commit", "--decisions", DECISIONS_VALID, ...authArgs]);
  assert.equal(run1.status, 0, `First import run failed: ${run1.stderr}`);
  assert.match(run1.stdout, /IMPORT COMMIT COMPLETE/);

  // Assert exact first-run creation counts
  assert.match(run1.stdout, /Content items:\s+2\s+\(created:\s*2,\s*updated:\s*0\)/);
  assert.match(run1.stdout, /Content links:\s+2\s+\(created:\s*2,\s*updated:\s*0\)/);
  assert.match(run1.stdout, /Production tasks:\s+2\s+\(created:\s*2,\s*updated:\s*0\)/);
  assert.match(run1.stdout, /Reference accounts:\s+2\s+\(created:\s*2,\s*updated:\s*0\)/);

  // Authenticate owner client to verify data under RLS
  const { publishableKey } = getLocalAdminClient();
  const ownerClient = createClient("http://127.0.0.1:54321", publishableKey);
  const { data: authData, error: signInErr } = await ownerClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  assert.equal(signInErr, null, `Sign-in failed: ${signInErr?.message}`);
  assert.ok(authData?.user?.id, "Owner authentication failed");

  // Verify total row counts
  const { count: items1 } = await ownerClient.from("content_items").select("*", { count: "exact", head: true });
  const { count: links1 } = await ownerClient.from("content_links").select("*", { count: "exact", head: true });
  const { count: tasks1 } = await ownerClient.from("production_tasks").select("*", { count: "exact", head: true });
  const { count: accounts1 } = await ownerClient.from("reference_accounts").select("*", { count: "exact", head: true });

  assert.equal(items1, 2, "Expected exactly 2 content items");
  assert.equal(links1, 2, "Expected exactly 2 content links");
  assert.equal(tasks1, 2, "Expected exactly 2 production tasks");
  assert.equal(accounts1, 2, "Expected exactly 2 reference accounts");

  // Verify representative row contents and relationships
  const { data: itemRows } = await ownerClient.from("content_items").select("id, source_number, platforms, status, publish_at").order("source_number");
  assert.equal(itemRows?.length, 2);
  const item1 = itemRows?.find((i) => i.source_number === 1);
  assert.ok(item1);
  assert.deepEqual(item1.platforms, ["tiktok"]);
  assert.equal(item1.status, "scripting");
  assert.equal(item1.publish_at, "2026-06-10T00:00:00+00:00");

  const { data: linkRows } = await ownerClient.from("content_links").select("*").eq("content_item_id", item1.id);
  assert.equal(linkRows?.length, 1);
  assert.equal(linkRows[0].url, "https://tiktok.com/@gypstore/video/1");
  assert.equal(linkRows[0].link_type, "published");
  assert.equal(linkRows[0].platform, "tiktok");

  const { data: taskRows } = await ownerClient.from("production_tasks").select("id, title, status, content_item_id, task_type");
  const linkedTask = taskRows?.find((t) => t.title === "Shoot video for item 1");
  assert.ok(linkedTask);
  assert.equal(linkedTask.content_item_id, item1.id, "Linked task must reference item 1");
  assert.equal(linkedTask.status, "in_progress");
  assert.equal(linkedTask.task_type, "video");

  const standaloneTask = taskRows?.find((t) => t.title === "Organize lighting gear");
  assert.ok(standaloneTask);
  assert.equal(standaloneTask.content_item_id, null, "Standalone task content_item_id must be null");
  assert.equal(standaloneTask.status, "not_started");

  const { data: accRows } = await ownerClient.from("reference_accounts").select("account_label, platform, url");
  const homePro = accRows?.find((a) => a.account_label === "HomePro Thailand");
  assert.ok(homePro);
  assert.equal(homePro.platform, "tiktok");
  assert.equal(homePro.url, "https://tiktok.com/@homepro_th");

  // 2. Second run with commit (Idempotency test)
  const run2 = runImporter(["--commit", "--decisions", DECISIONS_VALID, ...authArgs]);
  assert.equal(run2.status, 0, `Second import run failed: ${run2.stderr}`);
  assert.match(run2.stdout, /IMPORT COMMIT COMPLETE/);

  // Assert exact second-run update counts
  assert.match(run2.stdout, /Content items:\s+2\s+\(created:\s*0,\s*updated:\s*2\)/);
  assert.match(run2.stdout, /Content links:\s+2\s+\(created:\s*0,\s*updated:\s*2\)/);
  assert.match(run2.stdout, /Production tasks:\s+2\s+\(created:\s*0,\s*updated:\s*2\)/);
  assert.match(run2.stdout, /Reference accounts:\s+2\s+\(created:\s*0,\s*updated:\s*2\)/);

  // Verify total counts remain unchanged
  const { count: items2 } = await ownerClient.from("content_items").select("*", { count: "exact", head: true });
  const { count: links2 } = await ownerClient.from("content_links").select("*", { count: "exact", head: true });
  const { count: tasks2 } = await ownerClient.from("production_tasks").select("*", { count: "exact", head: true });
  const { count: accounts2 } = await ownerClient.from("reference_accounts").select("*", { count: "exact", head: true });

  assert.equal(items2, 2, "Content items count must remain identical after second run");
  assert.equal(links2, 2, "Content links count must remain identical after second run");
  assert.equal(tasks2, 2, "Production tasks count must remain identical after second run");
  assert.equal(accounts2, 2, "Reference accounts count must remain identical after second run");
});
