# Content Planner Product Brief

## Product summary

Content Planner is a private bilingual workspace for planning social content from the first idea through publication. It transforms the spreadsheet workflow in `ref/Download.mp4` into a focused, responsive web application.

The product is currently for one owner. It should feel like a creator's control board: quick to scan, efficient to edit, and calm enough to use every day.

## Locked decisions

- Audience: one personal user.
- Languages: Thai and English, switchable inside the application.
- Hosting: Vercel.
- Backend: Supabase.
- Timezone: Asia/Bangkok.
- Scope: content planning only.
- Authentication: passwordless Supabase login for the owner.
- Social publishing: excluded from the MVP.

## Primary user journey

1. Capture a content idea or import an existing numbered content record.
2. Add its objective, platform, format, main message, production detail, and call to action.
3. Add external asset references and published social links without automatically publishing anything.
4. Schedule a publication date and optional time.
5. Track personal review state and production tasks separately from the content lifecycle.
6. Review upcoming work in the planner, task list, or calendar.
7. Mark the item as published.

## Main navigation

- Planner / แผนคอนเทนต์
- Tasks / งานผลิต
- Calendar / ปฏิทิน
- Ideas / คลังไอเดีย
- Settings / ตั้งค่า

The default authenticated route opens the Planner.

## MVP features

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
- one or more target platforms;
- content pillar;
- format;
- goal;
- planned publication date and time;
- workflow status;
- personal review status;
- progress percentage;
- main message or hook;
- production detail;
- caption;
- call to action;
- hashtags;
- notes;
- external asset, idea-source, note, and published-platform links;
- optional image or video attachments.

Users can create, edit, duplicate, archive, and delete a record. Destructive deletion requires confirmation.

### Production tasks

- Tasks are a first-class personal work list rather than being embedded into the content status.
- A task has a title, status, due date, priority, type, and optional description.
- A task may link to one content record or remain standalone.
- Linked tasks are visible from both the Tasks view and the content editor.
- Initial task data can be imported once from the owner's Notion CSV export.

### Existing-data migration

- The website becomes the main workspace after a reviewed one-time import from the owner's Excel and Notion exports.
- Imports must be dry-run first, idempotent, private, and traceable without committing source files or private URLs.
- Ambiguous dates and incomplete rows require an owner-visible review before hosted data is written.
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

Custom workflows can be considered later. They are not required for the MVP.

### Calendar

- Monthly view of scheduled records.
- Clear platform and status treatment.
- Selecting an item opens its details.
- Unscheduled ideas are not forced onto the calendar.

### Idea bank

- Shows records whose status is `Idea` and which do not yet require a publication date.
- Provides quick capture with a title and optional notes.
- An idea becomes planned content by adding production details or a schedule.

### Content editor and preview

- Opens without losing the current planner or calendar context.
- Groups planning fields separately from writing fields.
- Shows a simple post preview with caption and attached media.
- Provides copy controls for caption, call to action, and hashtags.
- Warns about unsaved changes.

### Settings

- Preferred language.
- Timezone displayed as Asia/Bangkok for the MVP.
- Default platforms.
- Content pillars with English name, Thai name, and color.

## Explicit non-goals

- Automatic publishing to TikTok, Instagram, Facebook, YouTube, or other platforms.
- Social analytics or engagement imports.
- AI caption or idea generation.
- Team members, comments, approvals, and shared workspaces.
- Billing, subscriptions, or public sign-up.
- Public marketing website.
- Fully customizable workflows.
- Drag-and-drop calendar scheduling in the first release.
- Ongoing two-way synchronization with Excel, Google Sheets, or Notion.

## Experience direction

The product should be a working application from the first viewport. Avoid an oversized hero or promotional copy.

Visual thesis: a minimal Swiss-inspired institutional workspace: precise, calm, typographic, and deliberately structured rather than decorative. Use a warm off-white work surface, near-black text, thin neutral rules, and one restrained cobalt accent. Red is reserved for destructive actions, errors, and overdue work.

- Prefer a rigorous grid, strong typographic hierarchy, square or subtly rounded geometry, and generous but purposeful whitespace.
- Avoid gradients, glass effects, oversized rounded cards, decorative shadows, excessive pills, and a rainbow of status colors.
- Use a Thai-friendly sans-serif stack with a Helvetica/Arial character in Latin text; Thai and English must feel equally intentional.
- Let labels, numbers, rules, alignment, and spacing create hierarchy. Icons are secondary and should be used only when they improve recognition.

- Desktop: persistent side navigation, compact summary strip, filters, and planner table.
- Mobile: compact header, bottom navigation, summary cards, and content cards.
- The content editor appears as a side sheet on desktop and a full-screen flow on mobile.
- Use minimal decorative imagery; user-uploaded post media provides the visual content.
- Motion should be subtle and functional.

## Bilingual behavior

- English and Thai must have equal feature coverage.
- Navigation, labels, empty states, validation, confirmations, and feedback must all be translated.
- The selected locale persists between sessions.
- Dates use the selected language while remaining in the Asia/Bangkok timezone.
- User-authored content is displayed exactly as entered.

## MVP success criteria

The release is successful when the owner can securely sign in, capture an idea, turn it into a planned post, add writing and media, schedule it, update its production status, find it in planner and calendar views, switch languages, and return later without losing data.
