# Content Planner

Content Planner is a private bilingual workspace for planning social content from the first idea through publication. It transforms spreadsheet workflows into a focused, responsive creator-studio control board.

## Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase (PostgreSQL + SSR Auth + Private Storage)
- **Deployment**: Vercel
- **Localization**: Bilingual Thai (`th`) and English (`en`) with zero-reload switching
- **Timezone**: Asia/Bangkok (`UTC+7`)

## Features

### Milestone 1 — Application Foundation and Planner Slice
- **AppShell**: Deep graphite desktop side navigation and mobile navigation with responsive layout.
- **Production Overview**: KPIs for planned today, planned this month, in-production stages, and published records.
- **Workflow Pipeline Breakdown**: Stage indicators for the 8 fixed workflow statuses (`idea`, `researching`, `scripting`, `recording`, `editing`, `reviewing`, `scheduled`, `published`).
- **Controlled Filters & Search**: Search across titles, hooks, captions, and hashtags, plus filters for platform, status, content pillar, format, and goal.
- **Dual Presentation**:
  - Desktop: Compact, scannable table at 1440px wide.
  - Mobile: Touch-friendly cards designed to fit 390px widths with no horizontal scroll.
- **Bilingual Message Dictionaries**: 100% key parity across `messages/th.json` and `messages/en.json`.
- **Bangkok Timezone Handling**: Localized date and time formatting in `Asia/Bangkok`.
- **Loading & Empty States**: Built-in skeletons and empty filter state with reset actions.

### Milestone 2 — Supabase Schema and Private Authentication
- **Private Single-Owner Authentication**: Passwordless magic link email authentication restricted strictly to the configured `ALLOWED_EMAIL`.
- **User Enumeration Defense**: Any unauthorized email entering the login flow receives an identical neutral success confirmation without contacting Supabase or exposing registration state.
- **Strict Row Level Security (RLS)**:
  - Enabled on all tables: `user_preferences`, `content_pillars`, `content_items`, `content_media`.
  - All policies scoped to `auth.uid() = user_id`.
  - `content_media` validates foreign relation ownership against `content_items`.
- **Private Storage Bucket**:
  - `content-media` bucket configured with `public = false`.
  - Storage objects partitioned by owner folder: `auth.uid()::text = (storage.foldername(name))[1]`.
- **Automated Profile Provisioning**: `on_auth_user_created` trigger automatically provisions `user_preferences` with `th` locale and `Asia/Bangkok` timezone on initial sign-in.
- **SSR Session Middleware**: Protects application routes (`/th/planner`, `/en/planner`, `/th/calendar`, `/th/ideas`, `/th/settings`) by redirecting unauthenticated visitors to `/{locale}/login`.

## Getting Started

### Prerequisites

- Node.js 18+ (tested on Node.js v26)
- npm
- Supabase project

### Installation

```bash
npm install
```

### Environment Configuration

Copy `.env.example` to `.env.local` and populate the values:

```bash
cp .env.example .env.local
```

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL (`https://<project-ref>.supabase.co`).
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase publishable/anon key.
- `ALLOWED_EMAIL`: The exact authorized owner email address (e.g. `owner@example.com`).

> **Security Note**: Never commit `.env.local` or disclose publishable keys or private owner emails. No service-role key is required or permitted in application code.

### Owner Account Provisioning & Disabling Public Sign-ups

1. **Initial Owner Sign-in**:
   - Ensure `ALLOWED_EMAIL` in `.env.local` is set to the owner's email address.
   - Start the development server (`npm run dev`) and navigate to `http://localhost:3000/th/login`.
   - Submit the owner email to receive a passwordless magic link.
   - Clicking the magic link triggers `/auth/callback`, establishing the authenticated session and triggering the `on_auth_user_created` profile provisioner.
2. **Disabling Public Sign-ups**:
   - Application-level defense: Non-matching email addresses are rejected at the server boundary (`sendMagicLinkAction` and `/auth/callback`) without triggering Supabase OTP emails or creating accounts.
   - Supabase project settings: In the Supabase Dashboard under **Authentication -> Configuration -> User Signups**, toggle off **"Allow new users to sign up"** once the owner account is verified.

### Running Migrations

Database migrations are located in `supabase/migrations/`:
- `20260914000000_create_mvp_schema.sql`: MVP tables, constraints, updated_at triggers, indexes, and RLS policies.
- `20260914000001_create_storage_and_user_trigger.sql`: Private storage bucket, storage policies, and auto-provisioning trigger.

Apply them via the Supabase CLI:
```bash
npx supabase db push
```
Or execute the SQL scripts in the Supabase Dashboard SQL Editor.

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Unauthenticated requests will redirect to `/{locale}/login`.

### Verification & Quality Checks

Run before committing or handoff:

```bash
git diff --check
npm run lint
npm test
npm run build
```

## Route Map

- `/`: Redirects to saved locale destination (`/{locale}/planner`)
- `/{locale}/login`: Responsive bilingual passwordless email login
- `/{locale}/auth/callback`: Server route exchanging auth code for session
- `/{locale}/auth/signout`: Sign-out handler clearing session cookies
- `/{locale}/planner`: Core planner surface (protected)
- `/{locale}/calendar`: Scheduled calendar view (protected, Milestone 5)
- `/{locale}/ideas`: Idea bank quick capture (protected, Milestone 5)
- `/{locale}/settings`: Workspace and language preferences (protected, Milestone 6)

## License

Private personal use.
