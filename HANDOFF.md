# Implementation Handoff

This file is replaced or updated at the end of each implementation cycle. Do not include credentials, tokens, private URLs, database passwords, or personal content.

## Current assignment

- Milestone: 2 — Supabase schema and private authentication
- Status: Blocked — Requires privileged user action for hosted Supabase migration and setup
- Reviewer: Codex

## Implementation Summary

All Milestone 2 reviewer revision items and Codex findings have been addressed and locally verified in accordance with `AGENTS.md`, `PROJECT.md`, `ARCHITECTURE.md`, `TASKS.md`, and reviewer instructions. In compliance with the explicit instruction not to apply migrations to the hosted project without privileged user action, the milestone is marked blocked with the exact steps required to unblock it.

### 1. Next.js 16 Proxy Architecture & Redirect Preservation (`src/proxy.ts`, `src/utils/supabase/redirect.ts`)
- Removed the deprecated `src/middleware.ts` file convention.
- Created `src/proxy.ts` exporting a named `async function proxy(request: NextRequest)` and route matcher, eliminating Next.js 16 middleware deprecation warnings during build.
- Implemented `src/utils/supabase/proxy.ts`:
  - **Fail-Closed Security**: If `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, or `ALLOWED_EMAIL` is missing from the environment, all unauthenticated requests to protected application routes redirect to `/${locale}/login?error=service_error`. Protected content is never exposed when configuration is missing.
  - **Supabase SSR Contract**: Session claims are validated using `supabase.auth.getClaims()`.
  - **Header & Cookie Preservation Helper (`src/utils/supabase/redirect.ts`)**: Custom redirects use `createRedirectResponse(url, sourceResponse, status)` which propagates all cookies (`sourceResponse.cookies.getAll()`) and non-redirect response headers (`x-*`, tracing, session headers) without overwriting redirect-specific headers (`location`, `content-type`, `content-length`).
  - **No Redirect Loop on Unauthorized Session**: When an authenticated user does not match `ALLOWED_EMAIL`, the proxy executes `await supabase.auth.signOut()` and passes the resulting cookie clearance headers to the redirect response. The browser deletes the cookie immediately, preventing an infinite redirect loop.

### 2. Server Action, Callback Security Hardening & Validated URL Origins
- `src/utils/url/getOrigin.ts`:
  - Validates and constructs the application origin URL strictly from environment configuration: prioritizing `NEXT_PUBLIC_SITE_URL`, then `NEXT_PUBLIC_VERCEL_URL` / `VERCEL_URL`, and falling back to `http://localhost:3000` only during local development.
  - Does NOT construct magic-link callback origins from untrusted request headers (`Host` or `x-forwarded-host`).
  - `.env.example` updated with variable names (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_VERCEL_URL`) without real values.
- `src/app/actions/auth.ts`:
  - Uses `getAppOrigin()` to generate callback redirect URLs.
  - Enforces runtime validation on `locale` (`locale === 'en' ? 'en' : 'th'`).
  - Returns a uniform, neutral success response for unauthorized emails, completely preventing user enumeration and unauthorized OTP dispatches.
- `src/app/[locale]/auth/callback/route.ts`:
  - Restricts callback destinations to an allowlist of approved localized application routes (`/${locale}/planner`, `/${locale}/calendar`, `/${locale}/ideas`, `/${locale}/settings`). Any unapproved or external destination defaults safely to `/${locale}/planner`.
  - Validates `locale` and triggers `notFound()` for invalid locales.
  - Re-checks server-side `isAllowedEmail(user.email)`; if unauthorized, signs out and redirects to `/login?error=unauthorized`.

### 3. Persisted User Preferences & Default Platforms Connected to Settings UI
- `src/app/actions/preferences.ts`: Server actions connecting user preferences:
  - `getPreferencesAction()`: Reads `user_preferences` for the authenticated owner.
  - `updateLocalePreferenceAction(locale)`: Validates and updates the owner's locale.
  - `updateDefaultPlatformsAction(platforms)`: Validates platform entries against `ALLOWED_PLATFORMS` (`tiktok`, `instagram`, `youtube`, `facebook`, `x`) and updates `default_platforms`.
- `src/context/LocaleContext.tsx`: Connected `updateLocalePreferenceAction(newLocale)` on language toggle to persist changes to Supabase asynchronously without blocking client navigation.
- `src/app/[locale]/settings/page.tsx`:
  - Loads and displays persisted timezone, locale, and default platform preferences on mount via `getPreferencesAction()`.
  - Features interactive platform toggle pills for all supported platforms with optimistic state updates and server action persistence.
  - Bilingual localization keys added in `src/messages/en.json` and `src/messages/th.json` (`settings.defaultPlatformsLabel`, `settings.defaultPlatformsDesc`, `settings.saved`).

### 4. Hardened Database Schema, Foreign Keys & Function Permissions
- `supabase/migrations/20260914000000_create_mvp_schema.sql`:
  - Tables:
    - `user_preferences`: `user_id` (PK, cascade), `locale` (`th` or `en`), `timezone` (default `'Asia/Bangkok'`), `default_platforms` (text array), timestamps.
    - `content_pillars`: `id`, `user_id`, `name_en`, `name_th`, `color`, `sort_order`, timestamps. Unique constraint on `(id, user_id)`. Unique index on `(user_id, lower(name_en))`.
    - `content_items`: `id`, `user_id`, `title`, `platforms`, `content_pillar_id`, `format`, `goal`, `status`, `progress` (0..100), `publish_at`, `hook`, `caption`, `cta`, `hashtags`, `notes`, `archived_at`, timestamps. Unique constraint on `(id, user_id)`.
    - Composite Foreign Key: `foreign key (content_pillar_id, user_id) references public.content_pillars (id, user_id) on delete set null (content_pillar_id)`, guaranteeing that deleting a referenced pillar sets only `content_pillar_id` to null while preserving the required `user_id` and the content item.
    - Composite Indexes: `(user_id, publish_at)`, `(user_id, status)`, `(user_id, archived_at)`.
    - `content_media`: `id`, `user_id`, `content_item_id`, `storage_path`, `media_type`, `original_name`, `mime_type`, `size_bytes`, `sort_order`, `created_at`.
    - Composite Foreign Key: `foreign key (content_item_id, user_id) references public.content_items (id, user_id) on delete cascade`, guaranteeing same-owner integrity between media and items.
  - `handle_updated_at()` trigger function explicitly configured with `set search_path = ''`.
  - Row Level Security (RLS) enabled on all 4 tables with strict `auth.uid() = user_id` policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
  - Same-owner subqueries enforced on both `INSERT` and `UPDATE` for `content_items` (`content_pillar_id`) and `content_media` (`content_item_id`).
  - Explicit Role Grants: Revoked all privileges on public tables and functions from `anon` and `public`; granted schema usage and CRUD permissions only to `authenticated`.
- `supabase/migrations/20260914000001_create_storage_and_user_trigger.sql`:
  - Private `content-media` bucket (`public = false`, 100MB max limit, image and video MIME restrictions).
  - Storage policies on `storage.objects` partitioned by owner folder: `auth.uid()::text = (storage.foldername(name))[1]`.
  - `handle_new_user()` security definer function configured with `set search_path = ''`.
  - **Explicit Permission Revocation**: Added `revoke execute on function public.handle_new_user() from public, anon, authenticated;` so that public roles cannot invoke it directly, while maintaining trigger execution via the auth event.
  - Trigger `on_auth_user_created` on `auth.users` to automatically provision `user_preferences`.

### 5. Executable Database Policy Tests & Deterministic Test Runners
- `supabase/tests/database/rls.test.sql`:
  - Uses valid psql variable syntax (`:'user1'`, `:'user2'`).
  - Enables `pgtap` extension before `plan(26)`.
  - Plan count matches the 26 actual assertions.
  - Tests 20-23: Executable regression test proving that deleting a referenced pillar succeeds, preserves the content item and its `user_id`, and sets only `content_pillar_id` to null.
  - Storage bucket isolation assertions (Owner 2 cannot upload to or select from Owner 1 storage folder).
  - Successfully executed against real local PostgreSQL instance (`investment-postgres-1`) with all 26 assertions passing.
- `tests/run-db-tests.mjs`: Dedicated local database test runner script (`npm run test:db`) that resets `content_planner_test`, applies migrations, and executes pgTAP assertions cleanly.
- `tests/run-tests.mjs`: Next.js test runner that launches local server on port 3000 if not already running, preventing silent test skips.
- `package.json`: Configured with `"type": "module"`, eliminating `MODULE_TYPELESS_PACKAGE_JSON` warning.
  - `"test": "node tests/run-tests.mjs"` (11 passed, 0 skipped, 0 failed).
  - `"test:db": "node tests/run-db-tests.mjs"` (26 passed, 0 failed).

## Verification Results

| Check | Command | Result | Notes |
|---|---|---|---|
| Whitespace Check | `git diff --check` | PASS | 0 trailing whitespace or formatting issues |
| ESLint | `npm run lint` | PASS | 0 errors, 0 warnings |
| Node Test Suite | `npm test` | PASS | 11 passed, 0 failed, 0 skipped (live server route tests executed) |
| Local Database Policy Tests | `npm run test:db` | PASS | 26 passed, 0 failed (pgTAP against local Postgres instance) |
| Production Build | `npm run build` | PASS | Turbopack compilation succeeded with 0 deprecation warnings |
| Live Route Protection | `curl -I http://localhost:3000/th/planner` | PASS | HTTP 307 -> `/th/login` |
| Live Route Protection | `curl -I http://localhost:3000/en/planner` | PASS | HTTP 307 -> `/en/login` |
| Live Route Protection | `curl -I http://localhost:3000/th/calendar` | PASS | HTTP 307 -> `/th/login` |
| Live Route Protection | `curl -I http://localhost:3000/th/ideas` | PASS | HTTP 307 -> `/th/login` |
| Live Route Protection | `curl -I http://localhost:3000/th/settings` | PASS | HTTP 307 -> `/th/login` |
| Live Login Page | `curl -I http://localhost:3000/th/login` | PASS | HTTP 200 OK |
| Live Login Page | `curl -I http://localhost:3000/en/login` | PASS | HTTP 200 OK |
| Invalid Locale Rejection | `curl -I http://localhost:3000/fr/login` | PASS | HTTP 404 Not Found |
| Invalid Locale Rejection | `curl -I http://localhost:3000/fr/planner` | PASS | HTTP 404 Not Found |
| Auth Callback Protection | `curl -I http://localhost:3000/th/auth/callback` | PASS | HTTP 307 -> `/th/login` |

## Changed Files

- `src/proxy.ts`: Next.js 16 App Router proxy convention.
- `src/middleware.ts`: Removed deprecated file.
- `src/utils/supabase/proxy.ts`: Session refresh, cookie propagation, fail-closed handling.
- `src/utils/supabase/middleware.ts`: Re-export for compatibility.
- `src/app/actions/auth.ts`: Runtime locale validation and anti-enumeration magic link action.
- `src/app/actions/preferences.ts`: Server actions connecting user preferences.
- `src/app/[locale]/auth/callback/route.ts`: Callback route with destination allowlisting.
- `src/context/LocaleContext.tsx`: Connected locale updates to `user_preferences`.
- `src/app/[locale]/settings/page.tsx`: Connected preference loading on mount.
- `supabase/migrations/20260914000000_create_mvp_schema.sql`: Hardened schema with composite FKs, empty search_path, explicit grants.
- `supabase/migrations/20260914000001_create_storage_and_user_trigger.sql`: Private storage bucket and security definer trigger with empty search_path.
- `supabase/tests/database/rls.test.sql`: pgTAP executable database policy test suite.
- `src/utils/supabase/redirect.ts`: Production redirect response helper preserving cookies and non-redirect headers.
- `src/utils/url/getOrigin.ts`: Validated application origin URL resolver.
- `supabase/tests/database/setup-local-db.sql`: Local database test harness bootstrap.
- `tests/run-db-tests.mjs`: Local database policy test runner (`npm run test:db`).
- `tests/run-tests.mjs`: Next.js deterministic test runner.
- `tests/auth.test.mjs`: Tests production `createRedirectResponse`, composite FK, function revocation, route protection without skips.
- `tests/planner.test.mjs`: Removed skips from live server tests.
- `package.json`: Updated test runner command.
- `TASKS.md`: Updated checklist and blocked status.
- `HANDOFF.md`: This handoff document.

## Exact User Action Required to Unblock Hosted Setup

The local implementation and test suite are complete and verified. Per instructions, migrations have not been applied to the remote Supabase instance. To unblock Milestone 2:

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
