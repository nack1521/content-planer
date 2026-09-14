# Content Planner Handoff — Sprint 1 Link-Only MVP Roadmap

## Current Status Overview

- **Current Milestone**: Milestone 3 **Accepted** by Codex on 2026-09-14.
- **Next Milestone**: Milestone 4 **Ready for assignment** (do not implement yet).
- **Scope Alignment**: Sprint 1 is scoped to a complete seven-milestone private MVP for one owner, operating as a **link-only workspace** for external URLs (idea sources, assets, notes, and published posts).
- **Infrastructure Status**: The existing `content_media` table, private `content-media` Supabase Storage bucket, and security policies are preserved as **dormant Sprint 2 infrastructure**; they are not exposed in the Sprint 1 user interface.
- **Hosted Supabase Status**: Clean. No hosted migrations or hosted imports have been performed. All development and testing remain strictly isolated to the local Supabase stack (`127.0.0.1:54321`).

---

## Sprint 1 Roadmap

1. **Milestone 1 — Foundation and responsive design**
   - **Status**: Accepted
   - Application shell, responsive grid, visual tokens, mock data, and base bilingual routing.
2. **Milestone 2 — Supabase database, passwordless owner authentication, and security**
   - **Status**: Accepted
   - Initial database schema, RLS, passwordless magic-link authentication, owner isolation, settings preferences.
3. **Milestone 3 — Planner persistence, tasks, Excel/Notion replacement workflow, and external links**
   - **Status**: Accepted by Codex on 2026-09-14
   - Workflow-aligned schema, server actions with runtime validation, atomic RPC (`upsert_content_item_with_links`), production tasks page, reference accounts, and idempotent dry-run importer CLI.
   - Verification evidence: 143/143 automated checks passing, 85/85 pgTAP database checks passing, clean build, clean lint.
4. **Milestone 4 — Content editor, link workspace, text post preview, copy controls, and unsaved-change protection**
   - **Status**: Ready for assignment
   - Polish existing editor modal, full external link CRUD, safe link cards, platform-neutral text post preview, one-click copy buttons, and unsaved-changes dirty protection.
5. **Milestone 5 — Calendar and idea bank**
   - **Status**: Planned (Blocked by Milestone 4)
   - Monthly calendar of scheduled content, quick-capture idea bank, status promotion workflow.
6. **Milestone 6 — Bilingual completion, responsive QA, and release quality**
   - **Status**: Planned (Blocked by Milestone 5)
   - 100% Thai/English parity, keyboard accessibility, mobile/desktop edge case review, zero console/lint errors.
7. **Milestone 7 — Vercel release and hosted Supabase setup**
   - **Status**: Planned (Blocked by Milestone 6 and deployment access)
   - Production deployment on Vercel, migration application to hosted Supabase, production dry-run data import, live smoke test.

---

## Revised Milestone 4 Scope and Requirements

When Milestone 4 is assigned, the implementation must adhere to the following specifications:

### 1. Preserve & Polish Existing Editor
- Preserve all existing form fields (title, status, publication date/time, content pillar, platforms, format, goal, main message/hook, production notes, caption, hashtags, call-to-action).
- Do not rebuild or discard working components. Maintain existing accessibility and styling.

### 2. External Link Workspace (CRUD)
- Support external links for:
  - `idea_source`: Inspiration, reference articles, competitor links.
  - `asset`: Google Drive, Dropbox, Figma, Canva, or cloud asset folder links.
  - `note`: Research documents, production briefs, script docs.
  - `published`: Live social post links once published (TikTok, IG, YouTube, Facebook, X).
- Attributes: URL, label, link type, optional platform (`tiktok`, `instagram`, `youtube`, `facebook`, `x`), sort order.
- Validate HTTP and HTTPS URLs strictly on client and server.
- Safe link cards:
  - Display label, platform badge, sanitized domain name.
  - Controls: Copy URL, Open link, Reorder (move up/down), and Remove link.
  - Open external links safely in a new tab with `target="_blank" rel="noopener noreferrer"`.
- **Zero remote fetching rule**: Do not fetch remote pages, scrape OpenGraph metadata, download files, generate thumbnails, or embed third-party iframes in Sprint 1.

### 3. Platform-Neutral Text Post Preview
- Clean, readable text preview rendering the core copy elements:
  - Hook (main message)
  - Caption (preserving line breaks)
  - Call to action (CTA)
  - Hashtags (formatted and tagged)

### 4. Copy Controls & Feedback
- One-click copy buttons for:
  - Caption
  - Call to Action
  - Hashtags
  - Individual link URLs
- Accessible visual and auditory/toast feedback on success and failure with full Thai and English localization.

### 5. Unsaved-Change Protection
- Track form dirty state against initial database record values.
- Warn with confirmation dialog before closing the modal or discarding changes.
- Intercept window navigation (`beforeunload`) when unsaved changes exist.

### 6. Verification & Standards
- Preserve responsive desktop side-sheet and mobile full-screen layouts.
- Full keyboard navigation and ARIA accessibility.
- Equal coverage for Thai and English.
- Unit and integration tests covering URL validation, link ordering, text preview rendering, copy feedback, and dirty state detection.
- Stop for Codex review upon completion.

---

## Explicitly Removed from Sprint 1 (Deferred to Sprint 2)

The following items are strictly out of scope for Sprint 1:
- Image/video file upload UI.
- Signed upload URLs and private media-viewing URLs.
- Large-file streaming or resumable file upload handlers.
- Media ordering, preview carousels, and file removal.
- Subscription, pricing, or billing functionality (e.g., Stripe).
- Public user registration or sign-up workflows.
- Automatic publishing to social media APIs.
- Social metrics or engagement analytics scraping.

---

## Dormant Infrastructure Notice

- Database table `public.content_media` remains defined in migration `20260912000001_initial_schema.sql` with owner RLS policies intact.
- Storage bucket `content-media` remains configured with private owner access.
- Neither the table nor the bucket is dropped or modified. They are retained as **dormant Sprint 2 infrastructure** and must not be exposed in the Sprint 1 application interface or server actions.

---

## Sprint 2 Backlog (Deferred Capabilities)

1. **Private Media Upload Pipeline**:
   - Direct file upload UI for images and videos attached to content items.
   - Resumable large-file uploads using chunking / TUS protocol.
   - Client and server-side file type (JPEG, PNG, WebP, MP4, MOV) and size limit enforcement.
   - Temporary signed viewing URLs generated on demand with short expiration.
   - Visual media gallery, reordering, and deletion controls.
   - Storage quotas and account usage monitoring.
2. **Commercial & Multi-User SaaS Capabilities**:
   - Public user registration, email verification, and onboarding flow.
   - Stripe integration for subscriptions, tier management, customer portal, and webhooks.
   - Multi-tenant workspace architecture (`workspaces`, `workspace_members`).
   - Role-based access control (Admin, Creator, Editor, Viewer).
3. **Platform Automations & Integrations**:
   - Direct social publishing integrations via official platform APIs (TikTok, Meta, YouTube, X).
   - Post performance metrics and analytics ingestion.

---

## Verification Evidence (Current Milestone 3 Baseline)

- **Automated Test Suite**: 143/143 tests passing (`npm test`).
- **pgTAP Database Tests**: 85/85 assertions passing (`npm run test:db`).
- **Production Build**: 17/17 routes compiled cleanly with Turbopack (`npm run build`).
- **ESLint**: 0 errors, 0 warnings (`npm run lint`).
- **Code Formatting / Diffs**: Clean, no whitespace errors (`git diff --check`).
- **Database Status**: Local stack running and verified; zero hosted modifications.
