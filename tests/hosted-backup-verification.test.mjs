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
// 1. SESSION POOLER SECURITY: URL CONTAINS NO PASSWORD
// -----------------------------------------------------------------------------
test("Backup Security: Shell script uses exact Session Pooler URL without embedded password", () => {
  const scriptContent = fs.readFileSync("scripts/create-hosted-backup.sh", "utf8");
  assert.match(scriptContent, /POOLER_HOST="aws-0-ap-southeast-1\.pooler\.supabase\.com"/);
  assert.match(scriptContent, /POOLER_PORT="5432"/);
  assert.match(scriptContent, /POOLER_USER="postgres\.hdwiolcmlexpdoqhqjiw"/);
  assert.match(scriptContent, /sslmode=require/);
  assert.match(scriptContent, /SECURE_DB_URL="postgresql:\/\/\$POOLER_USER@\$POOLER_HOST:\$POOLER_PORT\/\$POOLER_DB\?sslmode=require"/);
  assert.match(scriptContent, /export PGPASSWORD=/);
  assert.match(scriptContent, /unset PGPASSWORD/);
});

// -----------------------------------------------------------------------------
// 2. EXPORT FAILURE RESILIENCE: SCRIPT HALTS ON DUMP ERROR
// -----------------------------------------------------------------------------
test("Backup Resilience: Script halts immediately on dump failure without partial acceptance", () => {
  const scriptContent = fs.readFileSync("scripts/create-hosted-backup.sh", "utf8");
  assert.match(scriptContent, /set -euo pipefail/);
  assert.match(scriptContent, /\[EXPORT ERROR\] Schema dump failed/);
  assert.match(scriptContent, /\[EXPORT ERROR\] Data dump failed/);
});

// -----------------------------------------------------------------------------
// 3. DEEP RECOVERABILITY: PROVES ACCOUNT 2 UNNUMBERED ITEM & AUTH USERS RECOVERABLE
// -----------------------------------------------------------------------------
test("Backup Recoverability: Successfully parses and verifies Account 2 unnumbered item and 3 confirmed Auth users", async () => {
  const { adminClient } = getLocalAdminClient();

  const syntheticTargets = [
    "owner1-backup-test@example.test",
    "owner2-backup-test@example.test",
    "owner3-backup-test@example.test",
  ];

  try {
    const { data: listData } = await adminClient.auth.admin.listUsers();
    for (const u of listData.users || []) {
      if (syntheticTargets.includes(u.email?.toLowerCase())) {
        await adminClient.auth.admin.deleteUser(u.id);
      }
    }

    const createdUsers = [];
    for (const email of syntheticTargets) {
      const { data: u, error: uErr } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      assert.ifError(uErr);
      createdUsers.push(u.user);
    }

    const owner2 = createdUsers[1];

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

    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DIR, { recursive: true });

    const env = { ...process.env, PGPASSWORD: "postgres" };
    const localUrl = "postgresql://postgres@127.0.0.1:54322/postgres";

    const p1 = spawnSync("npx", ["supabase", "db", "dump", "--db-url", localUrl, "-f", join(TEST_DIR, "schema.sql")], { env, encoding: "utf8" });
    assert.equal(p1.status, 0, "Schema dump failed: " + p1.stderr);

    const p2 = spawnSync("npx", ["supabase", "db", "dump", "--db-url", localUrl, "--data-only", "--use-copy", "-f", join(TEST_DIR, "data.sql")], { env, encoding: "utf8" });
    assert.equal(p2.status, 0, "Data dump failed: " + p2.stderr);

    const report = verifyBackup(TEST_DIR, { targetEmails: syntheticTargets });

    assert.equal(report.verified, true, "Backup verification failed: " + report.errors.join(", "));
    assert.equal(report.recoverability.account_2_existing_item_recoverable, true);
    assert.equal(report.recoverability.account_2_user_id_matches_auth, true);
    assert.equal(report.recoverability.auth_users_recoverable, true);
    assert.equal(report.recoverability.ddl_executable_syntax, true);
    assert.equal(report.recoverability.triggers_disabled_for_restore, true);
    assert.equal(report.scope.auth_schema.confirmed_target_users_count, 3);
    assert.equal(report.data_verification.unnumbered_content_items, 1);
    assert.equal(report.data_verification.numbered_content_items, 0);
    assert.equal(report.scope.public_schema.data_included, true);
    assert.equal(report.scope.storage_schema.binary_blobs_excluded, true);
  } finally {
    const { data: listData } = await adminClient.auth.admin.listUsers();
    for (const u of listData.users || []) {
      if (syntheticTargets.includes(u.email?.toLowerCase())) {
        await adminClient.auth.admin.deleteUser(u.id);
      }
    }
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// 4. DEEP RECOVERABILITY: REJECTS DUMP MISSING ACCOUNT 2 UNNUMBERED ITEM
// -----------------------------------------------------------------------------
test("Backup Recoverability: Rejects backup when Account 2 unnumbered item is missing", () => {
  const dummyDir = resolve(process.cwd(), ".private-import/test_missing_item");
  if (fs.existsSync(dummyDir)) fs.rmSync(dummyDir, { recursive: true, force: true });
  fs.mkdirSync(dummyDir, { recursive: true });

  try {
    fs.writeFileSync(join(dummyDir, "schema.sql"), "CREATE TABLE \"content_items\" (); CREATE TABLE \"content_links\" (); CREATE TABLE \"production_tasks\" (); CREATE TABLE \"reference_accounts\" (); CREATE TABLE \"content_pillars\" ();");
    fs.writeFileSync(join(dummyDir, "data.sql"), "SET session_replication_role = replica;\nCOPY \"auth\".\"users\" (\"id\", \"email\", \"email_confirmed_at\") FROM stdin;\n1\towner1@example.test\t2026-09-17\n2\towner2@example.test\t2026-09-17\n3\towner3@example.test\t2026-09-17\n\\.");

    const rep = verifyBackup(dummyDir, {
      targetEmails: ["owner1@example.test", "owner2@example.test", "owner3@example.test"],
    });
    assert.equal(rep.verified, false);
    assert.match(rep.errors.join("\n"), /Expected exactly 1 pre-existing unnumbered item/);
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
    fs.writeFileSync(join(dummyDir, "data.sql"), "SET session_replication_role = replica;\nCOPY \"auth\".\"users\" (\"id\", \"email\", \"email_confirmed_at\") FROM stdin;\n1\towner1@example.test\t2026-09-17\n2\towner2@example.test\t\\N\n3\towner3@example.test\t2026-09-17\n\\.\nCOPY \"public\".\"content_items\" (\"id\", \"user_id\", \"title\", \"status\", \"source_number\") FROM stdin;\n10\t2\tAccount 2 Idea\tidea\t\\N\n\\.");

    const rep = verifyBackup(dummyDir, {
      targetEmails: ["owner1@example.test", "owner2@example.test", "owner3@example.test"],
    });
    assert.equal(rep.verified, false);
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
    fs.writeFileSync(join(dummyDir, "data.sql"), "SET session_replication_role = replica;\nCOPY \"auth\".\"users\" (\"id\", \"email\", \"email_confirmed_at\") FROM stdin;\n1\towner1@example.test\t2026-09-17\n2\towner2@example.test\t2026-09-17\n3\towner3@example.test\t2026-09-17\n\\.\nCOPY \"public\".\"content_items\" (\"id\", \"user_id\", \"title\", \"status\", \"source_number\") FROM stdin;\n10\t2\tAccount 2 Idea\tidea\t\\N\n11\t1\tCollision Item\tidea\t42\n\\.");

    const rep = verifyBackup(dummyDir, {
      targetEmails: ["owner1@example.test", "owner2@example.test", "owner3@example.test"],
    });
    assert.equal(rep.verified, false);
    assert.match(rep.errors.join("\n"), /Unexpected source-number collision: backup contains 1 numbered content items/);
  } finally {
    if (fs.existsSync(dummyDir)) fs.rmSync(dummyDir, { recursive: true, force: true });
  }
});
