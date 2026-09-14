# Content Planner Milestones

## Execution rule

An implementation agent must complete only the first unchecked milestone, update this file, write `HANDOFF.md`, and stop for review.

Do not mark a milestone complete unless every acceptance criterion and required check passes. Individual checklist items may be checked as they are completed.

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

Status: Blocked — Requires privileged user action for hosted Supabase migration and setup

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
- [ ] After the corrected migrations pass local review, apply them to the hosted project, create and verify the owner account, disable new-user signup, and verify the remote tables/bucket and owner-only login. If privileged user action is required, mark the milestone blocked and state the exact action instead of marking it complete.
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

Review checkpoint: Stop and request database/security review before Milestone 3.

## Milestone 3 — Planner persistence and record management

Status: Blocked by Milestone 2

- [ ] Replace planner sample data with authenticated Supabase reads.
- [ ] Implement create, edit, duplicate, archive, restore, and confirmed delete actions.
- [ ] Implement the full content record fields defined in `PROJECT.md`.
- [ ] Implement search and filters.
- [ ] Persist status and progress updates.
- [ ] Add validated forms and useful success/error feedback.
- [ ] Add focused tests for validation and record transformations.
- [ ] Run lint, tests, and production build successfully.

Review checkpoint: Stop and request CRUD/data review before Milestone 4.

## Milestone 4 — Content editor, preview, and media

Status: Blocked by Milestone 3

- [ ] Implement the responsive content editor.
- [ ] Add hook, caption, call-to-action, hashtags, and notes editing.
- [ ] Add private image/video upload, ordering, preview, and removal.
- [ ] Validate file type and configured size limits.
- [ ] Add temporary signed media URLs.
- [ ] Add the post preview.
- [ ] Add copy controls for caption, CTA, and hashtags.
- [ ] Warn about unsaved changes.
- [ ] Run lint, relevant tests, and production build successfully.

Review checkpoint: Stop and request media/security review before Milestone 5.

## Milestone 5 — Calendar and idea bank

Status: Blocked by Milestone 4

- [ ] Implement a locale-aware monthly calendar.
- [ ] Display scheduled content by platform and status.
- [ ] Open the content editor from a calendar item.
- [ ] Implement idea-bank quick capture.
- [ ] Show unscheduled idea records without duplicating data.
- [ ] Allow an idea to become planned content.
- [ ] Provide useful empty and error states.
- [ ] Run lint, relevant tests, and production build successfully.

Review checkpoint: Stop and request workflow review before Milestone 6.

## Milestone 6 — Bilingual completion and release quality

Status: Blocked by Milestone 5

- [ ] Audit every visible string in Thai and English.
- [ ] Verify Thai typography, wrapping, dates, times, and form validation.
- [ ] Verify keyboard navigation and visible focus.
- [ ] Verify loading, empty, error, offline, success, and destructive confirmation states.
- [ ] Verify planner, editor, calendar, ideas, login, and settings on mobile and desktop.
- [ ] Remove debug output, dead sample code, and unresolved placeholders.
- [ ] Run lint, all tests, and production build successfully.

Review checkpoint: Stop and request release review before Milestone 7.

## Milestone 7 — Vercel release

Status: Blocked by Milestone 6 and deployment access

- [ ] Connect the reviewed repository to Vercel.
- [ ] Configure Development, Preview, and Production environment variables.
- [ ] Confirm Supabase authentication redirect URLs for preview and production.
- [ ] Apply reviewed production migrations.
- [ ] Create and verify a Vercel Preview deployment.
- [ ] Perform final smoke tests against Supabase.
- [ ] Deploy the accepted version to Production.
- [ ] Confirm that no secret values or private media URLs appear in client output or documentation.
- [ ] Record deployment results in `HANDOFF.md` without secrets.

Acceptance criteria:

- The owner can sign in and complete the full MVP journey in production.
- Thai and English work in production.
- Data and private media persist securely.
- Required production checks pass with no known release blocker.
