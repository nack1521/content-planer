# Content Planner Handoff — Milestone 7 (Controlled Hosted Supabase Import Preparation & Vercel Release)

## Milestone Status

**Status: In Progress — Controlled Hosted Supabase Import Prepared & Validated; Awaiting Codex Review Before Hosted Execution**

- **Milestone 6**: Accepted by Codex at commit `db0da61`.
- **Milestone 7**: In Progress — Vercel release, hosted Supabase verification, and secure multi-owner authorization.
- **Hosted Supabase Status**: Migration 3 (`20260914000002_add_workflow_tables.sql`) successfully applied by the owner. Schema verification confirmed all workflow tables (`content_links`, `production_tasks`, `reference_accounts`) and all 6 workflow columns on `content_items` are present. Row Level Security (RLS) is active on every table, blocking anonymous queries (HTTP 401).
- **Public Signups**: Strictly disabled on hosted Supabase Auth (`disable_signup: true`, HTTP 422 for unauthorized users) and guarded at the application boundary via `isAllowedEmail`.
- **Vercel Preview Deployment**: Deployed and verified at `https://content-planner-otp300zpj-nack4.vercel.app` (commit `abd923e`, deployment `dpl_AsXQWcrisPuNUsTAVt8QrorjRVJi`).
- **Protection Bypass Remediation**: Compromised token revoked and rotated via Vercel Project Protection API without exposing or printing the new secret.


### 4. New Preview Deployment & Route Verification (Commit abd923e)
- **Preview Deployment URL**: `https://content-planner-otp300zpj-nack4.vercel.app`
- **Deployment ID**: `dpl_AsXQWcrisPuNUsTAVt8QrorjRVJi` (Target: Preview)
- **Vercel Environment Variables**: `ALLOWED_EMAILS` confirmed present as a secret across `Production, Preview, Development`. Legacy `ALLOWED_EMAIL` remains available as fallback.
- **Route Loading & Security Verification**:
  - `/th/login`: `HTTP 200 OK`
  - `/en/login`: `HTTP 200 OK`
  - `/th/planner`, `/en/planner`: `HTTP 307` redirect to localized `/login`
  - `/th/tasks`, `/th/calendar`, `/th/ideas`, `/th/settings`: `HTTP 307` redirect to localized `/login`
  - `/th/auth/callback`: `HTTP 307` redirect to localized `/login` when unauthenticated
  - `POST /th/auth/signout`, `POST /en/auth/signout`: `HTTP 303` redirect to localized `/login`
- **Zero-Leakage Bundle Audit**: Rendered HTML and static JavaScript chunks were audited for secrets, email addresses, service-role keys, and private tokens with 0 occurrences found.

### 5. Remaining Manual Smoke-Test Steps
1. **Supabase Redirect URLs**: Ensure `https://content-planner-otp300zpj-nack4.vercel.app/**` (or wildcard `https://*-nack4.vercel.app/**`) is listed in Supabase Dashboard -> **Authentication** -> **URL Configuration** -> **Redirect URLs**.
2. **Authorized Supabase Accounts**: Ensure all authorized owner accounts are provisioned in **Supabase Dashboard** -> **Authentication** -> **Users** with confirmed emails.
3. **Owner Magic-Link Sign-In**: Open `https://content-planner-otp300zpj-nack4.vercel.app/th/login` and sign in with any authorized email.
4. **Private Planner Smoke Test**:
   - Verify Planner, Content Editor, Links, Tasks, Calendar, Ideas, Settings, and Sign-out.
   - Verify each authorized user has their own completely separate, private planner records governed by the `auth.uid() = user_id` RLS policies without cross-user leakage.
5. **Production Promotion**: Once Preview verification is confirmed, promote to Production (`vercel deploy --prod`).

---


## Milestone 7 Updates — Secure Multiple-Owner Email Authentication

### 1. Architectural Design & Shared Parser Helper
- **Replaced Single-Owner Limitation**: The previous single-email `ALLOWED_EMAIL` constraint was upgraded to a server-only comma-separated `ALLOWED_EMAILS` configuration supporting multiple authorized owners.
- **Shared Parser & Authorization Helper (`src/utils/auth/allowedEmail.ts`)**:
  - `normalizeEmail`: Trims leading/trailing whitespace and converts to lowercase.
  - `parseAllowedEmails`: Splits comma-separated strings, trims whitespace, normalizes to lowercase, and filters out empty entries.
  - `getAllowedEmails`: Resolves the active allow-list from server environment variables. When `ALLOWED_EMAILS` exists in `process.env` (even if empty), it takes absolute precedence. Legacy `ALLOWED_EMAIL` is supported temporarily only when `ALLOWED_EMAILS` is undefined/absent. Fails closed (returns `[]`) if neither or only empty entries are configured.
  - `hasAllowedEmailsConfigured`: Returns whether valid authorized emails are configured, allowing server boundaries to fail closed without exposing private email lists.
  - `isAllowedEmail`: Performs exact matching only. Strictly rejects substrings, domain-only matches, prefixes, suffixes, or unauthorized addresses.
  - **Server-Only Security**: The allow-list is never exposed to browser client bundles, `NEXT_PUBLIC_*` variables, page payloads, API responses, or logs.

### 2. Authorization Boundary Enforcement
- **Magic-Link Server Action (`src/app/actions/auth.ts`)**: Validates normalized emails against `isAllowedEmail`. Unauthorized addresses return a neutral success message without notifying Supabase or disclosing account status.
- **Authentication Callback Route (`src/app/[locale]/auth/callback/route.ts`)**: Exchanges auth code for session cookies and verifies `isAllowedEmail(data.user.email)`. Non-matching users are immediately signed out and redirected to `/{locale}/login?error=unauthorized`.
- **Session Proxy Middleware (`src/utils/supabase/proxy.ts`)**: Fails closed if `hasAllowedEmailsConfigured()` is false. For authenticated sessions, validates `isAllowedEmail(userEmail)`, clearing session cookies on mismatch.
- **CLI Importer (`scripts/import-data.mjs`)**: Extracts the primary configured email from `ALLOWED_EMAILS` with fallback to `ALLOWED_EMAIL`.

### 3. Verification & Test Suite Expansion
- Expanded `tests/auth.test.mjs` with comprehensive automated test cases:
  1. Multiple authorized emails in comma-separated list.
  2. Mixed uppercase and lowercase casing across inputs and environment variables.
  3. Leading and trailing whitespace handling.
  4. Empty entry filtering (trailing commas, double commas, whitespace-only entries).
  5. Unauthorized email rejection.
  6. Partial-match rejection (substrings, domain-only, subdomains, prefix/suffix).
  7. Missing and empty configuration fail-closed behavior.
  8. `ALLOWED_EMAILS` precedence over legacy `ALLOWED_EMAIL`.
  9. Temporary legacy fallback when `ALLOWED_EMAILS` is undefined.
- Total test count: 183/183 clean-environment tests passing.

---


---

## Milestone 7 Updates — Controlled Hosted Supabase Data Import Preparation

### 1. Dedicated Preparation Workflow (`scripts/prepare-hosted-import.mjs`)
- **Strict Separation**: `scripts/import-data.mjs` remains strictly untouched and preserved as the local-only importer.
- **Default Mode**: Strictly DRY-RUN. Zero database records are written by default.
- **Hosted Write Authorization Guard**: Checked against `.private-import/import-manifest.json` (`hosted_write_authorized: false`). Attempts to commit against hosted Supabase are immediately blocked unless explicitly authorized in the manifest.
- **Two-Stage Operator Confirmation**: Commit mode requires `--confirm-backup` (database snapshot verified) and `--confirm-execution` (final operator approval).
- **Target Account Enforcement**: Validates and strictly accepts only the 3 approved owner accounts specified in the private manifest.
  Rejects extra accounts, missing accounts, duplicate entries, or malformed emails. Synthetic addresses (e.g. `owner1@example.test`) are used for automated test isolation.
- **Supabase Auth User Existence Guard**: Confirms all 3 target users exist in `auth.users` before allowing commit mode.
- **Non-Destructive Session Establishment**: Generates genuine authenticated user sessions using native magic-link OTP verification (`adminClient.auth.admin.generateLink({ type: "magiclink", email })` + `userClient.auth.verifyOtp(...)`). This guarantees operations execute under `auth.uid() = user_id` without overwriting or destroying existing user passwords.
- **Locked Date Policy**: Loads `.private-import/approved-date-decisions.json` and strictly enforces the locked decision set:
  - 38 records with corrected day/month reversals scheduled.
  - 22 reviewed records left unscheduled as ideas (`publish_at: null`).
  - Rejects extra, missing, duplicate, or modified date decisions.
- **Expected Record Counts**:
  - Per Account: 158 content items, 419 content links, 30 reference accounts, 16 production tasks (12 linked + 4 standalone).
  - Total across 3 Accounts: 474 content items, 1,257 content links, 90 reference accounts, 48 production tasks.
- **Genuine Database-Side Transaction Atomicity**: Replaced compensating-delete rollback with one genuine single PostgreSQL transaction (`public.import_controlled_batch`) covering all 3 target owners and all 5 tables (`content_items`, `content_links`, `production_tasks`, `reference_accounts`, `content_pillars`). PostgREST executes the RPC within a database engine `BEGIN ... COMMIT / ROLLBACK` transaction block. If any error, constraint failure, or verification check fails, PostgreSQL automatically rolls back all mutations across all tables and owners.
- **Authoritative In-Transaction Verification**: Pre-commit verification is performed directly inside the database transaction before committing. It asserts row counts for all tables, owner isolation, and exact 38/22 date decision matching. Any discrepancy raises an exception, aborting the entire transaction.
- **Authoritative Post-Commit Verification**: A secondary post-commit verification pass queries the database under authenticated owner sessions (RLS) to confirm committed state.
- **Deep-Equality Atomicity Test**: The test suite seeds pre-existing conflicting records across all 5 tables for every target owner, takes a complete row-level snapshot, triggers a failure during owner 2 after updates, and asserts exact deep equality (`assert.deepEqual`) between database state before and after the failure. It also tests successful commit and idempotent rerun.
- **Rerun Idempotency**: Subsequent runs match existing items by `source_number`, tasks by `import_key`, and reference accounts by `platform:url`, resulting in 0 created and identical totals.
- **Zero Secret / Private URL Leakage**: CLI outputs aggregate counts only. No private URLs (TikTok, Instagram, Drive, Notion), credentials, or bearer tokens are ever written to stdout/stderr.
- **Hosted Database Untouched**: Zero database writes were executed against hosted Supabase during this cycle.

### 2. Dedicated Automated Test Suite (`tests/hosted-import-prep.test.mjs`)
Created comprehensive automated test suite covering:
1. **Target Enforcement**: Exact 3 approved accounts accepted; rejects extra, missing, duplicate, or malformed emails.
2. **CLI Target Arguments**: Rejects unauthorized or extra target email arguments.
3. **Date Policy Enforcement**: Rejects missing, extra, invalid calendar dates (e.g. `2026-02-30`), or deviations from the 38/22 policy.
4. **Safety Guards**: Commit mode strictly requires `--confirm-backup` and `--confirm-execution`.
5. **Hosted Write Guard**: Non-local commit halted when manifest has `hosted_write_authorized: false`.
6. **Auth User Verification**: Halts if any target user does not exist in `auth.users`.
7. **Dry-Run Safety**: Default CLI mode performs zero database writes.
8. **Structured JSON Output**: CLI with `--json` outputs structured verification report with `database_writes_performed: 0`.
9. **Privacy & Secret Leakage Prevention**: Asserts zero private URLs, tokens, passwords, or service keys in output.
10. **Transactional Rollback**: Asserts invalid link payload rolls back content item mutation atomically.
11. **Multi-Account Isolation, Expected Counts & Idempotency**: Full local execution on isolated Supabase stack imports exactly 158/419/30/16 per account, 474/1257/90/48 total, strictly isolated under RLS; second run verifies 0 created and 100% updated with unchanged totals; asserts exact date decisions in database (38 corrected timestamps, 22 nulls).

---

## Issues Discovered & Corrections Made

### 1. Dead Sample Code Elimination
- **Discovered**: `src/data/sampleContent.ts` was an unreferenced mock file created during Milestone 1 before Supabase persistence was implemented. It was not imported anywhere in production code or tests.
- **Correction**: Completely removed `src/data/sampleContent.ts` via `git rm`. Added automated test asserting this file does not exist.

### 2. Translation Dictionaries Audit & Unresolved Placeholders Cleanup
- **Discovered**:
  - `src/messages/en.json` and `th.json` contained unresolved placeholders from early mockups (`calendar.inDevelopment`, `calendar.backToPlanner`, `ideas.inDevelopment`, `ideas.backToPlanner`).
  - Orphaned translation keys existed from earlier milestone refactors: `recordModal.createTitle` (replaced by `newTitle`), `recordModal.errors.*`, `tasks.errors.*`, `referenceAccounts.errors.*` (centralized into `errors.*`), mock pillar names (`pillars.educational`, etc.), and unused table/card action keys (`table.viewAction`, `card.targetDate`, etc.).
- **Correction**:
  - Purged all unresolved placeholders and orphaned translation keys.
  - Preserved `calendar.morePosts` and `calendar.morePlatforms` for Milestone 5 test compatibility.
  - Added `common.saving` (`"Saving..."` / `"กำลังบันทึก..."`).
  - Verified 100% key parity (354 keys in both EN and TH) and verified all `{placeholder}` tokens match 1:1.

### 3. Accessible, Localized Form Submit States
- **Discovered**: Submit buttons in `RecordModal.tsx`, `TasksView.tsx`, and `ReferenceAccountsView.tsx` rendered raw unlocalized `...` while `isPending` was true.
- **Correction**: Replaced `...` with `{t(common.saving)}` across all three modals, providing accessible screen-reader and visual feedback during asynchronous mutations.

### 4. Tablet Layout Visibility Bug in `PlannerCards`
- **Discovered**: `PlannerCards.tsx` contained `space-y-3 md:hidden` on its container, while `PlannerView.tsx` wrapped cards in `<div className="block lg:hidden">` and the table in `<div className="hidden lg:block">`. On tablet screen widths between 768px (`md`) and 1023px (`lg`), both the table and cards were hidden from view.
- **Correction**: Removed `md:hidden` from `PlannerCards.tsx` container (`<div className="space-y-3">`), allowing `PlannerView`'s `block lg:hidden` to properly control card display on tablets and mobile devices.

### 5. Mobile Navigation Typography & Tab Sizing
- **Discovered**: In `MobileNav.tsx`, tab labels had `truncate max-w-[55px] text-[11px]`. On narrow mobile screens (e.g. 390px), Thai labels such as `แผนคอนเทนต์` (11 characters) could be truncated.
- **Correction**: Updated label container to `truncate max-w-[68px] text-[10px] sm:text-[11px]`, allowing all five tabs ("แผนคอนเทนต์", "งานที่ต้องทำ", "ปฏิทิน", "คลังไอเดีย", "ตั้งค่า") to fit comfortably without clipping on 390px viewports.

### 6. Thai Typography & Word Breaking
- **Discovered**: Thai text lacks inter-word spaces, and long compound phrases or URLs without explicit word break rules could cause container overflow or horizontal clipping.
- **Correction**: Added `overflow-wrap: break-word; word-break: break-word;` to `html` in `src/app/globals.css`.

### 7. Localized Settings Page Metadata
- **Discovered**: `/settings` was missing localized page metadata (`<title>` and `<meta name="description">`) because `settings/page.tsx` is a client component (`'use client'`).
- **Correction**: Created `src/app/[locale]/settings/layout.tsx` exporting `generateMetadata` with localized title (`ตั้งค่า — Content Planner` / `Settings — Content Planner`) and description. All application routes now provide localized metadata.

### 8. Automated Milestone 6 Release Quality Test Suite
- **Correction**: Created `tests/release-quality-milestone6.test.mjs` containing 8 comprehensive tests covering Thai typography/wrapping, dead code elimination, 100% dictionary/token parity, accessible saving states, responsive layout contracts, localized metadata across all routes, Asia/Bangkok date/time formatting with Thai suffixes (`" น."`), and error translation coverage. Connected to `tests/run-tests.mjs`.

---

## Files Changed

- `scripts/prepare-hosted-import.mjs`: [NEW] Controlled hosted Supabase import preparation workflow with dry-run default, two-stage confirmations, strict locality derivation, exact manifest target enforcement, locked date policy, multi-account RLS isolation, failure rollback, authoritative post-write verification, and rerun idempotency.
- `tests/hosted-import-prep.test.mjs`: [NEW] Portable automated test suite using synthetic targets and committed fixtures, verifying dry-run safety, remote bypass regressions, target validation, date decisions, safety guards, import-level atomicity rollback, authoritative post-write verification, expected counts, and secret leakage prevention.
- `tests/fixtures/portable-planner.xlsx`: [NEW] Fully synthetic portable Excel fixture containing 158 generated items, 419 example.test links, and 30 generated reference accounts. It contains no copied owner content.
- `tests/fixtures/portable-notion.csv`: [NEW] Fully synthetic portable CSV fixture containing 16 generated production tasks. It contains no copied owner task content.
- `tests/fixtures/portable-decisions.json`: [NEW] Portable date decisions fixture matching the 60 warning source numbers.
- `tests/fixtures/portable-manifest.json`: [NEW] Portable manifest fixture referencing synthetic test owners and portable fixtures.
- `package.json`: [MODIFIED] Added `audit:private-import` script for opt-in private source dry-run verification.
- `tests/run-tests.mjs`: Added suite 5b for controlled hosted import preparation.
- `.gitignore`: Added `/.private-import/` to ignore private import decision files and manifests.
- `TASKS.md`: Updated Milestone 7 checklist with import preparation details and status.
- `HANDOFF.md`: Documented import preparation architecture, safety controls, test suite, and verification results.

- `src/data/sampleContent.ts`: [DELETED] Removed dead sample mock data.
- `src/messages/en.json`: Purged dead keys and placeholders; added `common.saving`; 355 keys verified.
- `src/messages/th.json`: Purged dead keys and placeholders; added `common.saving`; 355 keys verified with 100% parity.
- `src/components/planner/RecordModal.tsx`: Used `t(common.saving)` during `isPending`.
- `src/components/tasks/TasksView.tsx`: Used `t(common.saving)` during `isPending`.
- `src/components/ideas/ReferenceAccountsView.tsx`: Used `t(common.saving)` during `isPending`.
- `src/components/planner/PlannerCards.tsx`: Removed `md:hidden` to fix tablet 768px-1023px visibility gap.
- `src/components/shell/MobileNav.tsx`: Adjusted label container width to `max-w-[68px]` and responsive font size.
- `src/app/globals.css`: Added `overflow-wrap: break-word; word-break: break-word;` to `html`.
- `src/app/[locale]/settings/layout.tsx`: [NEW] Localized metadata layout for settings page.
- `src/utils/date.ts`: Used `import type { Locale }` for cleaner ESM loader compilation.
- `tests/release-quality-milestone6.test.mjs`: [NEW] 9 automated release quality and bilingual completion tests.
- `tests/run-tests.mjs`: Added suite 6d for Milestone 6 testing.
- `TASKS.md`: Marked Milestone 5 accepted by Codex and Milestone 6 complete.
- `HANDOFF.md`: Updated with complete Milestone 6 verification evidence.

---

## Exact Verification Results

### 1. Whitespace / Diff Check
Command: `git diff --check`
Result: Clean exit (0 whitespace errors).

### 2. ESLint
Command: `npm run lint`
Result: Clean exit (0 errors, 0 warnings).

### 3. Isolated Local Supabase pgTAP Database Tests
Command: `npm run test:db`
Result:
```
/Users/nack/contentPlaner/supabase/tests/database/rls.test.sql .. ok
All tests successful.
Files=1, Tests=85,  0 wallclock secs ( 0.06 usr  0.02 sys +  0.03 cusr  0.02 csys =  0.13 CPU)
Result: PASS
[SUCCESS] All Content Planner pgTAP database tests passed on isolated local Supabase stack.
```

### 4. Next.js Production Build
Command: `npm run build`
Result:
```
▲ Next.js 16.3.5 (Turbopack)
- Environments: .env.local
✓ Compiled successfully in 707ms
  Running TypeScript ...
  Finished TypeScript in 859ms ...
  Collecting page data using 7 workers ...
  Generating static pages using 7 workers (17/17) in 230ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ○ /_not-found
├ ƒ /[locale]/auth/callback
├ ƒ /[locale]/auth/signout
├ ƒ /[locale]/calendar
├ ƒ /[locale]/ideas
├   /[locale]/login
│ ├ ● /th/login
│ └ ● /en/login
├ ƒ /[locale]/planner
├   /[locale]/settings
│ ├ ● /th/settings
│ └ ● /en/settings
├ ƒ /[locale]/tasks
└ ○ /icon.svg
```

### 5. Complete Test Suite (`npm test`)
Command: `npm test`
Result:
```
=== 1. Verifying and Preparing Isolated Local Supabase Environment ===
85/85 pgTAP database tests passed.
=== 2. Running Production Domain & Validation Suites ===
✔ 15/15 tests passed
=== 3. Running Accessibility & Keyboard Navigation Suite ===
✔ 7/7 tests passed
=== 4. Running Localization & String Scanner Suite ===
✔ 5/5 tests passed
=== 5. Running Production Importer CLI & Idempotency Suite ===
✔ 10/10 tests passed
=== 5b. Running Controlled Hosted Import Preparation Suite ===
✔ 14/14 tests passed
=== 6. Running Authenticated Server Actions & Atomic Rollback Suite ===
✔ 8/8 tests passed
=== 6b. Running Content Editor & Link Workspace Suite (Milestone 4) ===
✔ 17/17 tests passed
=== 6c. Running Calendar and Idea Bank Suite (Milestone 5) ===
✔ 13/13 tests passed
=== 6d. Running Bilingual Completion & Release Quality Suite (Milestone 6) ===
✔ 9/9 tests passed
=== 7. Building Content Planner Application from Current Source ===
✓ Compiled successfully
=== 8. Running Live Server & HTTP Integration Suites ===
✔ 14/14 tests passed
=== [SUCCESS] ALL CLEAN-ENVIRONMENT CHECKS AND TEST SUITES PASSED ===
Total: 197 tests passing cleanly across pgTAP database suite (85 tests) and application test suites (112 tests: domain validation 15, accessibility 7, localization scanner 5, local importer 10, hosted import preparation 14, server actions 8, Milestone 4 editor 17, Milestone 5 calendar & ideas 13, Milestone 6 release quality 9, and live HTTP integration 14).
```

---

## Manual Review Instructions

### Desktop Review:
1. Start development server: `npm run dev` and navigate to `http://localhost:3000/th/planner`.
2. **Planner View Desktop**:
   - Verify Thai titles, column headers, status badges, and summary counters.
   - Switch language to English using the sidebar switch: observe instant UI update without reloading or losing state.
   - Resize window between 768px and 1024px (tablet width): observe card presentation displays without blanking.
3. **Record Modal**:
   - Open any item or create a new post.
   - Click Save: observe submit button transitions to "กำลังบันทึก..." (TH) or "Saving..." (EN) while mutation is pending.
   - Add a link: observe safe domain chip and external link controls.
   - Click Close with dirty form: observe discard confirmation dialog traps focus.
4. **Settings Page**:
   - Navigate to `/th/settings`: observe browser tab displays "ตั้งค่า — Content Planner".
   - Navigate to `/en/settings`: observe browser tab displays "Settings — Content Planner".
   - Toggle default platforms: observe instant feedback and persistence.
5. **Calendar & Ideas Views**:
   - Navigate to `/th/calendar`: observe Thai month names (e.g. "กันยายน 2569") and platform badges.
   - Navigate to `/th/ideas`: test quick capture with empty input (alert error) and roving tabIndex between tabs.

### Mobile Review (Viewport width: 390px):
1. Navigate to `/th/planner` at 390px:
   - Verify Mobile Header with logo, title, and compact locale switch.
   - Verify bottom navigation bar: observe all 5 Thai labels ("แผนคอนเทนต์", "งานที่ต้องทำ", "ปฏิทิน", "คลังไอเดีย", "ตั้งค่า") fit comfortably with no truncation.
   - Verify cards presentation: tags, titles, hooks, and timestamps wrap cleanly without horizontal scrolling.
2. Navigate to `/th/tasks` at 390px:
   - Observe touch-friendly task list, filter chips, and checkbox controls.
3. Navigate to `/th/calendar` at 390px:
   - Observe agenda list grouped by date.

---

## Assumptions and Remaining Limitations

- **Sprint 1 Link-Only MVP**: Asset storage relies completely on external links (`content_links`). Direct media uploads, signed viewing URLs, and storage quotas are deferred to Sprint 2.
- **Hosted Supabase Untouched**: Zero hosted database writes or imports were performed in this cycle. The hosted Supabase database remains in its clean, post-Migration 3 state.
- **Hosted Import Execution Preconditions**:
  1. The 3 approved owner accounts specified in the private manifest must exist and be confirmed in hosted Supabase Auth (`auth.users`).
  2. A verified hosted database backup snapshot must be taken and confirmed (`--confirm-backup`).
  3. Final operator authorization must be confirmed (`--confirm-execution`).
  4. Explicit authorization in `.private-import/import-manifest.json` (`hosted_write_authorized: true`) is required before non-local execution.
  5. Operator and Codex review is required before executing the hosted write.
