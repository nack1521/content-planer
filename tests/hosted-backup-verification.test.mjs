import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { verifyBackup } from "../scripts/verify-hosted-backup.mjs";

const TEST_DIR = resolve(process.cwd(), ".private-import/test_backup_suite");

function getLocalAdminClient() {
  const statusProc = spawnSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" });
  if (statusProc.status !== 0) throw new Error("Local Supabase is not running.");
  const status = JSON.parse(statusProc.stdout);
  return {
    adminClient: createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
    dbUrl: status.DB_URL,
  };
}

// -----------------------------------------------------------------------------
// 1. SESSION POOLER SECURITY & UMASK: URL CONTAINS NO PASSWORD & UMASK 077 SET
// -----------------------------------------------------------------------------
test("Backup Security: Shell script enforces umask 077 and uses Session Pooler URL without password", () => {
  const scriptContent = fs.readFileSync("scripts/create-hosted-backup.sh", "utf8");
  assert.match(scriptContent, /umask 077/);
  assert.match(scriptContent, /POOLER_HOST="\${SUPABASE_POOLER_HOST:-aws-0-ap-southeast-1\.pooler\.supabase\.com}"/);
  assert.match(scriptContent, /POOLER_PORT="\${SUPABASE_POOLER_PORT:-5432}"/);
  assert.match(scriptContent, /POOLER_USER="\${SUPABASE_POOLER_USER:-postgres\.hdwiolcmlexpdoqhqjiw}"/);
  assert.match(scriptContent, /sslmode=require/);
  assert.match(scriptContent, /SECURE_DB_URL="postgresql:\/\/\$POOLER_USER@\$POOLER_HOST:\$POOLER_PORT\/\$POOLER_DB\?sslmode=require"/);
  assert.match(scriptContent, /export PGPASSWORD=/);
  assert.match(scriptContent, /unset PGPASSWORD/);
});

// -----------------------------------------------------------------------------
// 2. EXPORT FAILURE RESILIENCE & HONEST ROLES REPORTING (NO FAKE FILES)
// -----------------------------------------------------------------------------
test("Backup Resilience: Halts on export errors and never generates fake roles file", () => {
  const scriptContent = fs.readFileSync("scripts/create-hosted-backup.sh", "utf8");
  assert.match(scriptContent, /set -euo pipefail/);
  assert.match(scriptContent, /\[EXPORT ERROR\] Schema dump failed/);
  assert.match(scriptContent, /\[EXPORT ERROR\] Data dump failed/);
  // Ensure we NEVER write a fake placeholder roles file
  assert.doesNotMatch(scriptContent, /-- Standard Supabase managed roles.*roles\.sql/);
  assert.match(scriptContent, /rm -f "\$BACKUP_DIR\/roles\.sql"/);
});

// -----------------------------------------------------------------------------
// 3. DEEP RECOVERABILITY: VERIFIES ACCOUNT 2 BY OWNER ID & DISTINGUISHES RESTORE
// -----------------------------------------------------------------------------
test("Backup Recoverability: Verifies Account 2 unnumbered item by owner ID and distinguishes dump vs restore", async () => {
  const { adminClient } = getLocalAdminClient();

  const syntheticTargets = [
    "owner1-backup-test@example.test",
    "owner2-backup-test@example.test",
    "owner3-backup-test@example.test",
  ];
  const otherUserEmail = "unrelated-user@example.test";

  try {
    const { data: listData } = await adminClient.auth.admin.listUsers();
    for (const u of listData.users || []) {
      if ([...syntheticTargets, otherUserEmail].includes(u.email?.toLowerCase())) {
        await adminClient.auth.admin.deleteUser(u.id);
      }
    }

    // 1. Create target users + unrelated user
    const createdUsers = [];
    for (const email of syntheticTargets) {
      const { data: u, error: uErr } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      assert.ifError(uErr);
      createdUsers.push(u.user);
    }
    const { data: otherUser } = await adminClient.auth.admin.createUser({
      email: otherUserEmail,
      email_confirm: true,
    });

    const owner2 = createdUsers[1];

    // 2. Seed Account 2 with exactly 1 unnumbered content item
    const { data: item2, error: iErr } = await adminClient
      .from("content_items")
      .insert({
        user_id: owner2.id,
        title: "Account 2 Test Unnumbered Idea",
        status: "idea",
        platforms: ["tiktok", "instagram"],
        source_number: null,
      })
      .select()
      .single();
    assert.ifError(iErr);
    assert.ok(item2.id);

    // 3. Seed unrelated user with another unnumbered item (proves verifier filters by Account 2 owner ID, not global count!)
    await adminClient.from("content_items").insert({
      user_id: otherUser.user.id,
      title: "Unrelated User Unnumbered Idea",
      status: "idea",
      platforms: ["youtube"],
      source_number: null,
    });

    // 4. Dump local database
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DIR, { recursive: true });

    const env = { ...process.env, PGPASSWORD: "postgres" };
    const localUrl = "postgresql://postgres@127.0.0.1:54322/postgres";

    const p1 = spawnSync("npx", ["supabase", "db", "dump", "--db-url", localUrl, "-f", join(TEST_DIR, "schema.sql")], { env, encoding: "utf8" });
    assert.equal(p1.status, 0, "Schema dump failed: " + p1.stderr);

    const p2 = spawnSync("npx", ["supabase", "db", "dump", "--db-url", localUrl, "--data-only", "--use-copy", "-f", join(TEST_DIR, "data.sql")], { env, encoding: "utf8" });
    assert.equal(p2.status, 0, "Data dump failed: " + p2.stderr);

    // 5. Verify backup report
    const report = verifyBackup(TEST_DIR, { targetEmails: syntheticTargets });

    // Verifies dump contents checked is TRUE
    assert.equal(report.verification.dump_contents_checked, true);
    // Verifies restore tested is FALSE by default
    assert.equal(report.verification.restore_tested, false);
    assert.match(report.verification.restore_test_details, /NOT EXECUTED/);

    // Verifies Account 2 item specifically by owner ID
    assert.equal(report.recoverability.account_2_existing_item_recoverable, true);
    assert.equal(report.recoverability.account_2_user_id_matches_auth, true);
    assert.equal(report.data_verification.account_2_items_count, 1);
    assert.equal(report.data_verification.account_2_unnumbered_count, 1);
    assert.equal(report.data_verification.account_2_numbered_count, 0);

    // Roles export is honestly reported as false when omitted
    assert.equal(report.scope.roles_export.exported, false);
    assert.match(report.scope.roles_export.reason, /unsupported/);
  } finally {
    const { data: listData } = await adminClient.auth.admin.listUsers();
    for (const u of listData.users || []) {
      if ([...syntheticTargets, otherUserEmail].includes(u.email?.toLowerCase())) {
        await adminClient.auth.admin.deleteUser(u.id);
      }
    }
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// 4. DEEP RECOVERABILITY: REJECTS DUMP WHEN ACCOUNT 2 IS MISSING ITS ITEM
// -----------------------------------------------------------------------------
test("Backup Recoverability: Rejects backup when Account 2 has 0 unnumbered items for its owner ID", () => {
  const dummyDir = resolve(process.cwd(), ".private-import/test_missing_item_by_id");
  if (fs.existsSync(dummyDir)) fs.rmSync(dummyDir, { recursive: true, force: true });
  fs.mkdirSync(dummyDir, { recursive: true });

  try {
    fs.writeFileSync(join(dummyDir, "schema.sql"), "CREATE TABLE \"content_items\" (); CREATE TABLE \"content_links\" (); CREATE TABLE \"production_tasks\" (); CREATE TABLE \"reference_accounts\" (); CREATE TABLE \"content_pillars\" ();");
    // Owner 1 and 3 exist, Owner 2 exists with ID 2. But content_items only has an item for Owner 1!
    fs.writeFileSync(join(dummyDir, "data.sql"), "SET session_replication_role = replica;\nCOPY \"auth\".\"users\" (\"id\", \"email\", \"email_confirmed_at\") FROM stdin;\n1\towner1@example.test\t2026-09-17\n2\towner2@example.test\t2026-09-17\n3\towner3@example.test\t2026-09-17\n\\.\nCOPY \"public\".\"content_items\" (\"id\", \"user_id\", \"title\", \"status\", \"source_number\") FROM stdin;\n10\t1\tOwner 1 Idea\tidea\t\\N\n\\.");

    const rep = verifyBackup(dummyDir, {
      targetEmails: ["owner1@example.test", "owner2@example.test", "owner3@example.test"],
    });
    assert.equal(rep.verification.dump_contents_checked, false);
    assert.match(rep.errors.join("\n"), /Expected Account 2 \(owner ID 2\) to have exactly 1 unnumbered item/);
  } finally {
    if (fs.existsSync(dummyDir)) fs.rmSync(dummyDir, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// 5. DEEP RECOVERABILITY: REJECTS DUMP WHEN TARGET USER IS UNCONFIRMED
// -----------------------------------------------------------------------------
test("Backup Recoverability: Rejects backup when required target user has unconfirmed email", () => {
  const dummyDir = resolve(process.cwd(), ".private-import/test_unconfirmed_auth");
  if (fs.existsSync(dummyDir)) fs.rmSync(dummyDir, { recursive: true, force: true });
  fs.mkdirSync(dummyDir, { recursive: true });

  try {
    fs.writeFileSync(join(dummyDir, "schema.sql"), "CREATE TABLE \"content_items\" (); CREATE TABLE \"content_links\" (); CREATE TABLE \"production_tasks\" (); CREATE TABLE \"reference_accounts\" (); CREATE TABLE \"content_pillars\" ();");
    // Owner 2 is unconfirmed (\\N)
    fs.writeFileSync(join(dummyDir, "data.sql"), "SET session_replication_role = replica;\nCOPY \"auth\".\"users\" (\"id\", \"email\", \"email_confirmed_at\") FROM stdin;\n1\towner1@example.test\t2026-09-17\n2\towner2@example.test\t\\N\n3\towner3@example.test\t2026-09-17\n\\.\nCOPY \"public\".\"content_items\" (\"id\", \"user_id\", \"title\", \"status\", \"source_number\") FROM stdin;\n10\t2\tAccount 2 Idea\tidea\t\\N\n\\.");

    const rep = verifyBackup(dummyDir, {
      targetEmails: ["owner1@example.test", "owner2@example.test", "owner3@example.test"],
    });
    assert.equal(rep.verification.dump_contents_checked, false);
    assert.match(rep.errors.join("\n"), /Auth verification failure: expected 3 confirmed target accounts/);
  } finally {
    if (fs.existsSync(dummyDir)) fs.rmSync(dummyDir, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// 6. DEEP RECOVERABILITY: REJECTS DUMP WITH UNEXPECTED SOURCE-NUMBER COLLISION
// -----------------------------------------------------------------------------
test("Backup Recoverability: Rejects backup if numbered content items already exist prior to import", () => {
  const dummyDir = resolve(process.cwd(), ".private-import/test_collision_dump");
  if (fs.existsSync(dummyDir)) fs.rmSync(dummyDir, { recursive: true, force: true });
  fs.mkdirSync(dummyDir, { recursive: true });

  try {
    fs.writeFileSync(join(dummyDir, "schema.sql"), "CREATE TABLE \"content_items\" (); CREATE TABLE \"content_links\" (); CREATE TABLE \"production_tasks\" (); CREATE TABLE \"reference_accounts\" (); CREATE TABLE \"content_pillars\" ();");
    // Account 2 has a numbered item (source_number = 42)
    fs.writeFileSync(join(dummyDir, "data.sql"), "SET session_replication_role = replica;\nCOPY \"auth\".\"users\" (\"id\", \"email\", \"email_confirmed_at\") FROM stdin;\n1\towner1@example.test\t2026-09-17\n2\towner2@example.test\t2026-09-17\n3\towner3@example.test\t2026-09-17\n\\.\nCOPY \"public\".\"content_items\" (\"id\", \"user_id\", \"title\", \"status\", \"source_number\") FROM stdin;\n10\t2\tAccount 2 Idea\tidea\t\\N\n11\t2\tCollision Item\tidea\t42\n\\.");

    const rep = verifyBackup(dummyDir, {
      targetEmails: ["owner1@example.test", "owner2@example.test", "owner3@example.test"],
    });
    assert.equal(rep.verification.dump_contents_checked, false);
    assert.match(rep.errors.join("\n"), /Unexpected source-number collision: Account 2/);
  } finally {
    if (fs.existsSync(dummyDir)) fs.rmSync(dummyDir, { recursive: true, force: true });
  }
});
