# Content Planner

A private, bilingual content-planning workspace for organizing content from idea to publication. It replaces the project's spreadsheet and Notion workflow with one responsive web application while keeping every account's planner separate.

**Live website:** [content-planner-zeta-dusky.vercel.app](https://content-planner-zeta-dusky.vercel.app)

## Product status

Sprint 1 is live on Vercel. The current release focuses on planning and tracking content through external links; it does not upload large media files or publish directly to social networks.

The latest verified application release is **`25e9366`** (CP-RELEASE-02). The owner reported **PASS for desktop UAT cases 1–4**: sidebar placement, checkbox spacing, task-row/control actions, and text selection/keyboard entry. This is scoped owner acceptance, not a claim that every mobile, authentication, or RLS case has been independently tested. See the [release receipt](docs/handoffs/CP-RELEASE-02-RECEIPT.md) and [desktop UAT acceptance](docs/handoffs/CP-RELEASE-02-UAT.md).

The interface is designed as a practical creator workspace:

- warm cream/paper surfaces, muted rose accents, and readable dark warm text;
- a viewport-height desktop sidebar with language, timezone, and sign-out controls kept at the bottom, and a scrollable middle navigation area for short windows;
- compact, sortable desktop tables;
- readable mobile cards and touch-friendly controls;
- complete Thai and English interfaces;
- dates and schedules displayed in the `Asia/Bangkok` timezone;
- route-level loading states and per-menu pending feedback during navigation.

Initial server reads reuse an authentication context within a request; this is not a shared cross-account data cache or a measured hosted-speed guarantee.

## Current features

### Planner

- Create, edit, duplicate, archive, restore, and permanently delete content records.
- Track objective, platforms, content pillar, format, goal, production status, progress, and publishing date.
- Clear a scheduled publication date back to an unset value in the shared content editor.
- Store hook, production detail, caption, call to action, hashtags, and notes.
- Search and filter the content library.
- Sort by clicking any of the seven desktop table headings.
- Browse 25 records per page with pagination.
- Use an equivalent mobile card view with mobile sorting controls.

### Links and writing workspace

- Save external idea sources, asset links, notes, and published-post links.
- Validate URLs before saving without scraping or embedding third-party content.
- Preview and copy reusable writing fields.
- Receive protection against accidentally leaving an editor with unsaved changes.

### Production tasks

- Create standalone tasks or connect tasks to a content record.
- Edit status, priority, type, due date, description, and completion state.
- Search and filter the task list.
- Sort by clicking any of the six desktop table headings.
- Browse 25 tasks per page, with equivalent mobile sorting and pagination.
- Click non-interactive space across a desktop task row to edit that task; the native title button remains available for keyboard access.
- Toggle completion independently with the checkbox, or open the linked content independently without also opening task editing.
- Select and copy row text without opening an editor.
- Keep descriptions in the last desktop column, limited to two lines, with a fixed-fit table and mobile cards below the table breakpoint.

### Calendar, ideas, and settings

- Review scheduled content in a monthly calendar, including a mobile month grid and selected-day agenda.
- Capture ideas quickly and maintain reference accounts.
- Switch between Thai and English without losing the current view.
- Manage default platforms, content pillars, and timezone display preferences.

### Authentication and privacy

- Existing approved accounts can sign in with email and password.
- Magic-link login remains available as a fallback.
- Public sign-up is disabled; access is restricted by the server-side email allowlist.
- Supabase Row Level Security isolates every account's planner, tasks, links, ideas, and settings.

## Scope boundaries

The current Sprint 1 release intentionally does **not** include:

- direct image or video uploads;
- automatic posting to social networks;
- subscription billing;
- shared team workspaces;
- public account registration;
- AI content generation;
- ongoing synchronization with Excel or Notion.

Private media storage, subscription access, and other larger capabilities belong to later sprints. The repository includes controlled one-time import tooling for the original Excel and Notion-export data, but the private source files and credentials are not committed.

## Technology

- [Next.js 16](https://nextjs.org/) App Router
- React 19 and strict TypeScript
- Tailwind CSS 4
- Supabase Postgres, Authentication, and Row Level Security
- Vercel hosting
- npm with a committed lockfile

## Application routes

| Route | Purpose |
| --- | --- |
| `/{locale}/login` | Password and magic-link sign-in |
| `/{locale}/planner` | Main content workspace |
| `/{locale}/tasks` | Production task manager |
| `/{locale}/calendar` | Monthly publishing calendar |
| `/{locale}/ideas` | Idea bank and reference accounts |
| `/{locale}/settings` | Language, platforms, pillars, and account settings |
| `/{locale}/auth/callback` | Supabase authentication callback |
| `/{locale}/auth/signout` | Secure sign-out endpoint |

Supported locale prefixes are `th` and `en`.

## Local development

### 1. Install dependencies

Use a current Node.js release compatible with Next.js 16, then install the locked dependencies:

```bash
npm ci
```

### 2. Configure the environment

Copy `.env.example` to `.env.local` and set:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
ALLOWED_EMAILS=owner@example.com,second-owner@example.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`ALLOWED_EMAILS` is comma-separated. `ALLOWED_EMAIL` remains supported only as a legacy single-account fallback. Never expose or commit a Supabase service-role key, database password, access token, or `.env.local` file.

### 3. Prepare Supabase

The versioned schema is in [`supabase/migrations`](supabase/migrations). Apply the migrations in filename order to a new Supabase project, create the approved users, and keep public sign-up disabled.

For the existing hosted project, migration `20260914000003_add_controlled_batch_import.sql` was applied through the Supabase SQL Editor. Reconcile the hosted migration history before using an automated `supabase db push`; do not blindly reapply production migrations.

Configure Supabase Authentication URLs for both local development and the deployed Vercel domain so sign-in callbacks return to the correct website.

### 4. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

For routine source/build checks:

```bash
npx --no-install tsc --noEmit
npm run lint
NEXT_TELEMETRY_DISABLED=1 npm run build
node --loader ./tests/test-loader.mjs --test tests/desktop-ux.test.mjs tests/task-list.test.mjs tests/task-content-search.test.mjs tests/accessibility.test.mjs
```

The desktop suite mixes static assertions and a handwritten event-logic mirror; it is **not** mounted/browser or actual-handler proof. The primary review separately exercised the exact production handler in a bounded synthetic probe; see [CP-DESKTOP-01 review](docs/handoffs/CP-DESKTOP-01-output/REVIEW.md) for its evidence and limits.

`npm test` is an opt-in full suite, not a default smoke test. It requires Docker and the Supabase CLI and resets an isolated local Supabase stack. Inspect its current hooks, local database target, and authentication/private-data effects before running; do not point destructive tests at the hosted project. Builds may automatically load `.env.local`; keep environment values and logs private.

## Deployment

The production application is hosted by Vercel and uses the hosted Supabase project for authentication and data. Configure the same public Supabase values and allowlisted emails in the Vercel project's environment settings, set `NEXT_PUBLIC_SITE_URL` to the production domain, then create a Vercel deployment.

Pushing to GitHub updates the source repository. A Vercel deployment happens automatically only when Git integration is enabled for the Vercel project; otherwise deploy through the configured Vercel project separately.

## Project documentation

- [Verified application release](docs/handoffs/CP-RELEASE-02-RECEIPT.md) — deployed version, verification, and rollback
- [Desktop UAT acceptance](docs/handoffs/CP-RELEASE-02-UAT.md) — owner-reported cases and acceptance limits
- [`PROJECT.md`](PROJECT.md) — product scope and decisions
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — application and data architecture
- [`TASKS.md`](TASKS.md) — milestone history and remaining work
- [`HANDOFF.md`](HANDOFF.md) — latest implementation and deployment notes
- [`DATA_IMPORT_PLAN.md`](DATA_IMPORT_PLAN.md) — controlled legacy-data import process
- [`AGENTS.md`](AGENTS.md) — repository rules for coding agents

## Security notes

- Browser code receives only the Supabase URL and publishable key.
- Every exposed user-owned table uses Row Level Security with owner-scoped policies.
- Authentication protects all application pages except the login and callback flow.
- Private credentials and original import files remain outside version control.
- Local development tracing may record Server Action arguments, including password inputs. Avoid real-account password login testing on the development server until tracing has been checked; never share passwords or credential-bearing logs in chat or commits.
- External links are stored as references; the application does not fetch or execute their contents.

## Repository

[github.com/nack1521/content-planer](https://github.com/nack1521/content-planer)

This project is currently maintained for private personal use.
