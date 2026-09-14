# Content Planner Product Brief

## Product summary

Content Planner is a private bilingual workspace for planning social content from the first idea through publication. It transforms the spreadsheet and Notion workflow in `ref/Download.mp4` into a focused, responsive web application.

The project roadmap is structured into two distinct release phases:
- **Sprint 1 (Milestones 1–7)**: Complete seven-milestone private MVP for one owner. It is a **link-only workspace** collecting external URLs (idea sources, assets, production notes, and published social posts). Direct media uploads, subscriptions, public sign-up, multi-user SaaS functionality, and automatic social publishing are deferred to Sprint 2.
- **Sprint 2 (Future Backlog)**: Private media uploads, resumable large-file uploads, storage quotas, subscriptions, public registration, multi-user SaaS workspaces, and optional social publishing integrations.

## Locked decisions (Sprint 1 MVP)

- Audience: one personal user (the owner).
- Languages: Thai and English, switchable inside the application.
- Hosting: Vercel.
- Backend: Supabase (PostgreSQL with Row Level Security).
- Timezone: Asia/Bangkok.
- Scope: content planning, production task management, and external link workspace.
- Media handling: **Link-only for Sprint 1**. Direct file/media uploads are deferred to Sprint 2. The existing `public.content_media` database table (defined in `supabase/migrations/20260914000000_create_mvp_schema.sql`) and private `content-media` storage bucket (defined in `supabase/migrations/20260914000001_create_storage_and_user_trigger.sql`) are preserved as dormant Sprint 2 infrastructure and not exposed in the Sprint 1 interface.
- Authentication: passwordless Supabase login for the owner; public sign-up disabled.
- Social publishing: excluded from Sprint 1.

## Primary user journey (Sprint 1)

1. Capture a content idea or import an existing numbered content record.
2. Add its objective, platforms, format, goal, main message (hook), production detail, caption, hashtags, and call to action.
3. Manage external link references (asset drive links, idea sources, references, notes, published posts) in the link workspace without fetching or embedding remote content.
4. Schedule a planned publication date and optional time.
5. Track personal review state and production tasks separately from the content lifecycle.
6. Review upcoming work in the planner, task list, or calendar.
7. Mark the item as published and attach published post URLs.

## Main navigation

- Planner / แผนคอนเทนต์
- Tasks / งานผลิต
- Calendar / ปฏิทิน
- Ideas / คลังไอเดีย
- Settings / ตั้งค่า

The default authenticated route opens the Planner.

## Sprint 1 MVP features

### Planner dashboard

- Summary of content planned today and this month.
- Counts for major workflow stages.
- Filters for platform, format, goal, pillar, and status.
- Search by title, hook, caption, or hashtag.
- Desktop table and mobile card presentation of the same records.

### Content records

Each record supports:

- an optional source number for migration and cross-reference;
- title or topic;
- objective in the owner's original wording;
- one or more target platforms (`tiktok`, `instagram`, `youtube`, `facebook`, `x`);
- content pillar;
- format (`short`, `carousel`, `long`, `infographic`, `story`, `photo`);
- goal (`awareness`, `engagement`, `growth`, `leads`, `conversion`);
- planned publication date and optional time (Asia/Bangkok);
- workflow status;
- personal review status (`in_process`, `revise`, `approved`);
- progress percentage (0–100);
- main message or hook;
- production detail;
- caption;
- call to action;
- hashtags;
- notes;
- external asset, idea-source, note, and published-platform links;
- *(direct image/video upload attachments are deferred to Sprint 2)*.

Users can create, edit, duplicate, archive, and delete a record. Destructive deletion requires confirmation.

### Production tasks

- Tasks are a first-class personal work list rather than being embedded into the content status.
- A task has a title, status (`not_started`, `in_progress`, `done`), due date, priority (`low`, `medium`, `high`), type (`video`, `photo`, `post`, `other`), and optional description.
- A task may link to one content record or remain standalone.
- Linked tasks are visible from both the Tasks view and the content editor.
- Initial task data can be imported once from the owner's Notion CSV export.

### Existing-data migration

- The website becomes the main workspace after a reviewed one-time import from the owner's Excel and Notion exports.
- Imports are strictly local, dry-run first, idempotent, private, and traceable without committing source files or private URLs.
- Ambiguous dates and incomplete rows require owner-visible review decisions before database writes.
- Detailed mapping and audited baseline counts are defined in `DATA_IMPORT_PLAN.md`.

### Workflow statuses

The initial fixed workflow is:

1. Idea
2. Researching
3. Scripting
4. Recording
5. Editing
6. Reviewing
7. Scheduled
8. Published

### Calendar

- Monthly view of scheduled records.
- Clear platform and status treatment.
- Selecting an item opens its details.
- Unscheduled ideas are not forced onto the calendar.

### Idea bank

- Shows records whose status is `Idea` and which do not yet require a publication date.
- Provides quick capture with a title and optional notes.
- An idea becomes planned content by adding production details or a schedule.
- Provides searchable, editable reference accounts for inspiration.

### Content editor, link workspace, and text preview (Milestone 4)

- **Preserve completed fields**: Polish existing modal/editor fields without rebuilding working features.
- **External link workspace**:
  - Full CRUD for external links categorized as idea sources, assets, notes, and published posts.
  - Stores URL, label, link type, optional platform, and sort order.
  - Strict HTTP/HTTPS URL validation.
  - Safe link cards displaying label, platform badge, domain name, copy link button, open link button, reordering, and removal controls.
  - Safe external link navigation: opens in a new tab with `target="_blank" rel="noopener noreferrer"`.
  - **Zero remote fetching**: Do not fetch remote pages, scrape metadata, download files, generate thumbnails, or embed third-party iframes in Sprint 1.
- **Platform-neutral text preview**:
  - Renders a clean preview showing the hook, formatted caption, call to action, and hashtags.
- **Copy controls**:
  - One-click copy buttons for caption, CTA, hashtags, and individual link URLs with localized visual feedback.
- **Unsaved-change protection**:
  - Detects dirty form state and warns before closing the modal or navigating away.

### Settings

- Preferred language (Thai / English).
- Timezone displayed as Asia/Bangkok.
- Default platforms preference.
- Content pillars management (English name, Thai name, color, order).

## Explicit non-goals (Sprint 1)

- Image/video file upload UI, large-file handling, and media ordering/removal (deferred to Sprint 2).
- Signed upload and media-viewing URLs (deferred to Sprint 2).
- Remote page scraping, OpenGraph metadata extraction, file downloading, thumbnail generation, or third-party iframe embeds.
- Automatic publishing to social media APIs.
- Social analytics or engagement metrics import.
- AI caption or idea generation.
- Team members, comments, approvals, and shared workspaces.
- Subscriptions, billing, or public sign-up.
- Fully customizable workflows.
- Drag-and-drop calendar scheduling.
- Ongoing two-way synchronization with Excel, Google Sheets, or Notion.

## Sprint 2 Backlog (Deferred Capabilities)

1. **Private Media Uploads**:
   - File upload interface for images and videos directly attached to content records.
   - Resumable large-file uploads (TUS protocol / chunked uploads).
   - Client-side validation for configured file types and size limits.
   - Temporary signed viewing URLs from the private `content-media` Supabase Storage bucket.
   - Media ordering, preview carousel, and removal controls.
   - Storage quotas and usage monitoring per account.

2. **Commercial & Multi-User SaaS Capabilities**:
   - Public user registration and onboarding flow.
   - Stripe / payment gateway integration for subscriptions and billing tiers.
   - Multi-tenant data isolation and team/workspace management.
   - Role-based access control (Admin, Creator, Editor, Viewer).

3. **Platform Automations**:
   - Direct publishing integrations via official social platform APIs.
   - Performance analytics and engagement data import.

## Experience direction

The product is a minimal Swiss-inspired institutional workspace: precise, calm, typographic, and deliberately structured rather than decorative. Use a warm off-white work surface, near-black text, thin neutral rules, and one restrained cobalt accent. Red is reserved for destructive actions, errors, and overdue work.

- Rigorous grid, strong typographic hierarchy, square or subtly rounded geometry, and generous whitespace.
- Avoid gradients, glass effects, decorative shadows, excessive pills, and rainbow status colors.
- Thai-friendly sans-serif stack with Helvetica/Arial character in Latin text.
- Responsive layout: desktop persistent sidebar, planner table, and side sheet editor; mobile compact header, bottom nav, cards, and full-screen editor.
- Motion is subtle, functional, and fast.

## Bilingual behavior

- English and Thai have 100% equal feature coverage and key parity.
- Navigation, labels, empty states, validation, confirmations, errors, and copy feedback are fully translated.
- Selected locale persists between sessions.
- Dates use the selected language while remaining in the Asia/Bangkok timezone.

## MVP success criteria (Sprint 1)

The release is successful when the owner can securely sign in, capture an idea, turn it into a planned post, manage all external asset and published links, schedule publication, track production tasks, find records across planner, calendar, and task views, switch languages, and return without losing data.
