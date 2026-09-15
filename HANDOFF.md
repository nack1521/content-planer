# Content Planner Handoff — Milestone 5 Complete

## Milestone Status

**Status: Completed; awaiting Codex review**

- **Milestone 3**: Accepted by Codex on 2026-09-14.
- **Milestone 4**: Accepted by Codex on 2026-09-15.
- **Milestone 5**: Completed and verified across all criteria; stopping for Codex review.
- **Milestone 6**: Unstarted (blocked by Milestone 5 review).
- **Hosted Supabase Status**: Clean and untouched. Zero hosted migrations or hosted imports were performed. Milestone 2 baseline remains on hosted Supabase without modification. All automated testing was executed strictly against the isolated local Supabase stack (`127.0.0.1:54321`).
- **Media Uploads / Sprint 2**: Zero media upload features or Sprint 2 capabilities added; dormant `content_media` infrastructure left untouched.

---

## Implemented Behavior

### 1. Monthly Calendar (`src/components/calendar/CalendarView.tsx` & `src/utils/calendar.ts`)
- **Deterministic Bangkok Calendar Utilities**:
  - `src/utils/calendar.ts` provides pure, testable functions for Bangkok calendar operations (`Asia/Bangkok`, UTC+7).
  - Accurate Gregorian leap-year calculation (`isLeapYear`), days in month (`getDaysInMonth` accounting for Feb 29 in leap years and Feb 28 otherwise), and 1st-of-month weekday calculation (`getFirstDayOfWeek`).
  - `getMonthGrid` generates a complete 7-column matrix (Sun..Sat) with padding days from previous and next months to ensure complete rows (28, 35, or 42 cells).
  - Navigation boundaries (`getPreviousMonth`, `getNextMonth`) transition correctly between December and January across year boundaries.
  - Month and year headers are formatted in Bangkok time (`formatMonthYearHeader`) in Thai (e.g. "กันยายน 2569") and English ("September 2026").
- **Bangkok Date Grouping & Strict Content Filtering**:
  - `filterAndGroupCalendarContent` groups content items strictly by their Bangkok calendar date (`utcToBangkokParts(publish_at).date`), preventing timezone misgrouping where UTC month-end items belong to Bangkok's next month (e.g., UTC `2026-04-30T18:00:00Z` maps to Bangkok `2026-05-01 01:00:00`).
  - Unscheduled ideas (`publish_at === null`) and archived records (`archived_at !== null`) are strictly excluded from the calendar.
  - Date-only items (`publish_time_known === false`) are handled cleanly without inventing arbitrary publication times; sorted first on each calendar day.
  - Items with known times display exact Bangkok publication times (e.g. `14:00`).
- **Desktop 7-Column Grid Presentation (`hidden md:block`)**:
  - Seven-column weekday headers (Sun..Sat) with localized short names.
  - Day cells display day number, today highlight badge, and scheduled post chips.
  - Each post chip displays primary platform badge, post title, workflow status badge, and publication time (when known).
  - Clicking any chip opens `RecordModal` for that item. Accessible via keyboard (`Enter`/`Space`) and labeled with `aria-label`.
- **Mobile Touch-Friendly Agenda Presentation (`block md:hidden`)**:
  - Compact agenda presentation grouping scheduled content chronologically by Bangkok date with distinct date section headers.
  - Full-width touch cards showing title, platform badges, workflow status, content pillar badge, and publication time.
  - Tapping any card opens `RecordModal`.
- **Calendar Lifecycle & Record Modal Integration**:
  - Selecting an item opens `RecordModal`.
  - Saving, deleting, duplicating, or archiving refreshes calendar data via `getContentItemsAction()`.
  - Empty state with calendar icon, localized explanation, and "Create Post" action when no items are scheduled in the selected month.
  - Loading skeleton state and localized error banner with retry control.
  - Zero drag-and-drop scheduling (strictly omitted per specification).

### 2. Idea Bank (`src/components/ideas/IdeasView.tsx`)
- **Unscheduled Ideas Source**:
  - Defined strictly as non-archived records with `status === "idea"` and `publish_at === null` from existing `content_items` source.
  - Zero data duplication; ideas are regular `content_items` rows.
- **Quick Capture Form**:
  - Fast capture requiring only Title and optional Notes.
  - Platform fallback: Since database constraints require at least one platform (`array_length(platforms, 1) > 0`), quick capture retrieves the owner's saved `default_platforms` from `user_preferences`. If unconfigured, falls back reversibly to `['tiktok']` without requiring a schema migration.
  - Server-action boundary validation: validates title (rejects empty/whitespace-only) and notes through authenticated server actions.
  - Feedback: localized validation messages, localized error banner on failure, and temporary success announcement banner on save.
  - Duplicate prevention: submit button and inputs are disabled while `isCapturing === true`.
- **Search for Unscheduled Ideas**:
  - Search input filtering unscheduled ideas in real-time by title and notes with a clear button and matching count indicator.
- **"Plan this idea" Action & In-Place Updates**:
  - Each idea card provides a prominent "Plan this idea" action with accent styling and accessible aria-label.
  - Opens `RecordModal` with the existing idea record (`item={idea}`).
  - When saved with production details, schedule date, or updated status (e.g. `scripting`), `updateContentItemAction(idea.id, data)` updates the exact same record in place rather than creating a duplicate.
  - On modal save, the view re-queries and the planned record automatically leaves the unscheduled ideas list.
- **Reference Accounts Integration**:
  - Reference Accounts feature preserved in full as an accessible, clearly separated tab (`role="tablist"`, `role="tab"`, `role="tabpanel"`).
  - Displays count badges for unscheduled ideas and reference accounts.

---

## Files Changed

- `src/utils/calendar.ts`: [NEW] Pure Bangkok calendar math, leap-year calculations, month grid generation, and date grouping.
- `src/components/calendar/CalendarView.tsx`: [NEW] Monthly calendar view with desktop 7-column grid, mobile touch-friendly agenda, and `RecordModal` integration.
- `src/components/ideas/IdeasView.tsx`: [NEW] Idea bank workspace with tab navigation, quick capture, search, idea cards, "Plan this idea" action, and Reference Accounts tab.
- `src/app/[locale]/calendar/page.tsx`: Server component fetching initial items/pillars and rendering `CalendarView`.
- `src/app/[locale]/ideas/page.tsx`: Server component fetching initial items/accounts/pillars and rendering `IdeasView`.
- `src/app/actions/content.ts`: Added platform fallback to owner default platforms or `['tiktok']` in `createContentItemAction`; added multi-route cache revalidation (`revalidateContentPages`); exported `quickCaptureIdeaAction`.
- `src/app/actions/preferences.ts`: Fixed TypeScript type imports (`import type`).
- `src/utils/supabase/preferences.ts`: Fixed TypeScript type imports (`import type`).
- `src/components/common/Icons.tsx`: Added `IconChevronLeft` and `IconChevronRight`.
- `src/messages/en.json`: Added complete Milestone 5 keys for `calendar` and `ideas`.
- `src/messages/th.json`: Added matching Thai localization keys with 100% parity.
- `tests/calendar-ideas-milestone5.test.mjs`: [NEW] 12 comprehensive unit and integration tests covering Bangkok calendar math, boundaries, leap years, timezone grouping, unscheduled idea definition, quick capture, in-place planning, owner isolation RLS, and accessibility.
- `tests/auth.test.mjs`: Added `/en/calendar` and `/en/ideas` to live server route protection assertions.
- `tests/run-tests.mjs`: Registered Milestone 5 test suite into isolated test runner.
- `TASKS.md`: Marked Milestone 4 as accepted by Codex on 2026-09-15 and Milestone 5 as completed.
- `HANDOFF.md`: Updated handoff documentation.

---

## Exact Verification Results

### 1. Whitespace / Diff Check
Command: `git diff --check`
Result: Clean exit (0 whitespace errors).

### 2. ESLint
Command: `npm run lint`
Result: Clean exit (0 errors, 0 warnings).

### 3. Isolated Local Supabase pgTAP Database Tests
Command: `npm run test:db`
Result:
```
/Users/nack/contentPlaner/supabase/tests/database/rls.test.sql .. ok
All tests successful.
Files=1, Tests=85,  0 wallclock secs ( 0.02 usr  0.01 sys +  0.01 cusr  0.00 csys =  0.04 CPU)
Result: PASS
[SUCCESS] All Content Planner pgTAP database tests passed on isolated local Supabase stack.
```

### 4. Next.js Production Build
Command: `npm run build`
Result:
```
▲ Next.js 16.3.5 (Turbopack)
- Environments: .env.local
✓ Compiled successfully in 1287ms
  Running TypeScript ...
  Finished TypeScript in 1204ms ...
✓ Generating static pages using 7 workers (17/17) in 406ms
  Finalizing page optimization ...
Route (app): all 17 routes compiled and generated cleanly without errors.
```

### 5. Complete Test Suite (`npm test`)
Command: `npm test`
Result:
```
=== 1. Verifying and Preparing Isolated Local Supabase Environment ===
85/85 pgTAP database tests passed.
=== 2. Running Production Domain & Validation Suites ===
✔ 15/15 tests passed
=== 3. Running Accessibility & Keyboard Navigation Suite ===
✔ 6/6 tests passed
=== 4. Running Localization & String Scanner Suite ===
✔ 5/5 tests passed
=== 5. Running Production Importer CLI & Idempotency Suite ===
✔ 10/10 tests passed
=== 6. Running Authenticated Server Actions & Atomic Rollback Suite ===
✔ 8/8 tests passed
=== 6b. Running Content Editor & Link Workspace Suite (Milestone 4) ===
✔ 17/17 tests passed
=== 6c. Running Calendar and Idea Bank Suite (Milestone 5) ===
✔ 12/12 tests passed
=== 7. Building Content Planner Application from Current Source ===
✓ Compiled successfully
=== 8. Running Live Server & HTTP Integration Suites ===
✔ 14/14 tests passed
=== [SUCCESS] ALL CLEAN-ENVIRONMENT CHECKS AND TEST SUITES PASSED ===
Total: 172 tests passing cleanly across database, domain, accessibility, localization, importer, server actions, Milestone 4 editor, Milestone 5 calendar & ideas, and live HTTP integration.
```

---

## Manual Review Instructions

### Desktop Review:
1. Start development server: `npm run dev` and navigate to `http://localhost:3000/th/calendar`.
2. **Monthly Calendar Desktop**:
   - Verify current month header displays in Bangkok time (e.g., "กันยายน 2569").
   - Click "เดือนก่อนหน้า" and "เดือนถัดไป" to verify boundary transitions; click "วันนี้" to return to current month.
   - Observe the 7-column grid (อา. ถึง ส.) with today highlighted in purple.
   - Click any scheduled item chip; observe `RecordModal` opens with record data. Edit a field, save, and confirm calendar refreshes.
   - Switch language to English (`/en/calendar`); verify all labels, month names, and weekdays switch cleanly.
3. **Idea Bank Desktop**:
   - Navigate to `http://localhost:3000/th/ideas`.
   - Observe two tabs: "ไอเดียที่ยังไม่กำหนดเวลา" and "บัญชีอ้างอิง".
   - In Quick Capture: enter a title and optional notes, click "บันทึกไอเดีย". Observe saving state, success banner, and immediate appearance of idea card.
   - Try clicking submit with empty title: observe validation error "กรุณาระบุหัวข้อไอเดีย".
   - On an idea card, click "วางแผนไอเดียนี้": observe `RecordModal` opens with that exact record.
   - Set a scheduled date and save: observe the idea disappears from the unscheduled tab.
   - Switch to "บัญชีอ้างอิง" tab: observe Reference Accounts workspace remains fully functional.

### Mobile Review (Viewport width <= 768px):
1. Navigate to `/th/calendar` in responsive view mode (390px width):
   - Verify 7-column desktop grid is hidden and compact agenda card presentation is visible.
   - Verify cards are touch-friendly with distinct date section headers.
   - Tap any post card to open full-screen `RecordModal`.
2. Navigate to `/th/ideas` in responsive view mode:
   - Verify tabs fit comfortably without horizontal scroll.
   - Test quick capture form and search bar on mobile.

---

## Assumptions and Remaining Limitations

- **Platform Fallback for Quick Capture**: Database schema check constraint requires `array_length(platforms, 1) > 0`. Quick capture does not force the user to pick platforms, so it looks up the owner's saved `default_platforms` from `user_preferences`. If unconfigured, it defaults reversibly to `['tiktok']`. This assumption avoids a premature schema migration while adhering to existing constraints.
- **No Drag-and-Drop**: Drag-and-drop calendar scheduling is an explicit non-goal in Sprint 1; scheduling is done deterministically through `RecordModal`.
- **Media Uploads**: No image/video uploads were introduced (deferred to Sprint 2).
- **Hosted Supabase**: Hosted Supabase was untouched. Zero hosted migrations or hosted imports were performed.
