# Content Planner Handoff — Milestone 7 (Multi-Owner Authentication & Vercel Release)

## Milestone Status

**Status: In Progress — Multi-Owner Authentication & Preview Verification Complete**

- **Milestone 6**: Accepted by Codex at commit `db0da61`.
- **Milestone 7**: In Progress — Vercel release, hosted Supabase verification, and secure multi-owner authorization.
- **Hosted Supabase Status**: Migration 3 (`20260914000002_add_workflow_tables.sql`) successfully applied by the owner. Schema verification confirmed all workflow tables (`content_links`, `production_tasks`, `reference_accounts`) and all 6 workflow columns on `content_items` are present. Row Level Security (RLS) is active on every table, blocking anonymous queries (HTTP 401).
- **Public Signups**: Strictly disabled on hosted Supabase Auth (`disable_signup: true`, HTTP 422 for unauthorized users) and guarded at the application boundary via `isAllowedEmail`.
- **Vercel Preview Deployment**: Deployed and verified at `https://content-planner-motlxvxc2-nack4.vercel.app`.
- **Protection Bypass Remediation**: Compromised token revoked and rotated via Vercel Project Protection API without exposing or printing the new secret.

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
Total: 183 tests passing cleanly across database, domain, accessibility, localization, importer, server actions, Milestone 4 editor, Milestone 5 calendar & ideas, Milestone 6 release quality, and live HTTP integration.
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
- **Hosted Supabase**: Hosted Supabase remains untouched. Zero hosted migrations or hosted imports were performed.
- **Milestone 7 Scope**: Vercel deployment, environment variable configuration on Vercel, and production domain routing are deferred to Milestone 7.
