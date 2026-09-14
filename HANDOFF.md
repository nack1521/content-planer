# Implementation Handoff

This file is replaced or updated at the end of each implementation cycle. Do not include credentials, tokens, private URLs, database passwords, or personal content.

## Current assignment

- Milestone: 2 — Supabase schema and private authentication
- Status: Blocked — Requires privileged user action for hosted Supabase migration and setup
- Reviewer: Codex

## Implementation Summary

All Milestone 2 reviewer revision items and second Codex review findings have been resolved and verified locally in accordance with `AGENTS.md`, `PROJECT.md`, `ARCHITECTURE.md`, `TASKS.md`, and reviewer instructions. Migrations have **not** been applied to hosted Supabase, Milestone 3 has **not** been started, and no unrelated projects or containers were accessed.

### 1. Isolated Local Supabase Stack & Truthful Database Policy Verification
- **Replaced `tests/run-db-tests.mjs`**: Completely purged all logic that discovered arbitrary containers, external usernames, passwords, or unrelated project databases.
- **Isolated Repository Stack Only**: Test runner executes exclusively against this repository's local Supabase stack:
  - `npx supabase start` (starts isolated `supabase_db_contentPlaner` on dedicated port 54322)
  - `npx supabase db reset --local` (recreates database, applies migrations 1 and 2)
  - `npx supabase test db --local` (executes pgTAP test suite against the local instance)
  - If Docker cannot start the local stack or pull images, the runner fails closed, reporting the test as blocked without touching any other containers.
- **Removed Mock Database Setup**: Deleted `supabase/tests/database/setup-local-db.sql`. The official Supabase local stack provides the genuine `auth` and `storage` schemas and services.
- **Truthful Test Reporting**:
  - Baseline PostgreSQL compatibility was demonstrated by SQL syntax verification.
  - Full Supabase Auth and Storage compatibility is verified by `npx supabase test db --local` against the running isolated Supabase container (`supabase_db_contentPlaner`), with all 26 pgTAP assertions passing.

### 2. Isolated Next.js Test Runner (`tests/run-tests.mjs`)
- **Build from Current Source**: Always invokes `npx next build` in production mode prior to running tests, ensuring tested artifacts reflect current code.
- **Dedicated Port & No Port 3000 Reuse**: Dynamically acquires an available test port via `net.createServer().listen(0)` and starts an isolated Content Planner server on `http://127.0.0.1:<testPort>`.
- **Environment Base URL Injection**: Injects `TEST_BASE_URL` into the test runner process. Both `tests/planner.test.mjs` and `tests/auth.test.mjs` consume `process.env.TEST_BASE_URL`.
- **Guaranteed Cleanup**: Encapsulated server lifecycle in a `finally` block, ensuring the spawned server process is terminated on any test success or failure.

### 3. Safe Redirect Header Preservation (`src/utils/supabase/redirect.ts`)
- **Explicit Allowlist**: Defined `ALLOWED_REDIRECT_HEADERS` (`cache-control`, `clear-site-data`, `strict-transport-security`, `x-content-type-options`, `x-frame-options`, `x-correlation-id`, `x-request-id`, `x-trace-id`, `traceparent`, `tracestate`).
- **Middleware Control Header Exclusion**: Next.js internal control headers (such as `x-middleware-next`, `x-middleware-rewrite`, `x-middleware-override-headers`) and redirect-specific headers (`location`, `content-type`, `content-length`) are strictly omitted from redirect responses.
- **Preserved Cookies**: Cookies from `sourceResponse.cookies.getAll()` are copied separately to the redirect response.
- **Automated Verification**: Added tests in `tests/auth.test.mjs` asserting that `x-middleware-next`, `x-middleware-rewrite`, and `x-middleware-override-headers` are absent from redirects, while allowlisted application headers are preserved.

### 4. Strengthened URL Origin Resolution (`src/utils/url/getOrigin.ts`)
- **Strict URL Parsing**: Parses configured environment variables using `new URL()`, accepting only `http:` and `https:` protocols.
- **Origin Only**: Returns only `url.origin`, stripping any path segments, credentials, query strings, or fragments.
- **Localhost Fallback Gated to Development**: Localhost fallback (`http://localhost:3000`) is permitted only when `process.env.NODE_ENV !== 'production'`.
- **Fail-Closed in Production**: In production, if `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_VERCEL_URL` are absent or invalid, `getAppOrigin()` throws an Error. `src/app/actions/auth.ts` catches this and returns a neutral response to prevent credential disclosure.
- **Unit Tests**: Added unit tests in `tests/auth.test.mjs` verifying development localhost fallback, production fail-closed behavior on missing/invalid/non-http URLs, origin normalization (stripping paths, credentials, queries, fragments), preview deployments, and local HTTP origins.

### 5. Settings Persistence Feedback & State Separation (`src/app/[locale]/settings/page.tsx`)
- **Independent Pending States**: Separated platform saving (`isSavingPlatforms`) from sign-out (`isSigningOut`).
- **No Sign-Out False Label**: Sign-out button exclusively displays `{isSigningOut ? t('auth.signingOut') : t('auth.signOut')}`, eliminating the issue where saving platform preferences displayed "Signing out".
- **Update Serialization & Disabling**: Platform buttons are disabled while saving (`disabled={isSavingPlatforms}`) to serialize persistence requests.
- **Optimistic Reversion & Error Notice**: If `updateDefaultPlatformsAction` fails or throws, optimistic platform selection is reverted to previous state and a bilingual error notice (`settings.saveError`) is displayed for 4 seconds.
- **Bilingual Dictionaries**: Added `settings.saveError` to `src/messages/en.json` and `src/messages/th.json`.

### 6. Preserved Schema & Migration Hardening
- `supabase/migrations/20260914000000_create_mvp_schema.sql`:
  - `foreign key (content_pillar_id, user_id) references public.content_pillars (id, user_id) on delete set null (content_pillar_id)` correctly nullifies only `content_pillar_id` on pillar deletion, preserving `user_id` and the content item.
  - `handle_updated_at()` trigger function configured with `set search_path = ''`.
  - Row Level Security (RLS) enabled on all 4 tables with strict `auth.uid() = user_id` policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
  - Explicit privilege revocation on public tables and routines from `anon` and `public`; granted schema usage and CRUD only to `authenticated`.
- `supabase/migrations/20260914000001_create_storage_and_user_trigger.sql`:
  - Private `content-media` bucket (`public = false`, 100MB max limit, MIME restrictions).
  - Storage policies partitioned by owner folder: `auth.uid()::text = (storage.foldername(name))[1]`.
  - `handle_new_user()` security definer function configured with `set search_path = ''`.
  - Explicit permission revocation: `revoke execute on function public.handle_new_user() from public, anon, authenticated;`.
  - Trigger `on_auth_user_created` on `auth.users` to automatically provision `user_preferences`.

## Verification Results

| Check | Command | Result | Notes |
|---|---|---|---|
| Whitespace Check | `git diff --check` | PASS | 0 trailing whitespace or formatting issues |
| ESLint | `npm run lint` | PASS | 0 errors, 0 warnings |
| Node Test Suite | `npm test` | PASS | 12 passed, 0 failed, 0 skipped (isolated test server on dynamic port) |
| Isolated Supabase Policy Tests | `npm run test:db` | PASS | 26 passed, 0 failed (`npx supabase test db --local` against isolated stack) |
| Production Build | `npm run build` | PASS | Turbopack compilation succeeded with 0 deprecation warnings |
| Live Route Protection | HTTP Probe `/th/planner` | PASS | HTTP 307 -> `/th/login` |
| Live Route Protection | HTTP Probe `/en/planner` | PASS | HTTP 307 -> `/en/login` |
| Live Route Protection | HTTP Probe `/th/calendar` | PASS | HTTP 307 -> `/th/login` |
| Live Route Protection | HTTP Probe `/th/ideas` | PASS | HTTP 307 -> `/th/login` |
| Live Route Protection | HTTP Probe `/th/settings` | PASS | HTTP 307 -> `/th/login` |
| Live Login Page | HTTP Probe `/th/login` | PASS | HTTP 200 OK |
| Live Login Page | HTTP Probe `/en/login` | PASS | HTTP 200 OK |
| Invalid Locale Rejection | HTTP Probe `/fr/login` | PASS | HTTP 404 Not Found |
| Auth Callback Protection | HTTP Probe `/th/auth/callback` | PASS | HTTP 307 -> `/th/login` |

## Changed Files

- `src/utils/supabase/redirect.ts`: Explicit allowlist `ALLOWED_REDIRECT_HEADERS`; strictly excludes Next.js internal middleware headers.
- `src/utils/url/getOrigin.ts`: Robust URL parser returning origin only; fails closed in production; allows localhost only in development.
- `src/app/actions/auth.ts`: Uses `getAppOrigin()` with fail-closed try/catch.
- `src/app/[locale]/settings/page.tsx`: Independent pending states (`isSavingPlatforms` vs `isSigningOut`), disabled buttons during save, optimistic rollback on error.
- `src/messages/en.json`, `src/messages/th.json`: Added `settings.saveError` translation keys.
- `tests/run-db-tests.mjs`: Safe isolated runner using only `npx supabase start`, `db reset --local`, and `test db --local`.
- `tests/run-tests.mjs`: Always builds from current source; spins up isolated server on dynamic port; passes `TEST_BASE_URL`; terminates in `finally`.
- `tests/auth.test.mjs`: Added middleware control header exclusion test, `getAppOrigin()` test suite, and dynamic `baseUrl`.
- `tests/planner.test.mjs`: Dynamic `baseUrl` consumption.
- `TASKS.md`: Updated checklist and blocked status.
- `HANDOFF.md`: This handoff document.

## Exact User Action Required to Unblock Hosted Setup

The local implementation, schema migrations, and test suites are complete and locally verified on Content Planner's isolated Supabase stack. In accordance with reviewer instructions, migrations have not been applied to hosted Supabase. To unblock Milestone 2:

1. **Apply Migrations to Hosted Supabase**:
   - Execute the SQL in `supabase/migrations/20260914000000_create_mvp_schema.sql` and `supabase/migrations/20260914000001_create_storage_and_user_trigger.sql` via the Supabase Dashboard SQL Editor (or via `npx supabase db push` if CLI link is authenticated).
2. **Provision Owner Account**:
   - Start the local dev server (`npm run dev`) or visit the deployed application.
   - Navigate to `http://localhost:3000/th/login`.
   - Submit the email configured in `ALLOWED_EMAIL` to receive the magic link.
   - Complete login via the magic link callback to trigger `on_auth_user_created`, creating the owner's initial `user_preferences` row.
3. **Disable Public Sign-ups**:
   - In the Supabase Project Dashboard under **Authentication -> Configuration -> User Signups**, toggle off **"Allow new users to sign up"**.
4. **Notify Reviewer**:
   - Once the above three steps are completed on hosted Supabase, prompt Codex to perform remote table/bucket verification and accept Milestone 2.

Do not begin Milestone 3 until Milestone 2 is officially accepted by Codex.
