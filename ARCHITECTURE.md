# Content Planner Architecture

## System overview

Content Planner is a Next.js application deployed on Vercel. Supabase provides authentication, Postgres data storage, and private file storage.

```text
Browser
  -> Vercel / Next.js
      -> Supabase Auth
      -> Supabase Postgres (RLS protected)
      -> Supabase Storage (private, RLS protected)
```

## Application stack

- Next.js App Router
- TypeScript with strict mode
- React
- Tailwind CSS
- Accessible UI primitives compatible with the project's chosen starter
- Supabase JavaScript client and Supabase SSR helpers
- Vercel deployments
- npm package management

Use the current stable package versions selected by the official project generators. Do not pin speculative framework versions in planning documents.

## Route map

```text
/
  -> redirect to the saved locale and authenticated destination

/{locale}/login
/{locale}/auth/callback
/{locale}/planner
/{locale}/tasks
/{locale}/calendar
/{locale}/ideas
/{locale}/settings
```

Supported locales are `en` and `th`. Protected routes require an authenticated owner. The default authenticated destination is `/{locale}/planner`.

## UI composition

- `AppShell`: responsive navigation, locale switch, owner menu.
- `PlannerSummary`: today/month counts and workflow overview.
- `PlannerFilters`: search and controlled filters.
- `PlannerTable`: desktop record view.
- `PlannerCards`: mobile record view.
- `TaskList`: personal production tasks with optional content relationships.
- `ContentEditor`: sheet on desktop, full-screen presentation on mobile.
- `ContentPreview`: selected content and media preview.
- `CalendarView`: month grid with scheduled records.
- `IdeaBank`: quick capture and unscheduled ideas.
- `Settings`: language, platforms, and content pillars.

Components should consume localized labels from shared message files rather than embedding visible strings.

## Data model

### `user_preferences`

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `locale text not null default 'th'` with `th|en` constraint
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
- `format text null`
- `goal text null`
- `status text not null default 'idea'`
- `review_status text null`
- `source_content_status text null`
- `progress smallint not null default 0` with range constraint `0..100`
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

Allowed status values:

`idea`, `researching`, `scripting`, `recording`, `editing`, `reviewing`, `scheduled`, `published`

Recommended indexes:

- unique `(user_id, source_number)` where `source_number is not null`
- `(user_id, publish_at)`
- `(user_id, status)`
- `(user_id, archived_at)`

### `content_media`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `content_item_id uuid not null references content_items(id) on delete cascade`
- `storage_path text not null`
- `media_type text not null` with `image|video` constraint
- `original_name text not null`
- `mime_type text not null`
- `size_bytes bigint not null`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`

### `content_links`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `content_item_id uuid not null`
- `link_type text not null` with `idea_source|asset|published|note` constraint
- `platform text null` using the centralized platform values
- `url text not null`
- `label text null`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`

Use a same-owner composite foreign key to `content_items`. Enable owner-scoped RLS and explicit grants.

### `production_tasks`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `content_item_id uuid null`
- `title text not null`
- `status text not null` with `not_started|in_progress|done` constraint
- `due_date date null`
- `priority text null` with `low|medium|high` constraint
- `task_type text null` with `video|photo|post|other` constraint
- `description text null`
- `import_key text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Use a same-owner optional composite foreign key to `content_items`, a per-owner partial unique index for `import_key`, owner-scoped RLS, and explicit grants.

### `reference_accounts`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `platform text not null`
- `account_label text not null`
- `url text not null`
- `notes text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Use a per-owner URL uniqueness rule, owner-scoped RLS, and explicit grants.

## Modeling decisions

- The idea bank uses `content_items` with status `idea`; it does not need a separate ideas table.
- `publish_at` is nullable because early ideas may be unscheduled.
- Platforms and hashtags are arrays in the MVP because they are user-owned labels without independent behavior.
- Workflow statuses are fixed application constants for the MVP.
- Archiving is reversible. Permanent deletion is a separate confirmed action.
- Production tasks are separate records because one content item can require multiple actions and standalone work is valid.
- External links are separate from private uploaded media and are never fetched or copied automatically.
- The source number is a migration reference, not the database primary key.
- Existing Excel and Notion data is imported once through the reviewed dry-run workflow in `DATA_IMPORT_PLAN.md`; ongoing external synchronization is not part of the MVP.

## Authentication and authorization

- Use Supabase passwordless email login.
- Create the owner's account, then disable public sign-up in production.
- Protect authenticated routes at the server boundary.
- Optionally verify `ALLOWED_EMAIL` as an additional application-level restriction.
- Never rely on a hidden URL as access control.

Every exposed table must have RLS enabled. The required policy shape for CRUD operations is:

```sql
auth.uid() = user_id
```

Foreign relationships must also be validated. For example, an inserted media row must reference a content item belonging to the authenticated user.

Do not use a service-role key in the MVP. If a future server-only feature genuinely requires it, document the threat model and keep the key in server-only Vercel environment variables.

## Media storage

- Bucket name: `content-media`.
- Bucket visibility: private.
- Object path: `{user_id}/{content_item_id}/{generated-file-name}`.
- Restrict select, insert, update, and delete operations to the authenticated owner.
- Validate MIME type and file size before upload.
- Use signed URLs for temporary previews.
- Initial suggested limits: images up to 10 MB and videos up to 100 MB. Keep these configurable.

## Data access

- Use Supabase SSR helpers for cookie-based sessions.
- Prefer server-side reads for initial route data.
- Use server actions or route handlers for validated mutations when practical.
- Client-side Supabase access is allowed only where it materially improves interaction and remains protected by RLS.
- Validate untrusted form data before sending it to Supabase.
- Do not add a separate ORM during the MVP.

## Localization

- Store translation files under a predictable structure such as `messages/en.json` and `messages/th.json`.
- Use locale-aware formatting for dates and times.
- Store `publish_at` as `timestamptz`; display it in Asia/Bangkok.
- Store the preferred locale in `user_preferences` and use a cookie for immediate routing.
- Keep database status values language-neutral and translate only their displayed labels.

## Environment variables

Create `.env.example` with names only:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
ALLOWED_EMAIL=
```

Rules:

- `.env.local` is ignored by Git.
- Use separate Supabase projects for preview and production when the project moves beyond early personal testing. Until then, avoid destructive preview migrations.
- Configure variables separately for Vercel Development, Preview, and Production.
- Never put credential values into documentation, commits, screenshots, or `HANDOFF.md`.

## Deployment model

- Source control uses Git with `main` as the production branch.
- Feature work occurs on a short-lived branch or in a clean reviewed change set.
- Vercel Preview deployments are used for milestone review.
- Production deploys only after the active milestone is accepted and the build passes.
- Supabase migrations are reviewed before applying them to production.
- Database and application deployment steps must be recorded in `HANDOFF.md` without recording secrets.

## Future-compatible boundaries

Automatic social publishing, teams, analytics, AI generation, and custom workflows are intentionally excluded. Keep platform names and workflow logic centralized so these capabilities can be added later without designing them now.
