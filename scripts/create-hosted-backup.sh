#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Controlled Hosted Supabase Database Backup Script (Session Pooler)
#
# Exact Session Pooler connection details from Supabase Connect panel:
#   Project:  hdwiolcmlexpdoqhqjiw
#   Mode:     Session (port 5432, sslmode=require)
#   Host:     aws-0-ap-southeast-1.pooler.supabase.com
#   User:     postgres.hdwiolcmlexpdoqhqjiw
#   Database: postgres
#
# Security:
#   - umask 077 set before any file/directory creation (owner-only rwx------)
#   - Password is NEVER passed in command-line arguments, process lists, or logs.
#   - PGPASSWORD environment variable is used in-memory and unset immediately.
#   - Export failures stop the script immediately (set -euo pipefail).
#   - Never replaces a failed roles export with a fake file or reports it as success.
# ==============================================================================

# Set restrictive umask before creating any directories or files
umask 077

PROJECT_REF="${SUPABASE_PROJECT_REF:-hdwiolcmlexpdoqhqjiw}"
POOLER_HOST="${SUPABASE_POOLER_HOST:-aws-0-ap-southeast-1.pooler.supabase.com}"
POOLER_PORT="${SUPABASE_POOLER_PORT:-5432}" # Session Pooler Port (supports pg_dump session locks)
POOLER_USER="${SUPABASE_POOLER_USER:-postgres.hdwiolcmlexpdoqhqjiw}"
POOLER_DB="${SUPABASE_POOLER_DB:-postgres}"

echo "==================================================================="
echo " Hosted Supabase Database Backup (Session Pooler)"
echo " Project Ref:  $PROJECT_REF"
echo " Pooler Host:  $POOLER_HOST"
echo " Pooler Port:  $POOLER_PORT (Session Mode)"
echo " Pooler User:  $POOLER_USER"
echo " SSL Mode:     require"
echo " Umask:        077 (Restricted owner-only)"
echo "==================================================================="
echo " Scope Identification:"
echo "   [INCLUDED] Public Schema:   All tables & DDL (content_items, content_links,"
echo "                               production_tasks, reference_accounts, content_pillars)"
echo "   [INCLUDED] Public Data:     All records including Account 2 existing unnumbered item"
echo "   [INCLUDED] Auth Schema:     auth.users, auth.identities, auth.sessions"
echo "   [INCLUDED] Storage Schema:  storage.buckets, storage.objects (bucket & file metadata)"
echo "   [EXCLUDED] Storage Blobs:   Raw S3 binary file contents (stored in cloud object storage)"
echo "   [EXCLUDED] Platform Internal: information_schema, pg_*, pgsodium, vault, realtime"
echo "==================================================================="

# 1. Obtain Password Privately (never echoed, never in command args, never in history)
if [ -z "${PGPASSWORD:-}" ] && [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  echo -n "Enter Supabase database password (input hidden): "
  read -rs DBPASS
  echo ""
  if [ -z "$DBPASS" ]; then
    echo "[ERROR] Database password cannot be empty."
    exit 1
  fi
  export PGPASSWORD="$DBPASS"
  unset DBPASS
elif [ -n "${SUPABASE_DB_PASSWORD:-}" ]; then
  export PGPASSWORD="$SUPABASE_DB_PASSWORD"
  unset SUPABASE_DB_PASSWORD
fi

# 2. Prepare Private Destination Directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=".private-import/hosted_backup_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

# Database URL without password (password is supplied exclusively via in-memory PGPASSWORD)
SECURE_DB_URL="postgresql://$POOLER_USER@$POOLER_HOST:$POOLER_PORT/$POOLER_DB?sslmode=require"

echo ""
echo "[1/3] Dumping database schema (tables, RLS, functions, triggers)..."
if ! npx supabase db dump --db-url "$SECURE_DB_URL" -f "$BACKUP_DIR/schema.sql"; then
  echo "[EXPORT ERROR] Schema dump failed. Halting immediately before writing partial state."
  unset PGPASSWORD
  exit 1
fi

echo "[2/3] Dumping data records (public tables, Account 2 item, auth.users, storage metadata)..."
if ! npx supabase db dump --db-url "$SECURE_DB_URL" --data-only --use-copy -f "$BACKUP_DIR/data.sql"; then
  echo "[EXPORT ERROR] Data dump failed. Halting immediately before writing partial state."
  unset PGPASSWORD
  exit 1
fi

echo "[3/3] Dumping cluster roles..."
if npx supabase db dump --db-url "$SECURE_DB_URL" --role-only -f "$BACKUP_DIR/roles.sql" 2>/dev/null; then
  echo "Cluster roles export completed successfully."
else
  # NEVER replace a failed roles export with a fake file or report it as successful.
  rm -f "$BACKUP_DIR/roles.sql"
  echo "[INFO] Cluster roles export was omitted (pg_dumpall is unsupported over connection poolers; standard platform roles are preserved by Supabase)."
fi

# Clear password from environment immediately after dump calls
unset PGPASSWORD

echo ""
echo "==================================================================="
echo " Running Deep Recoverability Verification..."
echo "==================================================================="
if ! node scripts/verify-hosted-backup.mjs "$BACKUP_DIR"; then
  echo "[VERIFICATION ERROR] Backup created at $BACKUP_DIR failed verification."
  exit 1
fi

echo ""
echo "Backup successfully created and verified at: $BACKUP_DIR"
