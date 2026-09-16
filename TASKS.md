# Content Planner Milestones

## Product Roadmap & Execution Rules

The project roadmap is structured into two phases:
- **Sprint 1 (Milestones 1–7)**: Complete private MVP for one owner. **Link-only scope**: collects and organizes external URLs (idea sources, assets, notes, and published posts). Direct media uploads, subscriptions, public sign-up, multi-user SaaS functionality, and automatic social publishing are deferred to Sprint 2.
- **Dormant Infrastructure**: The `public.content_media` table (defined in `supabase/migrations/20260914000000_create_mvp_schema.sql`) and private `content-media` storage bucket (defined in `supabase/migrations/20260914000001_create_storage_and_user_trigger.sql`) were established in Milestone 2 and remain dormant in Sprint 1; they are not exposed in the interface.
- **Sprint 2 Backlog**: Media upload pipeline, resumable large files, storage quotas, billing/subscriptions, public accounts, multi-user SaaS workspaces, and platform API integrations.

### Sprint 1 Roadmap Overview:
1. Foundation and responsive design — **Accepted**.
2. Supabase database, passwordless owner authentication, and security — **Accepted**.
3. Planner persistence, tasks, Excel/Notion replacement workflow, and external links — **Accepted**.
4. Content editor, link workspace, text post preview, copy controls, and unsaved-change protection — **Implementation complete; awaiting Codex review**.
5. Calendar and idea bank.
6. Bilingual completion, responsive QA, and release quality.
7. Vercel release and hosted Supabase setup.

### Execution Rule
An implementation agent must complete only the first unchecked milestone, update this file, write `HANDOFF.md`, and stop for review. Do not mark a milestone complete unless every acceptance criterion and required check passes. Individual checklist items may be checked as they are completed.

## Milestone 0 — Product and architecture planning

Status: Complete

- [x] Review the reference video.
- [x] Confirm personal-use scope.
- [x] Confirm planning-only scope.
- [x] Confirm Thai and English support.
- [x] Select Vercel and Supabase.
- [x] Define product scope, architecture, security rules, and agent workflow.

## Milestone 1 — Application foundation and planner slice

Status: Accepted after second Codex review

Goal: Produce the first recognizable, responsive version of the product using realistic sample data. Do not connect Supabase yet.

- [x] Initialize a Next.js App Router project in this repository without nesting it inside another project directory.
- [x] Initialize a Git repository with `main` as the default branch because this folder is not currently under Git.
- [x] Preserve all planning documents and `ref/Download.mp4`.
- [x] Configure TypeScript strict mode, Tailwind CSS, ESLint, npm, and a project-appropriate `.gitignore`.
- [x] Create the application shell with desktop side navigation and mobile navigation.
- [x] Make the Planner the default product surface.
- [x] Add a compact today/month summary, filters, and realistic sample content.
- [x] Create a responsive planner table for desktop and cards for mobile.
- [x] Add an intentionally styled theme matching `PROJECT.md`; do not ship framework-default styling.
- [x] Add complete initial English and Thai message dictionaries.
- [x] Add a working language switch for the implemented screen.
- [x] Include loading/empty-state components for the planner slice, even if sample data is shown by default.
- [x] Add project metadata and a simple project-specific favicon.
- [x] Add or update `README.md` with local setup and validation instructions.
- [x] Run lint and production build successfully.

Reviewer revision checklist:

- [x] Remove reviewer-only and internal milestone UI from the product surface, including the M1 banner, `M1 Active`, navigation milestone badges, milestone-number placeholder copy, and the `Preview Loading` control.
- [x] Keep unfinished routes neutral and bilingual, or hide them until their milestone; do not expose implementation planning language to the product user.
- [x] Rework the 390x844 first viewport so the search/planner controls and at least one content result appear without scrolling past six KPI cards and the full workflow strip.
- [x] Ensure the document language matches the active route and changes with the language switch; `/en/*` must not render or remain as `<html lang="th">`.
- [x] Localize visible text, `title`, and `aria-label` values that are currently hardcoded in English.
- [x] Reject or redirect unsupported locale routes instead of returning a 200 response with conflicting language and metadata.
- [x] Keep one canonical pair of translation dictionaries and make tests validate the same files imported by the application.
- [x] Make static-page tests report a real skip or failure when build output is absent; do not silently return and count the test as passed.
- [x] Do not swallow live-server assertion failures inside the connection-error catch block.
- [x] Increase frequently used filter/control labels and essential schedule/status text toward the documented readable sizes while preserving the compact layout.
- [x] Run `git diff --check`, lint, tests, and production build successfully after the revision.

Acceptance criteria:

- At 1440px wide, the first viewport clearly shows navigation, summary information, filters, and useful planner rows.
- At 390px wide, content is usable without horizontal page scrolling.
- Thai and English labels switch without a reload or loss of the current screen.
- The page contains no login, database, or fake social-publishing behavior yet.
- `npm run lint` and `npm run build` pass.

Review checkpoint: Accepted by Codex on 2026-09-14 after automated, live-route, desktop, and mobile verification.

## Milestone 2 — Supabase schema and private authentication

Status: Accepted after Codex security, hosted setup, and persistence review

- [x] Add `.env.example` using the variable names from `ARCHITECTURE.md`.
- [x] Add browser and server Supabase clients using supported SSR session handling.
- [x] Create versioned SQL migrations for all MVP tables, constraints, indexes, timestamps, and RLS policies.
- [x] Create private Storage bucket policies for owner-scoped media.
- [x] Implement passwordless email login, callback, logout, and protected application routes.
- [x] Enforce the personal-owner restriction without exposing secrets.
- [x] Replace sample user preferences with persisted locale and timezone preferences.
- [x] Document how the owner account is created and how public sign-up is disabled.
- [x] Verify unauthenticated access is redirected and cross-user data access is rejected.
- [x] Run lint and production build successfully.

Reviewer revision checklist:

- [x] Do not apply the current migrations to the hosted project. Correct and locally verify them first.
- [x] Replace the deprecated Next.js `middleware.ts` convention with `proxy.ts` and a named `proxy` export, following the installed Next.js 16 documentation.
- [x] Make authentication fail closed when Supabase environment configuration is absent; protected content must never become public because configuration is missing.
- [x] Follow the current Supabase SSR proxy contract: validate with `getClaims()`, propagate cookies and response headers produced by `setAll`, preserve them on every custom redirect, and prove an unauthorized session is actually cleared without a login redirect loop.
- [x] Validate locale arguments at runtime in server actions and restrict callback destinations to approved localized application routes.
- [x] Harden the SQL security model: set an empty `search_path` on security-definer functions, define explicit grants/roles, and enforce same-owner integrity for every foreign relationship on both insert and update, including content-item pillars and media parents.
- [x] Connect `user_preferences` to the application. Loading and changing locale/default preferences must read and write the authenticated owner's row rather than leaving the new helpers unused.
- [x] Add executable database policy tests (for example, Supabase local + pgTAP) that exercise anonymous and two-user CRUD, cross-owner foreign keys, and Storage policies. SQL text matching is not evidence that hosted or local RLS works.
- [x] Make `HANDOFF.md` match the actual migration names, columns, constraints, indexes, and verification performed; do not claim hosted migrations or cross-user checks that did not run.
- [x] After the corrected migrations pass local review, apply them to the hosted project, create and verify the owner account, disable new-user signup, and verify the remote tables/bucket and owner-only login. If privileged user action is required, mark the milestone blocked and state the exact action instead of marking it complete.
- [x] Commit the implementation and rerun `git diff --check`, lint, all tests (with no unexpected warnings/skips), and the production build without deprecation warnings.

Reviewer revision 2 checklist (Codex review findings):

- [x] Correct composite content-pillar foreign key: `ON DELETE SET NULL (content_pillar_id)` clears only `content_pillar_id` and preserves `user_id`. Add executable db test proving pillar deletion preserves content item and owner.
- [x] Repair `supabase/tests/database/rls.test.sql`: valid `:'user1'` syntax, enable pgTAP before `plan()`, plan count matches 26 assertions, add pillar deletion regression test, run against real local Postgres instance.
- [x] Harden `public.handle_new_user()` permissions: explicitly revoke execution from public, anon, and authenticated while keeping auth trigger working.
- [x] Origin URL helper: add validated URL helper `src/utils/url/getOrigin.ts` using `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_VERCEL_URL`, and localhost; remove Host / x-forwarded-host header construction; update `.env.example`.
- [x] Redirect preservation: create `src/utils/supabase/redirect.ts` preserving cookies and non-redirect response headers without overwriting redirect-specific headers; test the real production helper in `tests/auth.test.mjs`.
- [x] Connect `default_platforms` to bilingual Settings interface with validated allowed values in `src/app/actions/preferences.ts` and UI in `src/app/[locale]/settings/page.tsx`.
- [x] Deterministic tests: eliminate skips and `MODULE_TYPELESS_PACKAGE_JSON` warning in `npm test` via `"type": "module"` and `tests/run-tests.mjs`; report local database policy tests separately via `npm run test:db` (`tests/run-db-tests.mjs`).
- [x] Update `TASKS.md` and `HANDOFF.md` truthfully with real test output (26 passing pgTAP assertions and 11 passing Node tests).

Reviewer revision 3 checklist (Second Codex review findings):

- [x] Replace `tests/run-db-tests.mjs`: completely eliminate arbitrary container discovery, foreign credentials, and cross-project manipulation. Use only Content Planner's isolated local Supabase stack (`npx supabase start`, `npx supabase db reset --local`, `npx supabase test db --local`).
- [x] Remove mock database bootstrap script `supabase/tests/database/setup-local-db.sql`.
- [x] Report mock-schema compatibility truthfully as baseline PostgreSQL syntax verification, and report the real isolated Supabase pgTAP test results (26 passed).
- [x] Repair `tests/run-tests.mjs`: always build from current source, start isolated server on a dynamic/free test port, pass `TEST_BASE_URL` to tests, and terminate spawned server in a `finally` block.
- [x] Repair redirect header preservation: add explicit allowlist `ALLOWED_REDIRECT_HEADERS` in `src/utils/supabase/redirect.ts`, strictly omitting Next.js internal middleware headers (`x-middleware-next`, etc.). Add test proving internal middleware headers are absent from the redirect.
- [x] Strengthen `getAppOrigin()`: parse configured values with `new URL()`, allow only `http:` and `https:`, return URL origin without credentials/paths/queries/fragments, permit localhost fallback strictly in development, fail closed in production when unconfigured or invalid, and add unit tests covering production, preview, invalid URLs, paths, and localhost fallback.
- [x] Correct Settings persistence feedback: separate `isSavingPlatforms` and `isSigningOut` pending states, disable/serialize platform updates while saving, revert optimistic state and display bilingual error notice (`settings.saveError`) when persistence fails, and never show "Signing out" while saving platforms.
- [x] Preserve valid migration fixes: composite foreign key `ON DELETE SET NULL (content_pillar_id)`, handle_new_user execution revocation, and trusted magic-link origin.
- [x] Run safe verification checks: `git diff --check`, `npm run lint`, `npm test` (12 passed, 0 failed, 0 skipped), `npm run test:db` (26 passed, 0 failed), and `npm run build`.

Reviewer revision 4 checklist (Settings platform localization defect):

- [x] Correct platform translation lookup namespace: updated `src/app/[locale]/settings/page.tsx` from `platforms.${platform}` to `platform.${platform}`, matching canonical dictionary keys without adding duplicate keys.
- [x] Add focused regression test in `tests/auth.test.mjs` verifying platform translation lookup, dictionary key structure, and ensuring no raw `platforms.*` keys leak in pre-rendered Settings HTML.
- [x] Preserve saving, success notice, rollback, and error feedback in Settings.
- [x] Confirmed default platforms do not control Planner filters (preselects platforms for future content form only).
- [x] Do not modify Supabase migrations or hosted data.
- [x] Run verification: `git diff --check`, `npm run lint`, `npm test` (13 passed, 0 failed, 0 skipped), `npm run test:db` (26 passed, 0 failed), and `npm run build`.

Review checkpoint: Accepted by Codex on 2026-09-14 after local automated verification, hosted schema and private bucket inspection, anonymous access checks, owner-only login, disabled signup, and persisted preference verification.

## Milestone 2.5 — Swiss-inspired planner prototype

Status: Superseded by owner decision

The owner chose to keep the current production design for now and prioritize alignment with the real Excel and Notion workflow. No A/B/C prototype code is to be merged into `main`. Historical prototype work remains isolated on its prototype branch only.

## Milestone 3 — Planner persistence and record management

Status: Accepted by Codex on 2026-09-14

Final review evidence:
- 143/143 complete checks passed (`npm test`)
- 85/85 pgTAP database checks passed (`npm run test:db`)
- Production build passed (`npm run build`)
- ESLint passed with 0 errors and 0 warnings (`npm run lint`)
- `git diff --check` passed cleanly
- Milestone 3 migration (20260914000002_add_workflow_tables.sql) and data import were not applied to hosted Supabase (Milestone 2 baseline schema, auth, bucket, and preferences remain on hosted Supabase without modification)

Initial Milestone 3 implementation:
- [x] Add a reviewed migration for source references, objective, production detail, review status, source status, date-only precision, and the `photo` format (`supabase/migrations/20260914000002_add_workflow_tables.sql`).
- [x] Add owner-scoped `content_links`, `production_tasks`, and `reference_accounts` tables with same-owner foreign-key integrity, explicit grants, RLS, indexes, and executable database tests (`supabase/tests/database/rls.test.sql`).
- [x] Replace planner sample data with authenticated Supabase reads.
- [x] Implement create, edit, duplicate, archive, restore, and confirmed delete actions (`src/app/actions/content.ts`, `RecordModal.tsx`).
- [x] Implement workflow-aligned content record fields defined in `PROJECT.md` and `DATA_IMPORT_PLAN.md`.
- [x] Add bilingual Tasks / งานโปรดักชัน route (`/[locale]/tasks`) with task CRUD, filters, standalone tasks, and optional content relationships (`src/components/tasks/TasksView.tsx`, `src/app/actions/tasks.ts`).
- [x] Build an explicit-path import command that defaults to dry-run, never commits source data or private URLs, and is idempotent (`scripts/import-data.mjs`, `scripts/parse-sources.py`).
- [x] Match audited dry-run baseline: 158 auto candidates, 1 incomplete flagged, 54 placeholders skipped, 12 linked tasks, 4 standalone tasks, 1 blank skipped, 30 reference accounts.

Milestone 3 reviewer revision checklist:
- [x] 1. Remove production fallback sample data: authenticated empty database shows real empty state, read failures show error state with retry, server-side initial reads implemented for planner and tasks.
- [x] 2. Align task UI and database schema: removed `archived` status and `urgent` priority from UI and validation. Planned MVP enums enforced: status (`not_started`, `in_progress`, `done`), priority (`low`, `medium`, `high`), type (`video`, `photo`, `post`, `other`) with fixed selector dropdown.
- [x] 3. Add server-side runtime validation to every mutation: UUIDs, trimmed titles (max 500), optional text (max 5000), enum allowlists, arrays, URLs, progress 0-100, and dates validated in `src/utils/validation.ts`. Clean error messages returned without raw database leakage. Owner-scoped row confirmation via `.select('id')`.
- [x] 4. Complete content editing: added editable CTA, caption, hashtags, and content links to `RecordModal.tsx`. Preserved nullable goal and format without defaulting to short/awareness. Tasks page allows opening related content records in `RecordModal`.
- [x] 5. Correct publishing-date behavior: explicit Asia/Bangkok <-> UTC conversion (`src/utils/timezone.ts`), respect `publish_time_known` (date-only display when false), setting time sets `publish_time_known=true`, safety stop on importer blocking commit if 60 date warnings exist without reviewed decisions.
- [x] 6. Harden the importer: check and halt on every Supabase query, insert, update, and delete error (`checkError`). Counters increment only on verified success. Stable source-derived task keys (`notion-{slug}-{hash}`). Unambiguous Notion content-number linking. Combined FB/IG link label preserved. Safe link reconciliation (no wipe before insert). Added isolated database test proving idempotency across two runs and failure propagation (`tests/import.test.mjs`).
- [x] 7. Finish localization and accessibility: 100% exact Thai/English key parity (253 keys each). Localized statuses, headings, placeholders, errors, saving states. `RecordModal` and `TaskModal` have dialog semantics (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`), accessible close button, Escape key handling, focus trap and focus restoration.
- [x] 8. Restore project documentation: restored `TASKS.md` history and future roadmap from `HEAD`, Milestone 3 revision status added, drag-and-drop calendar scope removed (MVP non-goal), `HANDOFF.md` changed to "Revision required" with truthful evidence.
- [x] 9. Strengthen verification: tested authenticated empty database, CRUD & validation, UI enums vs DB constraints, expanded pgTAP RLS tests to 60 assertions (update/delete/reassignment/cascade/set null - 60/60 passed), Bangkok date conversions, and local import idempotency.

Reviewer revision 2 checklist (Milestone 3 second review findings):
- [x] 1. Make real importer executable under RLS: authenticated owner session via credentials or locally discovered Supabase development configuration; strict local safeguard unconditionally blocking non-local hosts (hosted imports disabled until separately approved milestone); executed actual `scripts/import-data.mjs` entry point in tests.
- [x] 2. Validate every date decision: require valid decision for every warning source number before commit; reject missing, extra, duplicate, malformed, or invalid calendar dates (such as Feb 30); permit explicit null for "leave unscheduled"; print only source numbers and decisions (0 private URLs printed); tested that a 1-entry file cannot bypass 60 warnings.
- [x] 3. Prevent partial content/link writes: reviewed database function `public.upsert_content_item_with_links` in PostgreSQL migration with pre-validation of all links before any row modification; atomic link replacement; failure tests demonstrate original content and links remain unchanged on error.
- [x] 4. Make runtime validation strict: invalid create statuses rejected without silent fallback; invalid optional-value types rejected without silent conversion to null; `publish_time_known` strictly validated as boolean; strict ISO timestamps and genuine calendar dates (rejecting Feb 30); oversized text rejected without silent truncation.
- [x] 5. Finish localization: removed hardcoded English loading messages, placeholders, validation messages, fallback errors, and "Copy of" prefix; added corresponding Thai/English keys (321 keys with 100% parity); translated stable server error codes (`src/utils/errors.ts`); added automated component string scanner test (`tests/localization-scanner.test.mjs`).
- [x] 6. Make tests exercise production code: double-run idempotency test against freshly reset isolated DB; actual authenticated server actions for content, task, and reference account CRUD; link rollback test; decoupled application suite using sanitized fixtures in `tests/fixtures/`; separate optional source-audit command (`npm run audit:sources`); test runner (`tests/run-tests.mjs`) starts/verifies local Supabase environment.
- [x] 7. Complete Excel/Notion replacement workflow: added searchable/editable reference-account view in Ideas (`src/components/ideas/ReferenceAccountsView.tsx`); added task filtering by due date (`all`, `overdue`, `today`, `this_week`, `no_due_date`); verified 30 imported reference accounts are accessible to owner.
- [x] 8. Correct accessibility claims: real Tab/Shift+Tab focus containment in `RecordModal`, `TasksView`, and `ReferenceAccountsView`; label-to-control associations with `htmlFor` and `id`; accessible names on icon-only buttons (`aria-label`); keyboard accessibility test suite (`tests/accessibility.test.mjs`).
- [x] 9. Update project truthfully: updated `TASKS.md` and `HANDOFF.md` keeping status as revision required with truthful evidence and test counts.

Reviewer revision 3 checklist (Milestone 3 focused final revision):
- [x] 1. Guarantee local test isolation: `tests/run-tests.mjs` overwrites `NEXT_PUBLIC_SUPABASE_URL` and publishable key with values strictly queried from local Supabase stack (`npx supabase status -o json`); aborts before running application/action tests unless resolved hostname is exactly `127.0.0.1` or `localhost`; `tests/actions.test.mjs` applies forced-local overwrite and abort guard; added regression test proving pre-existing hosted environment variables cannot be used.
- [x] 2. Keep Milestone 3 importer local-only: disabled hosted override paths until separate milestone; CLI rejects passwords and service-role keys as arguments; credentials come strictly from env or locally discovered Supabase config; genuine local authenticated user JWT session established via `signInWithPassword` so PostgreSQL `auth.uid()` evaluates properly in `upsert_content_item_with_links`; production passwordless auth design preserved.
- [x] 3. Harden argument handling and documentation: CLI rejects all unknown arguments; replaced `--notion` with `--csv`; removed nonexistent `--allow-non-owner-dev` and `--user-id` options; verified all documented commands execute cleanly without error.
- [x] 4. Complete database-boundary validation: `upsert_content_item_with_links` validates `p_item` is object, `p_links` is array/null; pre-validates all links (HTTP/HTTPS, length <= 2048, label <= 255, platform allowlist, sort order 0..10000); rejects empty platform arrays and invalid platforms without silent fallback; verified via 85 pgTAP tests including atomic rollback and rejection cases.
- [x] 5. Correct mutations and localization: `updateReferenceAccountAction` and `deleteReferenceAccountAction` verify exactly one affected row via `.select("id")` returning `not_found` otherwise; all server actions return stable error codes; `ReferenceAccountsView` maps codes through shared `getLocalizedErrorMessage`; content creation defaults status to `idea` only when omitted and rejects explicitly empty or invalid status.
- [x] 6. Strengthen importer verification: asserted real output counts for first-run creation (created: 2, updated: 0) and second-run updates (created: 0, updated: 2); verified representative row contents and relationships under RLS; expanded privacy assertions to reject HTTP URLs, source URLs, credentials, and private paths (`/Users/`); cleaned up test user before and after runs for isolated standalone reproducibility.
- [x] 7. Align RPC with canonical enums: platforms (`tiktok`, `instagram`, `youtube`, `facebook`, `x` for item and links), formats (`short`, `carousel`, `long`, `infographic`, `story`, `photo`), goals (`awareness`, `engagement`, `growth`, `leads`, `conversion`), removed unsupported `education` and `retention`.
- [x] 8. Add authenticated RPC/server-action enum tests: comprehensive test covering every accepted platform, format, and goal via both server actions and direct RPC, verifying unsupported values fail atomically and detecting future drift between TypeScript validation, SQL constraints, and the RPC.
- [x] 9. Restore explicit privileges: revoked function execution from `PUBLIC` and `anon`; granted execution only to `authenticated`; added pgTAP `has_function_privilege` tests proving `anon` cannot execute and `authenticated` can.
- [x] 10. Clean importer contract: removed `--user-id`; removed predictable fallback password and generated ephemeral local password via `randomUUID()`; checked and handled errors from `admin.updateUserById`; corrected stale importer header and stale hosted-override text in `TASKS.md`; fixed dry-run summary printing `0 skipped blank` instead of undefined.
- [x] 11. Correct `TASKS.md` and `HANDOFF.md`: updated documentation claiming only evidence produced by tests; status kept as `Revision required` awaiting Codex review.

Review checkpoint: Milestone 3 accepted by Codex on 2026-09-14. Ready for Milestone 4 assignment.

## Milestone 4 — Content editor, link workspace, text post preview, copy controls, and unsaved-change protection

Status: Accepted by Codex on 2026-09-15

- [x] Preserve and polish the existing content editor; do not rebuild completed fields.
- [x] Support external link CRUD for idea sources, assets, notes, and published posts.
- [x] Store URL, label, link type, optional platform, and ordering.
- [x] Validate HTTP/HTTPS links strictly.
- [x] Show safe link cards with label, platform, domain, copy, open, reorder, and remove controls.
- [x] Open external links safely in a new tab (`target="_blank" rel="noopener noreferrer"`).
- [x] Do not fetch remote pages, scrape metadata, download files, generate thumbnails, or automatically embed third-party content in Sprint 1.
- [x] Add a platform-neutral text preview for hook, caption, CTA, and hashtags.
- [x] Add localized copy controls and success/error feedback.
- [x] Warn before closing or navigating away with unsaved changes.
- [x] Preserve desktop, mobile, accessibility, and Thai/English behavior.
- [x] Add relevant tests and stop for Codex review.
- [x] Action-error propagation contract: parent handlers in `PlannerView` and `TasksView` preserve raw server error codes; `RecordModal` serves as the single localization boundary; added production regression tests.
- [x] Removed synthetic focus test controller mocks (`modalFocusLifecycle.ts`); documented manual live-browser focus verification.

Review checkpoint: Milestone 4 accepted by Codex on 2026-09-15.

## Milestone 5 — Calendar and idea bank

Status: Accepted by Codex on 2026-09-15

- [x] Implement a locale-aware monthly calendar.
- [x] Display scheduled content by platform and status.
- [x] Open the content editor from a calendar item.
- [x] Implement idea-bank quick capture.
- [x] Show unscheduled idea records without duplicating data.
- [x] Allow an idea to become planned content.
- [x] Provide useful empty and error states.
- [x] Run lint, relevant tests, and production build successfully.
- [x] Restored strict general content creation rejecting missing/empty platforms; isolated default platform resolution strictly to quick capture.
- [x] Added explicit accessible labels, assertive/polite live regions, aria-invalid/aria-describedby connections, and roving tabIndex to IdeasView.
- [x] Added multi-platform badge display and localized desktop empty state with Create Post action to CalendarView.
- [x] Extracted production unscheduled-idea predicate and roving tabIndex utilities; expanded accessibility scan coverage.

Review checkpoint: Milestone 5 accepted by Codex on 2026-09-15.

## Milestone 6 — Bilingual completion and release quality

Status: Complete; awaiting Codex review

- [x] Audit every visible string in Thai and English (100% key parity, zero unlocalized strings).
- [x] Verify Thai typography, wrapping (`overflow-wrap: break-word; word-break: break-word`), dates, times, and form validation.
- [x] Verify keyboard navigation and visible focus (`:focus-visible`, roving focus, focus trap).
- [x] Verify loading, empty, error, offline, success, and destructive confirmation states.
- [x] Verify planner, editor, calendar, ideas, tasks, login, and settings on mobile and desktop.
- [x] Fixed tablet breakpoint visibility gap where `PlannerCards` container had `md:hidden` under `PlannerView`'s `block lg:hidden`.
- [x] Adjusted mobile navigation tab label width and responsive typography in `MobileNav.tsx` to prevent Thai label truncation on 390px viewports.
- [x] Added localized button pending/saving states (`common.saving`) to replace raw '...' across all form modals.
- [x] Added localized metadata for `/settings` via `src/app/[locale]/settings/layout.tsx`.
- [x] Removed dead sample code (`src/data/sampleContent.ts`) and purged unresolved placeholders and orphaned translation keys.
- [x] Added automated Milestone 6 test suite `tests/release-quality-milestone6.test.mjs` (9/9 tests passing).
- [x] Corrected static translation calls: restored `recordModal.createTitle`, used `recordModal.close`, `recordModal.title`, and `referenceAccounts.editAccount`.
- [x] Aligned dynamic format and goal prefixes in `RecordModal.tsx` to canonical `format.` and `goal.`.
- [x] Built automated static and dynamic translation call scanner with negative regression guards for missing keys.
- [x] Run lint (0 errors, 0 warnings), all tests (183/183 passed), and production build successfully.

Review checkpoint: Stop and request release review before Milestone 7.

## Milestone 7 — Vercel release

Status: In Progress

- [x] Connect the reviewed repository to Vercel (`nack4/content-planner`).
- [x] Configure Development, Preview, and Production environment variables securely (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `ALLOWED_EMAIL`).
- [x] Clean `.gitignore` to keep `.vercel`, `.env`, and secrets ignored while preserving `.env.example`.
- [x] Inspect hosted Supabase migration state and confirm Migration 3 (`20260914000002_add_workflow_tables.sql`) applied.
- [x] Verify `content_links`, `production_tasks`, `reference_accounts`, and `content_items` workflow columns exist on hosted Supabase.
- [x] Verify anonymous access remains blocked by RLS (HTTP 401 across all tables).
- [x] Create Vercel Preview deployment (`https://content-planner-otp300zpj-nack4.vercel.app`) from reviewed commit `abd923e`.
- [x] Verify route loading and redirections for Thai and English login, planner, tasks, calendar, ideas, and settings.
- [x] Confirm public signup remains strictly disabled (`disable_signup: true`).
- [x] Verify localized sign-out endpoints redirect to `/{locale}/login` with HTTP 303.
- [x] Revoke and rotate compromised Vercel protection-bypass token without printing new secret.
- [x] Replace single-email authorization design with server-only comma-separated `ALLOWED_EMAILS` helper.
- [x] Enforce exact email matching, whitespace trimming, case normalization, empty entry filtering, and fail-closed security.
- [x] Support legacy `ALLOWED_EMAIL` fallback when `ALLOWED_EMAILS` is absent, with `ALLOWED_EMAILS` taking precedence when present.
- [x] Update all authorization boundaries (`sendMagicLinkAction`, auth callback route, and proxy session updater).
- [x] Expand automated tests for multi-owner normalization, casing, whitespace, empty entries, unauthorized addresses, partial matches, missing config, and precedence (183/183 tests pass).
- [x] Update documentation and `.env.example` without exposing real emails or secrets.
- [x] Verify `ALLOWED_EMAILS` is configured on Vercel across Production, Preview, and Development.
- [x] Confirm no environment values, email addresses, tokens, or private URLs appear in deployment output or client bundles.
- [x] Create separate controlled hosted-import preparation workflow (`scripts/prepare-hosted-import.mjs`), preserving `scripts/import-data.mjs` strictly as the local-only importer.
- [x] Enforce dry-run mode as default with zero database writes.
- [x] Enforce exact target accounts: strictly targets the 3 approved owner accounts specified in the private manifest, rejecting extra, missing, duplicate, or malformed addresses.
- [x] Lock date policy: strictly applies 38 corrected reversals and 22 unscheduled records from `.private-import/approved-date-decisions.json`, rejecting deviations or extra/missing keys.
- [x] Implement two-stage confirmation guard requiring `--confirm-backup` and `--confirm-execution`, plus manifest authorization check (`hosted_write_authorized`).
- [x] Require all 3 target auth users to exist in Supabase Auth before allowing commit mode.
- [x] Ensure strict multi-account planner isolation under `auth.uid() = user_id`, with non-destructive native OTP session establishment.
- [x] Verify expected counts: 158 content items, 419 links, 30 reference accounts, 16 tasks per account; 474 items, 1,257 links, 90 reference accounts, 48 tasks total.
- [x] Enforce atomic transactional rollback on link failures using `upsert_content_item_with_links`.
- [x] Enforce rerun idempotency: subsequent commit runs update existing records with 0 created and identical totals.
- [x] Enforce zero secret, credential, or private source URL leakage in CLI stdout/stderr.
- [x] Add comprehensive automated test suite (`tests/hosted-import-prep.test.mjs`, 14 tests) using fully synthetic portable fixtures and wire into `tests/run-tests.mjs` (197/197 tests pass).
- [ ] Verify hosted Supabase target auth users are created and confirmed before import execution.
- [ ] Obtain verified database backup confirmation and explicit execution confirmation before hosted commit.
- [ ] Complete owner authenticated smoke test on Preview deployment (`https://content-planner-otp300zpj-nack4.vercel.app/th/login`) verifying private planner isolation per owner.
- [ ] Deploy accepted version to Production.
- [ ] Confirm that no secret values or private media URLs appear in client output or documentation.
- [ ] Record deployment results in `HANDOFF.md` without secrets.

Acceptance criteria:

- The owner can sign in and complete the full link-only MVP journey in production.
- Thai and English work in production.
- Data and external links persist securely.
- Required production checks pass with no known release blocker.

---

## Sprint 2 Backlog (Deferred Capabilities)

Status: Deferred until Sprint 1 MVP completion

- [ ] **Private Media Upload UI**: Image and video upload interface directly attached to content records (backed by `public.content_media` defined in `supabase/migrations/20260914000000_create_mvp_schema.sql`).
- [ ] **Large-File & Resumable Uploads**: Chunked, resumable uploads (TUS protocol) with progress indicators and error recovery.
- [ ] **Media Organization**: Visual media ordering, preview gallery, and file removal controls.
- [ ] **Temporary Signed Viewing URLs**: Short-lived signed URLs from private `content-media` bucket (defined in `supabase/migrations/20260914000001_create_storage_and_user_trigger.sql`).
- [ ] **Storage Quotas**: Configurable storage limits, file size caps, and usage monitoring per account.
- [ ] **Subscriptions and Billing**: Stripe integration for paid tiers, checkout flow, customer portal, and webhook handling.
- [ ] **Public Accounts & Multi-Tenant SaaS**: Public registration flow, multi-user workspace schemas, team invitations, and role-based permissions (RBAC).
- [ ] **Platform Social Publishing**: Direct API publishing integrations for TikTok, Meta (Instagram/Facebook), YouTube, and X with post performance analytics.
