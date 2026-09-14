# Content Planner System Architecture

## Architectural principles

1. Build a working vertical slice before adding secondary views.
2. Keep the architecture appropriate for one user while establishing clean boundaries for future multi-tenancy.
3. Protect private planning notes, draft hooks, and unreleased content through strict authorization.
4. Prefer boring, maintainable web standards: responsive HTML, standard CSS, and minimal moving parts.
5. Design for bilingual parity in the data model and the user interface from day one.
6. Two-phase delivery model:
   - **Sprint 1 (Milestones 1–7)**: Complete private link-only MVP. All asset references and production links use external URLs via `content_links`.
   - **Sprint 2 (Future Backlog)**: Media upload pipeline, resumable large files, storage quotas, billing/subscriptions, public accounts, multi-user SaaS workspaces, and platform API integrations.

## Target tech stack

- Framework: Next.js 16 (App Router) with React 19.
- Language: TypeScript (strict mode).
- Styling: Tailwind CSS configured for a minimal Swiss institutional aesthetic.
- Database: Supabase PostgreSQL with Row Level Security.
- Authentication: Supabase Auth using passwordless email OTP.
- Media Storage: Supabase Storage private bucket (dormant Sprint 2 infrastructure; not exposed in Sprint 1).
- Hosting: Vercel.
- Primary Timezone: Asia/Bangkok (`Asia/Bangkok`).

## Logical structure

```text
src/
  app/
    [locale]/
      layout.tsx
      page.tsx                 # Redirects to default route (planner)
      login/
        page.tsx               # Passwordless email authentication
      planner/
        page.tsx               # Main planning dashboard (table + cards)
      tasks/
        page.tsx               # Production task list (standalone + linked)
      calendar/
        page.tsx               # Monthly content calendar
      ideas/
        page.tsx               # Unscheduled idea bank & reference accounts
      settings/
        page.tsx               # Language, default platforms, content pillars
      auth/
        callback/route.ts      # Auth callback and cookie exchange
        signout/route.ts       # Secure session termination
    actions/
      content.ts               # Authenticated content mutations & transactional RPC
      tasks.ts                 # Authenticated task mutations
      reference-accounts.ts    # Authenticated reference account mutations
      auth.ts                  # Server action auth helpers
  components/
    common/                    # Shared buttons, dialogs, badges, icons
    planner/                   # PlannerTable, PlannerCards, PlannerView, RecordModal
    tasks/                     # TasksView, TaskModal, task filters
    ideas/                     # ReferenceAccountsView, idea capture
    shell/                     # AppShell, DesktopSidebar, MobileNav, MobileHeader
  context/
    LocaleContext.tsx          # Client-side translation and locale state
  messages/
    en.json                    # English dictionary (strict parity)
    th.json                    # Thai dictionary (strict parity)
  types/
    planner.ts                 # Domain models, enums, mutation payloads
  utils/
    errors.ts                  # Localized error code mapping
    supabase/
      client.ts                # Browser client
      server.ts                # SSR cookie-aware server client
      middleware.ts            # Route protection
    timezone.ts                # Asia/Bangkok date/time conversions
    validation.ts              # Strict server-side runtime validation schemas
supabase/
  migrations/
    20260914000000_create_mvp_schema.sql
    20260914000001_create_storage_and_user_trigger.sql
    20260914000002_add_workflow_tables.sql
  tests/
    database/
      rls.test.sql             # Executable pgTAP database security suite
scripts/
  import-data.mjs              # Safe, local-only, idempotent data importer
  parse-sources.py             # External Excel & CSV source parser
tests/
  run-tests.mjs                # Test orchestrator with forced-local Supabase stack
```

## Data model

### `user_preferences`

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `locale text not null default 'th'` with the `th|en` constraint (`locale in ('th', 'en')`)
- `timezone text not null default 'Asia/Bangkok'`
- `default_platforms text[] not null default '{}'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `content_pillars`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `name_en text not null`
- `name_th text not null`
- `color text not null`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Unique index: `(user_id, lower(name_en))` where appropriate.

### `content_items`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `title text not null`
- `source_number integer null`
- `objective text null`
- `platforms text[] not null default '{}'`
- `content_pillar_id uuid null references content_pillars(id) on delete set null`
- `format text null check (format is null or format in ('short', 'carousel', 'long', 'infographic', 'story', 'photo'))`
- `goal text null check (goal is null or goal in ('awareness', 'engagement', 'growth', 'leads', 'conversion'))`
- `status text not null default 'idea' check (status in ('idea', 'researching', 'scripting', 'recording', 'editing', 'reviewing', 'scheduled', 'published'))`
- `review_status text null check (review_status is null or review_status in ('in_process', 'revise', 'approved'))`
- `source_content_status text null`
- `progress smallint not null default 0 check (progress >= 0 and progress <= 100)`
- `publish_at timestamptz null`
- `publish_time_known boolean not null default true`
- `hook text null`
- `production_detail text null`
- `caption text null`
- `cta text null`
- `hashtags text[] not null default '{}'`
- `notes text null`
- `archived_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended indexes:
- unique `(user_id, source_number)` where `source_number is not null`
- `(user_id, publish_at)`
- `(user_id, status)`
- `(user_id, archived_at)`

### `content_links` (Sprint 1 Active Link Workspace)

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `content_item_id uuid not null`
- `link_type text not null check (link_type in ('idea_source', 'asset', 'published', 'note'))`
- `platform text null check (platform is null or platform in ('tiktok', 'instagram', 'youtube', 'facebook', 'x'))`
- `url text not null` (strictly validated HTTP/HTTPS)
- `label text null` (max 255 chars)
- `sort_order integer not null default 0` (0..10000)
- `created_at timestamptz not null default now()`

Constraint: `content_links_item_fk foreign key (content_item_id, user_id) references public.content_items (id, user_id) on delete cascade`.
RLS: Enabled, owner-scoped (`auth.uid() = user_id`).

### `content_media` (Dormant Sprint 2 Infrastructure)

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `content_item_id uuid not null references content_items(id) on delete cascade`
- `storage_path text not null`
- `media_type text not null check (media_type in ('image', 'video'))`
- `original_name text not null`
- `mime_type text not null`
- `size_bytes bigint not null`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`

*Note: Defined in `supabase/migrations/20260914000000_create_mvp_schema.sql` and preserved for architectural continuity, but intentionally unexposed in Sprint 1 client UI, actions, and routes.*

### `production_tasks`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `content_item_id uuid null`
- `title text not null`
- `status text not null check (status in ('not_started', 'in_progress', 'done'))`
- `due_date date null`
- `priority text null check (priority is null or priority in ('low', 'medium', 'high'))`
- `task_type text null check (task_type is null or task_type in ('video', 'photo', 'post', 'other'))`
- `description text null`
- `import_key text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraint: `production_tasks_item_fk foreign key (content_item_id, user_id) references public.content_items (id, user_id) on delete set null (content_item_id)`.
RLS: Enabled, owner-scoped (`auth.uid() = user_id`).

### `reference_accounts`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `platform text not null`
- `account_label text not null`
- `url text not null`
- `notes text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

RLS: Enabled, owner-scoped (`auth.uid() = user_id`).

## Modeling decisions

- **Link-only Sprint 1 MVP**: Asset storage and reference in Sprint 1 rely completely on `content_links` (Google Drive links, asset folders, external references, published URLs). Direct media uploads, signed viewing URLs, and storage quotas are deferred to Sprint 2.
- **Dormant media schema**: The `public.content_media` table (defined in `supabase/migrations/20260914000000_create_mvp_schema.sql`) and the `content-media` private storage bucket (defined in `supabase/migrations/20260914000001_create_storage_and_user_trigger.sql`) are retained as dormant Sprint 2 infrastructure and are not exposed in Sprint 1.
- **Link security & privacy**: External links are never scraped, downloaded, or embedded via third-party iframes in Sprint 1. Link cards show sanitized domain names, labels, and platform badges, opening securely via `target="_blank" rel="noopener noreferrer"`.
- **Text post preview**: Platform-neutral client-side preview rendering hook, caption, CTA, and hashtags.
- **Unsaved changes protection**: The editor tracks dirty state against initial record values, prompting a confirmation dialog on modal dismissal or browser navigation (`beforeunload`).
- **One-way migration**: Existing Excel and Notion data is imported once through the local, dry-run audited workflow in `DATA_IMPORT_PLAN.md`; ongoing bi-directional sync is not part of Sprint 1.

## Authentication and authorization

- Use Supabase passwordless email login.
- Create the owner's account, then disable public sign-up in production.
- Protect authenticated routes at the server boundary via Next.js Proxy/Middleware (`src/proxy.ts` / `src/middleware.ts`).
- Verify `ALLOWED_EMAIL` as an application-level guard.
- Every table has RLS enabled with policy `auth.uid() = user_id`.
- The transactional function `public.upsert_content_item_with_links` has execute revoked from `PUBLIC` and `anon`, granted strictly to `authenticated`.

## Media storage policy (Sprint 1 vs Sprint 2)

- **Sprint 1**: Direct file uploads are disabled. No upload UI, signed URL generators, or large-file streaming endpoints are mounted.
- **Sprint 2 Infrastructure**: The private Supabase Storage bucket `content-media` and its access policies (defined in `supabase/migrations/20260914000001_create_storage_and_user_trigger.sql`) are retained with owner-only RLS policies. The bucket was provisioned and verified in Milestone 2 on hosted Supabase, but will remain unexposed until activated in Sprint 2 alongside resumable uploads and storage quota management.

## Localization architecture

- Dictionaries reside in `src/messages/en.json` and `src/messages/th.json` with 100% key parity enforced by automated scanner tests.
- Dates and times are converted explicitly between UTC and `Asia/Bangkok` via `src/utils/timezone.ts`.
- Server errors are returned as stable error codes (`src/utils/errors.ts`) and translated through `getLocalizedErrorMessage`.

## Sprint 2 Backlog Architecture

1. **Private Media Upload Pipeline**:
   - TUS protocol integration for resumable uploads directly to Supabase Storage.
   - Client-side chunking, progress indicators, and cancel/retry support.
   - Configurable file type validation (JPEG, PNG, WebP, MP4, MOV) and size thresholds.
   - Temporary signed URL generator with short expiration for private media previews.
   - Tenant storage quota enforcement at the database and storage rule boundary.

2. **Commercial & Multi-User Architecture**:
   - Stripe customer, subscription, and webhook event handlers.
   - Multi-tenant workspace schema migration: introduce `workspaces`, `workspace_members`, and role-based access control (RBAC).
   - Public user registration, email verification, and onboarding state machine.

3. **Social Publishing Integrations**:
   - OAuth 2.0 token management service for TikTok, Meta (Instagram/Facebook), YouTube, and X.
   - Background job runner for scheduled automated publishing.
   - Webhook listeners for publishing confirmation and post analytics ingestion.
