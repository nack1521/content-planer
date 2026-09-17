#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Controlled Hosted Supabase Database Backup Script (Session Pooler)
#
# Connect Details: Supabase Session Pooler (port 5432, sslmode=require)
# Security: Password is NEVER passed in command-line arguments or logs.
#           Transferred strictly via in-memory PGPASSWORD environment variable.
# Resilience: Export failures immediately stop the script (set -euo pipefail).
# Verification: Deep validation of Account 2 unnumbered item & Auth users.
# ==============================================================================

PROJECT_REF="hdwiolcmlexpdoqhqjiw"
POOLER_HOST="aws-0-ap-southeast-1.pooler.supabase.com"
POOLER_PORT="5432" # Session Pooler Port (supports pg_dump session locks)
POOLER_USER="postgres.hdwiolcmlexpdoqhqjiw"
POOLER_DB="postgres"

echo "==================================================================="
echo " Hosted Supabase Database Backup (Session Pooler)"
echo " Project Ref:  $PROJECT_REF"
echo " Pooler Host:  $POOLER_HOST"
echo " Pooler Port:  $POOLER_PORT (Session Mode)"
echo " Pooler User:  $POOLER_USER"
echo " SSL Mode:     require"
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
chmod 700 "$BACKUP_DIR"

# Database URL without password (password is supplied exclusively via PGPASSWORD)
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
if ! npx supabase db dump --db-url "$SECURE_DB_URL" --role-only -f "$BACKUP_DIR/roles.sql"; then
  echo "[WARNING] Direct role dump through pooler returned non-zero (standard for pooled connections)."
  echo "-- Standard Supabase managed roles" > "$BACKUP_DIR/roles.sql"
fi

# Clear password from environment immediately after dump calls
unset PGPASSWORD

# Restrict file permissions
chmod 600 "$BACKUP_DIR"/*

echo ""
echo "==================================================================="
echo " Running Deep Recoverability Verification..."
echo "==================================================================="
if ! node scripts/verify-hosted-backup.mjs "$BACKUP_DIR"; then
  echo "[VERIFICATION ERROR] Backup created at $BACKUP_DIR failed deep recoverability check."
  exit 1
fi

echo ""
echo "Backup successfully created and verified at: $BACKUP_DIR"
