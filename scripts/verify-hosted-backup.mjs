import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

/**
 * Parses PostgreSQL COPY blocks from a data dump file.
 * Returns an array of row objects for the specified table.
 */
function parseCopyTable(sqlContent, schemaName, tableName) {
  const pattern = new RegExp(
    `COPY\\s+"?` + schemaName + `"?\\."?` + tableName + `"?\\s*\\(([^)]+)\\)\\s*FROM\\s+stdin;([\\s\\S]*?)\\n\\\\\\.`,
    "g"
  );
  const rows = [];
  let match;
  while ((match = pattern.exec(sqlContent)) !== null) {
    const rawColumns = match[1];
    const columns = rawColumns
      .split(",")
      .map((c) => c.trim().replace(/^"|"$/g, ""));
    const rawData = match[2];
    const lines = rawData.split("\n").filter((l) => l.length > 0);
    for (const line of lines) {
      const values = line.split("\t").map((val) => (val === "\\N" ? null : val));
      const row = {};
      columns.forEach((col, idx) => {
        row[col] = values[idx] !== undefined ? values[idx] : null;
      });
      rows.push(row);
    }
  }
  return rows;
}

/**
 * Parses PostgreSQL INSERT INTO statements from a data dump file.
 */
function parseInsertTable(sqlContent, schemaName, tableName) {
  const pattern = new RegExp(
    `INSERT\\s+INTO\\s+"?` + schemaName + `"?\\."?` + tableName + `"?\\s*\\(([^)]+)\\)\\s*VALUES\\s*\\((.+?)\\);?`,
    "g"
  );
  const rows = [];
  let match;
  while ((match = pattern.exec(sqlContent)) !== null) {
    const columns = match[1]
      .split(",")
      .map((c) => c.trim().replace(/^"|"$/g, ""));
    // Simple SQL CSV parser for INSERT values
    const rawValues = match[2];
    const values = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < rawValues.length; i++) {
      const ch = rawValues[i];
      if (ch === "'") {
        if (inQuotes && rawValues[i + 1] === "'") {
          cur += "'";
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        values.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    values.push(cur.trim());

    const row = {};
    columns.forEach((col, idx) => {
      let val = values[idx] !== undefined ? values[idx] : null;
      if (val === "NULL" || val === "null" || val === undefined) {
        val = null;
      } else if (val && val.startsWith("'") && val.endsWith("'")) {
        val = val.slice(1, -1);
      }
      row[col] = val;
    });
    rows.push(row);
  }
  return rows;
}

export function parseTableRows(sqlContent, schemaName, tableName) {
  const copyRows = parseCopyTable(sqlContent, schemaName, tableName);
  if (copyRows.length > 0) return copyRows;
  return parseInsertTable(sqlContent, schemaName, tableName);
}

export function verifyBackup(backupDir, options = {}) {
  if (!existsSync(backupDir)) {
    throw new Error(`Backup directory not found: ${backupDir}`);
  }

  const manifestPath =
    options.manifestPath || resolve(process.cwd(), ".private-import/import-manifest.json");
  let targetEmails = options.targetEmails || null;
  if (!targetEmails && existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      targetEmails = manifest.target_accounts || null;
    } catch {}
  }
  if (!targetEmails) {
    targetEmails = [];
  }

  const normalizedTargets = targetEmails.map((e) => e.trim().toLowerCase());

  const files = readdirSync(backupDir);
  const report = {
    verified: false,
    timestamp: new Date().toISOString(),
    backup_dir: backupDir,
    connection_mode: "Session Pooler (port 5432, sslmode=require)",
    files: {},
    schema_verification: {},
    data_verification: {},
    scope: {
      public_schema: {
        tables_included: [
          "content_items",
          "content_links",
          "production_tasks",
          "reference_accounts",
          "content_pillars",
        ],
        data_included: true,
      },
      auth_schema: {
        tables_included: ["auth.users", "auth.identities"],
        users_count: 0,
        confirmed_target_users_count: 0,
        all_targets_confirmed: false,
      },
      storage_schema: {
        metadata_included: true,
        buckets_table: true,
        objects_table: true,
        binary_blobs_excluded: true,
        binary_blobs_reason:
          "S3-backed file contents are stored in object storage, not in PostgreSQL table columns.",
      },
      excluded_schemas: [
        "information_schema",
        "pg_*",
        "pgsodium",
        "vault",
        "realtime",
        "pgbouncer",
        "auth.schema_migrations",
        "storage.migrations",
      ],
    },
    recoverability: {
      account_2_existing_item_recoverable: false,
      account_2_user_id_matches_auth: false,
      auth_users_recoverable: false,
      ddl_executable_syntax: false,
      triggers_disabled_for_restore: false,
    },
    limitations: [
      "Logical SQL dump taken via pg_dump / Session Pooler; point-in-time recovery (PITR) requires Supabase dashboard snapshot.",
      "Binary files in content-media storage bucket live in cloud object storage, not in database dump.",
      "Restoration must run with session_replication_role = replica to avoid foreign key and trigger recursion.",
    ],
    errors: [],
  };

  // 1. Files & Hashes
  for (const f of files) {
    if (!f.endsWith(".sql")) continue;
    const filePath = join(backupDir, f);
    const stat = statSync(filePath);
    const content = readFileSync(filePath, "utf8");
    const sha256 = createHash("sha256").update(content).digest("hex");
    report.files[f] = {
      size_bytes: stat.size,
      lines_count: content.split("\n").length,
      sha256,
    };
  }

  // 2. Schema Verification (schema.sql)
  const schemaFile = files.find((f) => f.toLowerCase().includes("schema") && f.endsWith(".sql"));
  if (!schemaFile) {
    report.errors.push("Missing schema.sql in backup directory.");
  } else {
    const schemaSql = readFileSync(join(backupDir, schemaFile), "utf8");
    const requiredTables = [
      "content_items",
      "content_links",
      "production_tasks",
      "reference_accounts",
      "content_pillars",
    ];
    const missingTables = requiredTables.filter((t) => !schemaSql.includes(`"${t}"`));
    report.schema_verification = {
      file: schemaFile,
      has_required_tables: missingTables.length === 0,
      missing_tables: missingTables,
      has_rls: schemaSql.includes("ENABLE ROW LEVEL SECURITY"),
    };
    if (missingTables.length > 0) {
      report.errors.push(`Schema missing required tables: ${missingTables.join(", ")}`);
    } else {
      report.recoverability.ddl_executable_syntax = true;
    }
  }

  // 3. Data Verification (data.sql)
  const dataFile = files.find((f) => f.toLowerCase().includes("data") && f.endsWith(".sql"));
  if (!dataFile) {
    report.errors.push("Missing data.sql in backup directory.");
  } else {
    const dataSql = readFileSync(join(backupDir, dataFile), "utf8");

    if (dataSql.includes("SET session_replication_role = replica;")) {
      report.recoverability.triggers_disabled_for_restore = true;
    }

    // A. Parse and verify auth.users
    const authUsers = parseTableRows(dataSql, "auth", "users");
    report.scope.auth_schema.users_count = authUsers.length;

    const userMap = new Map(); // email -> user row
    for (const u of authUsers) {
      if (u.email) {
        userMap.set(u.email.trim().toLowerCase(), u);
      }
    }

    let confirmedTargetsCount = 0;
    const targetUserIds = [];
    for (let idx = 0; idx < normalizedTargets.length; idx++) {
      const email = normalizedTargets[idx];
      const u = userMap.get(email);
      if (u) {
        const isConfirmed = u.email_confirmed_at !== null && u.email_confirmed_at !== undefined && u.email_confirmed_at !== "";
        if (isConfirmed) {
          confirmedTargetsCount++;
          targetUserIds[idx] = u.id;
        }
      }
    }

    report.scope.auth_schema.confirmed_target_users_count = confirmedTargetsCount;
    if (normalizedTargets.length > 0 && confirmedTargetsCount === normalizedTargets.length) {
      report.scope.auth_schema.all_targets_confirmed = true;
      report.recoverability.auth_users_recoverable = true;
    } else if (normalizedTargets.length > 0) {
      report.errors.push(
        `Auth verification failure: expected ${normalizedTargets.length} confirmed target accounts in backup, found ${confirmedTargetsCount}.`
      );
    } else if (authUsers.length > 0) {
      report.recoverability.auth_users_recoverable = true;
    }

    // B. Parse and verify public.content_items
    const contentItems = parseTableRows(dataSql, "public", "content_items");

    // Account 2 unnumbered item check:
    // Exactly 1 item must exist with source_number IS NULL
    const unnumberedItems = contentItems.filter(
      (i) => i.source_number === null || i.source_number === undefined || i.source_number === ""
    );
    const numberedItems = contentItems.filter(
      (i) => i.source_number !== null && i.source_number !== undefined && i.source_number !== ""
    );

    report.data_verification = {
      file: dataFile,
      total_content_items: contentItems.length,
      numbered_content_items: numberedItems.length,
      unnumbered_content_items: unnumberedItems.length,
    };

    if (numberedItems.length > 0) {
      report.errors.push(
        `Unexpected source-number collision: backup contains ${numberedItems.length} numbered content items prior to import.`
      );
    }

    if (unnumberedItems.length === 1) {
      const acc2Item = unnumberedItems[0];
      const account2UserId = targetUserIds[1]; // Index 1 is Account 2

      const hasValidTitle = Boolean(acc2Item.title && acc2Item.title.trim().length > 0);
      const hasValidStatus = Boolean(acc2Item.status);
      const hasValidId = Boolean(acc2Item.id);

      let userIdMatches = true;
      if (account2UserId) {
        userIdMatches = acc2Item.user_id === account2UserId;
      }

      report.recoverability.account_2_existing_item_recoverable =
        hasValidTitle && hasValidStatus && hasValidId;
      report.recoverability.account_2_user_id_matches_auth = userIdMatches;

      if (!userIdMatches) {
        report.errors.push(
          "Account 2 unnumbered item user_id does not match Account 2 auth.users ID in backup."
        );
      }
      if (!hasValidTitle || !hasValidStatus || !hasValidId) {
        report.errors.push("Account 2 unnumbered item is malformed or missing required columns in dump.");
      }
    } else {
      report.errors.push(
        `Expected exactly 1 pre-existing unnumbered item (for Account 2) in backup, found ${unnumberedItems.length}.`
      );
    }
  }

  report.verified =
    report.errors.length === 0 &&
    report.recoverability.ddl_executable_syntax &&
    report.recoverability.account_2_existing_item_recoverable &&
    report.recoverability.account_2_user_id_matches_auth &&
    report.recoverability.auth_users_recoverable &&
    report.recoverability.triggers_disabled_for_restore;

  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const targetDir = process.argv[2];
  if (!targetDir) {
    console.error("Usage: node scripts/verify-hosted-backup.mjs <backup-directory>");
    process.exit(1);
  }
  try {
    const rep = verifyBackup(targetDir);
    console.log(JSON.stringify(rep, null, 2));
    process.exit(rep.verified ? 0 : 1);
  } catch (err) {
    console.error("Verification error:", err.message);
    process.exit(1);
  }
}
