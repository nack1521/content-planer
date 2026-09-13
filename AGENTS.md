# Content Planner Agent Instructions

This file defines the working agreement for every coding agent in this repository.

## Required reading order

Before changing code, read these files completely:

1. `AGENTS.md`
2. `PROJECT.md`
3. `ARCHITECTURE.md`
4. `TASKS.md`
5. `HANDOFF.md`

The reference video is `ref/Download.mp4`. It explains the product workflow, but it is not a pixel-perfect design specification. Do not modify or remove it.

## Agent workflow

- Implement only the first incomplete milestone in `TASKS.md`, unless the user explicitly names another milestone.
- Do not begin a second milestone in the same implementation cycle.
- Do not add features listed under non-goals in `PROJECT.md`.
- Preserve existing user changes and avoid broad rewrites unrelated to the active milestone.
- If a requirement is unclear, choose the smallest reversible implementation and record the assumption in `HANDOFF.md`.
- At the end of a cycle, update `TASKS.md` and replace the working section of `HANDOFF.md` with the result.
- Stop after the handoff so a reviewer can inspect the actual diff.

## Product constraints

- This is a private, personal-use content planner.
- The interface must support both Thai and English.
- The product plans content; it does not publish to social networks.
- The primary screen is the working planner, not a marketing landing page.
- Desktop uses a compact planning table. Mobile uses readable cards or a similarly touch-friendly layout.
- Dates are displayed in the `Asia/Bangkok` timezone. Persist absolute timestamps consistently.

## Technology constraints

- Use Next.js App Router with TypeScript.
- Use Tailwind CSS for styling.
- Use Supabase for Postgres, authentication, and private media storage.
- Deploy with Vercel.
- Use `npm` and preserve `package-lock.json` after the application is scaffolded.
- Do not introduce a second database, authentication provider, CSS framework, state-management library, or component library without an approved architecture change.
- Prefer server components for initial reads and small client components only where interaction requires them.
- Keep database changes in versioned Supabase SQL migrations.

## Security requirements

- Never commit `.env`, `.env.local`, access tokens, private keys, passwords, or Supabase secrets.
- A browser may receive only the Supabase URL and publishable key.
- Never expose a Supabase service-role key to client code. The MVP should not need one.
- Enable Row Level Security on every exposed table.
- Every user-owned row must contain `user_id`, and policies must restrict access to `auth.uid() = user_id`.
- Use a private Supabase Storage bucket and owner-scoped policies for uploaded media.
- Authentication must protect all application routes except the login and authentication callback routes.
- The production Supabase project should contain the owner's account only, with public sign-up disabled after that account is created.

## Localization requirements

- Do not hardcode user-facing text directly inside reusable components.
- Keep complete `th` and `en` message sets with matching keys.
- The language switch must not discard unsaved work or unexpectedly change the current view.
- Use Thai-friendly typography and verify labels remain readable when Thai text is longer than English.
- Content written by the user is never automatically translated.

## Interface quality

- Use semantic HTML, visible keyboard focus, labeled controls, and sufficient contrast.
- Body text should normally be at least 16px; frequently used labels should normally be at least 14px.
- Avoid horizontal page scrolling at mobile widths.
- Use icons only when their meaning is clear, and pair ambiguous icons with accessible labels.
- Include useful loading, empty, error, and success states for completed functionality.
- Use realistic content-planning examples instead of generic dashboard filler.

## Validation and handoff

After the app has been scaffolded, run before every handoff:

1. `npm run lint`
2. `npm run build`
3. Any milestone-specific tests listed in `TASKS.md`

Do not mark a milestone complete when a required check fails. Record the exact failure and the attempted fix in `HANDOFF.md`.

The handoff must include:

- milestone attempted and completion status;
- summary of implemented behavior;
- files changed;
- checks run and their results;
- assumptions or deviations;
- unresolved risks or blockers;
- manual verification steps for the reviewer.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
