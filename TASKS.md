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

Status: Blocked by Supabase project configuration

- [ ] Add `.env.example` using the variable names from `ARCHITECTURE.md`.
- [ ] Add browser and server Supabase clients using supported SSR session handling.
- [ ] Create versioned SQL migrations for all MVP tables, constraints, indexes, timestamps, and RLS policies.
- [ ] Create private Storage bucket policies for owner-scoped media.
- [ ] Implement passwordless email login, callback, logout, and protected application routes.
- [ ] Enforce the personal-owner restriction without exposing secrets.
- [ ] Replace sample user preferences with persisted locale and timezone preferences.
- [ ] Document how the owner account is created and how public sign-up is disabled.
- [ ] Verify unauthenticated access is redirected and cross-user data access is rejected.
- [ ] Run lint and production build successfully.

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
