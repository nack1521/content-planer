# Implementation Handoff

This file is replaced or updated at the end of each implementation cycle. Do not include credentials, tokens, private URLs, database passwords, or personal content.

## Current assignment

- Milestone: 2 — Supabase schema and private authentication
- Status: Ready for Antigravity implementation
- Reviewer: Codex

## Confirmed prerequisites

- Milestone 1 was accepted by Codex on 2026-09-14.
- The Supabase project is healthy.
- Supabase Authentication Site URL is `http://localhost:3000`.
- The allowed local redirect pattern is `http://localhost:3000/**`.
- The ignored `.env.local` file exists and has non-empty values for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `ALLOWED_EMAIL`.
- Never print, copy, commit, or reproduce those values in source files, command output, screenshots, tests, or this handoff.

## Instructions for Antigravity

Read `AGENTS.md`, `PROJECT.md`, `ARCHITECTURE.md`, `TASKS.md`, and this file completely before changing anything.

Implement only Milestone 2 from `TASKS.md`. Do not begin planner persistence, CRUD, the editor, media uploads, calendar functionality, social publishing, or any later milestone.

### Required implementation

1. Add `.env.example` with variable names only, matching `ARCHITECTURE.md`.
2. Install the supported Supabase packages and implement separate browser and server clients with cookie-based SSR session handling compatible with this repository's installed Next.js version.
3. Add the authentication session-refresh boundary required by the current Next.js and Supabase SSR APIs.
4. Create versioned SQL migrations for every MVP table, enum or constrained value, relationship, index, timestamp trigger, and Row Level Security policy specified in `ARCHITECTURE.md`.
5. Create the private media bucket and owner-scoped Storage policies in migrations. Do not make media public.
6. Implement bilingual passwordless email login, callback handling, logout, and protected application routes.
7. Restrict login to the exact server-side `ALLOWED_EMAIL` value. Normalize email comparison safely and show a neutral response that does not disclose whether another email is registered.
8. Keep the owner account creation flow compatible with disabling new-user signup after the owner exists. Do not add public registration UI.
9. Persist and read the owner's locale and `Asia/Bangkok` timezone preference without beginning general planner CRUD.
10. Add focused automated tests for route protection, allowed-email validation, migration security invariants, translation parity, and any pure authentication helpers.

### Security boundaries

- Use only the Project URL and publishable key in browser-reachable code.
- Do not request, use, or add a service-role or secret key; this milestone should not need one.
- Every exposed application table must have RLS enabled and owner policies based on `auth.uid() = user_id`.
- Do not trust browser-provided email or user IDs for authorization.
- Do not weaken route protection or RLS to make tests pass.
- Never run destructive reset commands against the hosted project.
- If applying migrations requires Supabase CLI authentication or a database password that is not already available securely, stop and record the exact user action needed. Never ask for a credential to be pasted into chat or committed to the repository.

### Verification required before handoff

1. Run `git diff --check`.
2. Run `npm run lint`.
3. Run the complete test suite.
4. Run `npm run build`.
5. Verify an unauthenticated visit to both `/th/planner` and `/en/planner` redirects to the matching localized login page.
6. Verify the allowed owner email can request a magic link without exposing account existence.
7. Verify a different email cannot create or access an application account through the UI.
8. Verify the callback establishes a cookie-based session and returns to the intended safe local route.
9. Verify logout clears access and protected routes redirect again.
10. If migrations are applied, verify anonymous access and cross-user reads/writes are rejected for every user-owned table and private Storage path.

Update `TASKS.md` honestly and replace the result section of this handoff with changed files, exact checks, assumptions, and unresolved blockers. Stop for Codex database and security review. Do not start Milestone 3.

## Previous review

Milestone 1 was accepted in commit `23588a6` after lint, build, five live tests, localized route checks, and visual verification at 1440×900 and 390×844.
