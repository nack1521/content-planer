# Existing Workflow and Import Plan

This plan aligns Content Planner with the owner's current Excel and Notion workflow. The source files remain outside the repository and must never be committed.

## Product decision

- Keep the current production visual design on `main` for now.
- Treat the website as the main workspace after migration.
- Use Excel and Notion as one-time import sources, not as an ongoing two-way sync.
- Preserve source references so imported records and tasks can be traced and safely re-imported during testing.
- Preview every transformation before writing to hosted Supabase.

## Read-only source audit

### Excel content workbook

The `Content` sheet contains:

- 158 complete content records, numbered 1 through 158.
- One incomplete shell, number 159, with no idea/title. It must be flagged rather than imported automatically.
- 54 additional preformatted placeholder rows, numbers 160 through 213. They must be skipped.
- 124 complete records targeting TikTok and YouTube.
- 34 complete records targeting Facebook and Instagram.
- 120 short-video records and 38 photo records.
- 139 approved review states and 19 in-process review states.
- 127 published states and 31 in-process content states.
- 419 embedded links across idea sources, Google Drive assets, published social URLs, and notes.
- 127 populated publication dates.

The `TikTok ช่างฝ้า` sheet contains 30 TikTok reference accounts. These are research references, not content records.

### Notion task export

The export contains 17 rows:

- 12 tasks can be linked to Excel content by a number in the task title, including the Thai task referring to content 147.
- Four tasks are valid standalone work: filming products and publishing to Facebook, YouTube, and TikTok.
- One row has no task title and must be skipped and reported.
- Task statuses are `Not started`, `In progress`, and `Done`.
- Task types are `Video`, `Photo`, `Post`, and `Other`.
- Priorities currently use `High` and `Low`.

## Important data risks

### Mixed publication dates

The 127 Excel dates are stored in two different forms:

- 67 are text in day/month/year form.
- 60 are typed spreadsheet dates.

At least 38 typed dates look like day/month reversals. Another 17 conflict with the visual month section and may be deliberate cross-month scheduling or another reversal. The importer must not silently guess. It must produce a date-review preview showing source number, original value, proposed Bangkok date, and a warning reason.

### Repeated and incomplete content

- Repeated ideas are allowed; they are not automatically duplicates.
- Five records share the same idea and main-message pair. They must be shown in the preview but retained unless the owner rejects them.
- Content 159 is incomplete and cannot satisfy the required title field.
- Rows 160 through 213 contain defaults but no meaningful content and must not become records.

### Hidden hyperlinks

The visible word `Link` is not useful by itself. Import the hyperlink target attached to the cell. Do not expose or print full private links in logs, tests, committed fixtures, or handoff documents.

## Field mapping

| Excel field | Website field | Rule |
| --- | --- | --- |
| No. | Source number | Preserve as a per-owner unique reference. |
| Month | Derived display grouping | Do not store as the source of truth; derive from the reviewed publication date. |
| Objective | Objective | Preserve the original Thai text. Do not force the 23 variants into the current five goal labels during import. |
| Platform | Platforms | `TT, YT` becomes TikTok + YouTube; `FB, IG` becomes Facebook + Instagram. |
| Format | Format | `Short video` becomes `short`; `Photo` becomes `photo`. |
| Idea | Title/topic | Required for automatic import. |
| Main Message | Main message/hook | Store in the existing hook field and label it clearly in the interface. |
| Detail | Production detail | Add a dedicated field; this is not a caption. |
| CTA | Call to action | Store in the existing CTA field. |
| Assets | External asset link | Extract the embedded hyperlink target. Do not download or copy Drive files automatically. |
| Content Checking | Review status | Map to `in_process`, `revise`, or `approved`. |
| URL TikTok | Published link | Link type `published`, platform `tiktok`. |
| URL Youtube | Published link | Link type `published`, platform `youtube`. |
| URL FB, IG | Published link | Preserve as a Facebook/Instagram published link without inventing two URLs. |
| Content Status | Source content status | Preserve the original value. The preview must propose, but not silently guess, its detailed website workflow status. |
| Publish Date | Planned publication date | Normalize only through the reviewed date preview and display in Asia/Bangkok. |
| Note | Notes and optional reference link | Preserve text and extract an embedded hyperlink when present. |

| Notion field | Website task field | Rule |
| --- | --- | --- |
| Gypstore | Task title | Required; skip and report the blank row. |
| Status | Task status | Map to `not_started`, `in_progress`, or `done`. |
| Due date | Due date | Parse as a date in Asia/Bangkok. |
| Priority | Priority | Map to `low`, `medium`, or `high`; current data uses low/high. |
| Task type | Task type | Map to `video`, `photo`, `post`, or `other`. |
| Description | Description | Optional text. |
| Number in title | Related content | Link only when exactly one existing source number matches. |

## Required data-model extension

Extend `content_items` with:

- `source_number integer null` with a per-owner partial unique index;
- `objective text null`;
- `production_detail text null`;
- `review_status text null` constrained to `in_process`, `revise`, or `approved`;
- `source_content_status text null` for lossless import traceability;
- `publish_time_known boolean not null default true` so date-only imports do not pretend to have a precise time.

Add `photo` to the allowed content formats.

Add `content_links` for idea sources, external assets, published URLs, and note links. It must include `user_id`, use a same-owner foreign key to `content_items`, have RLS on every operation, and validate link type and optional platform.

Add `production_tasks` with an optional same-owner relationship to `content_items`, task title, status, due date, priority, task type, description, and an import key for idempotency. It must use owner-scoped RLS.

Add `reference_accounts` for the 30 TikTok research accounts. It must support platform, account label, URL, notes, and owner-scoped RLS.

## Website workflow

### Planner

Keep the current responsive planner presentation. Replace sample rows with authenticated Supabase records and expose the fields actually used in Excel:

- source number;
- objective;
- platforms;
- format;
- idea/title;
- main message/hook;
- production detail;
- CTA;
- review status;
- publication date;
- external assets and published links;
- content status.

The default table remains compact. Secondary text and links belong in the content editor rather than forcing every field into the table.

### Tasks

Add a bilingual Tasks / งานผลิต route that replaces the Notion to-do database:

- list and filter tasks by status, due date, priority, and type;
- create, edit, complete, and delete tasks;
- optionally link a task to a content record;
- show linked tasks inside the content editor;
- open the related content from a task;
- support standalone tasks.

### References

Place TikTok research accounts in a small reference section within the Ideas area. This should be searchable and editable, but it is secondary to planner persistence and tasks.

## Safe import workflow

1. Add and test the database migration locally.
2. Build an import command whose default behavior is dry-run only.
3. Read source paths from explicit command arguments; never copy the source files into the repository.
4. Produce an uncommitted local preview with counts, skipped rows, task relationships, repeated-content warnings, and the date-review list.
5. Verify expected baseline counts: 158 automatic content candidates, 12 linked tasks, four standalone tasks, one skipped blank task, and 30 reference accounts.
6. Ask the owner to approve date corrections, content 159, repeated content, and the proposed workflow-status mapping.
7. Import into local Supabase and test CRUD, RLS, relationships, and idempotent reruns.
8. Run `git diff --check`, lint, application tests, database tests, and production build.
9. Stop for Codex review. Do not write imported data to hosted Supabase in the same cycle.
10. After review and an owner-approved backup, run the reviewed import against hosted Supabase exactly once and verify counts without logging private URLs.

## Acceptance criteria for the next implementation cycle

- Current design direction is preserved; no A/B/C prototype UI is merged.
- No source file or private URL is committed.
- Dry-run is the default and performs no database writes.
- Import classification matches the audited baseline counts.
- Ambiguous dates are visible for review and are not silently normalized.
- Imported content, tasks, links, and references are private to the authenticated owner.
- Rerunning the importer does not create duplicates.
- Planner and Tasks work in Thai and English on desktop and mobile.
- Hosted Supabase is unchanged until a separate reviewed and approved import step.
