# Implementation Handoff

This file is replaced or updated by the implementation agent at the end of each milestone. Do not include credentials, tokens, private URLs, or personal content.

## Current assignment

- Milestone: 1 — Application foundation and planner slice (Reviewer Revision)
- Status: Accepted after second Codex review
- Reviewer: Codex

## Instructions for Antigravity

Read `AGENTS.md`, `PROJECT.md`, `ARCHITECTURE.md`, and `TASKS.md` completely.

Complete only the Milestone 1 reviewer revision checklist in `TASKS.md`. Address every item and do not begin Supabase or Milestone 2.

After revising:
1. Verify the layout at 1440×900 and 390×844.
2. Run `git diff --check`, `npm run lint`, `npm test`, and `npm run build`.
3. Update `TASKS.md` and `HANDOFF.md` with accurate evidence.
4. Stop for a second Codex review.

## Result

### Completion status

Complete. All 11 items from the Milestone 1 reviewer revision checklist have been addressed, verified, and tested.

### Summary of Revisions

1. **Removed Internal / Reviewer UI**:
   - Stripped the top milestone notice banner (`M1 Active`) from `src/components/shell/AppShell.tsx`.
   - Removed navigation milestone badges (`badge: 'M5'`, `badge: 'M6'`) from `src/components/shell/DesktopSidebar.tsx`.
   - Removed the `Preview Loading` control button from `src/components/planner/PlannerView.tsx`.
   - Removed all milestone-number placeholder references from `/calendar`, `/ideas`, and `/settings`.

2. **Neutral Bilingual Unfinished Routes**:
   - Updated `calendar/page.tsx`, `ideas/page.tsx`, and `settings/page.tsx` with neutral, product-level bilingual copy explaining features in user-facing language without implementation planning terminology.
   - Settings page displays localized language and timezone preferences with dedicated back navigation.

3. **Optimized 390×844 Mobile Viewport Hierarchy**:
   - Re-architected `src/components/planner/PlannerSummary.tsx` for mobile: replaced the tall 6-card vertical grid with a compact 3-stat overview row (`Today: 2 | This Month: 7 | In Prod: 5`) and a collapsible workflow stages toggle (`All stages (8)`).
   - In `PlannerFilters.tsx`, added a collapsible mobile filter drawer toggle so search is immediate and filter controls do not push content down.
   - Verified via headless browser screenshot at 390×844: the mobile header, title, compact summary, search input, and the complete first content card (`5 AI Tools...`) with its platform badges, hook, schedule, and progress bar are immediately visible in the initial viewport without scrolling.

4. **Document Language Alignment (`<html lang="...">`)**:
   - Refactored `src/app/[locale]/layout.tsx` to set `<html lang={locale}>` dynamically from the route parameter.
   - Verified server-rendered HTML:
     - `/th/planner` renders `<html lang="th" class="h-full">`
     - `/en/planner` renders `<html lang="en" class="h-full">`
   - In `LocaleContext.tsx`, dynamically synchronizes `document.documentElement.lang = newLocale` on client-side language switches so screen readers and assistive technologies update immediately without page reload.

5. **Localize Visible & Accessible Text**:
   - Localized navigation `aria-label` values (`nav.mainNavAria`, `nav.mobileNavAria`).
   - Localized status filter button `title` attributes (`summary.filterByStatus`).
   - Localized all timezone values, mobile stage toggle labels, and filter toggle buttons in both English and Thai.

6. **Invalid Locale Route Rejection (404)**:
   - Added strict locale validation in `src/app/[locale]/layout.tsx` and all page routes (`planner`, `calendar`, `ideas`, `settings`). If `locale` is not `'th'` or `'en'`, `notFound()` is invoked.
   - Verified that `/fr/planner` returns `HTTP 404 Not Found` rather than a 200 response with mixed metadata.

7. **Canonical Translation Dictionaries**:
   - Removed redundant duplicate root `messages/` folder.
   - Kept a single canonical source of truth at `src/messages/en.json` and `src/messages/th.json`.
   - Updated application components, `LocaleContext.tsx`, and test suites to import exclusively from `src/messages/`.

8. **Rigorous Static-Page & Live-Server Tests**:
   - Updated `tests/planner.test.mjs` to assert `existsSync(...)` for pre-rendered build artifacts (`.next/server/app/th/planner.html` and `en/planner.html`), failing loudly if build artifacts are missing rather than silently passing.
   - Separated server probe from test assertions: connection errors properly skip the live-server test when offline, but once reachable, assertion failures for root redirect (307) and invalid locale rejection (404 for `/fr/planner`) fail the test.

9. **Typography Scaling for Readability**:
   - Raised filter labels and control text in `PlannerFilters.tsx` to 14px (`text-sm font-semibold` and `text-sm` inputs).
   - In `PlannerTable.tsx`, raised table headers to `text-xs font-bold uppercase`, schedule to `text-sm font-medium`, hook preview to `text-sm`, and status pills to 13–14px.
   - In `PlannerCards.tsx`, preserved >=16px titles, 14px hooks, and 14px Bangkok schedules with comfortable touch targets.

10. **Clean Whitespace & Git Hygiene**:
    - Cleared all trailing whitespace across all files; `git diff --check` passes with zero warnings or errors.

### Files changed

- `TASKS.md`: Checked off all 11 items in the Reviewer Revision Checklist and marked Milestone 1 ready for second review.
- `HANDOFF.md`: Updated with full revision evidence, verification outputs, and manual testing steps.
- `messages/`: Removed redundant directory (en.json, th.json).
- `src/messages/en.json` & `src/messages/th.json`: Canonical dictionaries with full key parity and neutral route copy.
- `src/app/layout.tsx`: Updated pass-through root layout.
- `src/app/[locale]/layout.tsx`: Dynamic `<html lang={locale}>` with `notFound()` on invalid locales.
- `src/app/[locale]/planner/page.tsx`: Added `notFound()` validation.
- `src/app/[locale]/calendar/page.tsx`: Removed milestone badge; clean neutral bilingual copy with `notFound()` check.
- `src/app/[locale]/ideas/page.tsx`: Removed milestone badge; clean neutral bilingual copy with `notFound()` check.
- `src/app/[locale]/settings/page.tsx`: Removed milestone badge; clean localized preferences with `notFound()` check.
- `src/context/LocaleContext.tsx`: Synchronizes `document.documentElement.lang` on language switch.
- `src/components/shell/AppShell.tsx`: Removed M1 notice banner and M1 Active tag.
- `src/components/shell/DesktopSidebar.tsx`: Removed milestone badges; localized `aria-label`.
- `src/components/shell/MobileNav.tsx`: Localized `aria-label` and adjusted typography.
- `src/components/planner/PlannerView.tsx`: Removed `Preview Loading` control.
- `src/components/planner/PlannerSummary.tsx`: Mobile compact 3-stat strip + collapsible stages; localized status titles.
- `src/components/planner/PlannerFilters.tsx`: Mobile filter drawer toggle; 14px control typography.
- `src/components/planner/PlannerTable.tsx`: Scaled typography to 14px standard; clean borders and contrast.
- `src/components/planner/PlannerCards.tsx`: Scaled typography; touch-friendly cards.
- `tests/planner.test.mjs`: Validates `src/messages/`, asserts static build HTML exists, verifies 307 redirect and 404 rejection on invalid locales without swallowing assertion failures; zero trailing whitespace.

### Validation performed

1. **`git diff --check`**:
   - Exit code: 0 (No whitespace errors or trailing spaces).
2. **`npm run lint`**:
   - Exit code: 0 (0 warnings, 0 errors).
3. **`npm test` (`node --test tests/planner.test.mjs`)**:
   - 5/5 tests passing:
     - `✔ Bilingual dictionary parity test (src/messages)`
     - `✔ Asia/Bangkok Date formatter verification`
     - `✔ Pre-rendered Thai planner HTML exists and contains localized content` (`<html lang="th">`, title, navigation, Bangkok timezone)
     - `✔ Pre-rendered English planner HTML exists and contains localized content` (`<html lang="en">`, title, navigation, Bangkok timezone)
     - `✔ Live server responses and invalid locale rejection (when server active)` (Root `/` -> 307 to `/th/planner`; `/fr/planner` -> 404)
4. **`npm run build`**:
   - Exit code: 0 (Next.js Turbopack compiled in 615ms; all 13 static pages generated successfully).
5. **Headless Visual Layout Verification**:
   - **Desktop 1440×900** (`/th/planner` and `/en/planner`):
     - Verified clean deep graphite sidebar, summary KPIs, stage breakdown, 14px filter controls, and compact table rows with zero milestone/reviewer copy.
     - Artifact: `screen1440.png` and `screen1440_en.png`.
   - **Mobile 390×844** (`/th/planner` and `/en/planner`):
     - Verified compact 3-stat summary bar, search bar, filter toggle, and the entire first content card (`5 AI Tools...`) with its platform badges, hook, schedule, and progress bar are immediately visible within the first 844px viewport.
     - Checked horizontal page scrolling: zero horizontal overflow (`scrollWidth === innerWidth`).
     - Artifact: `screen390.png` and `screen390_en.png`.

### Acceptance criteria checked

- [x] **Desktop Viewport (1440px)**: Deep graphite sidebar, summary KPIs, workflow breakdown strip, search/filters, and compact planner table clearly visible in first viewport.
- [x] **Mobile Viewport (390px)**: Compact top header, bottom navigation, compact 3-stat summary, and first content card fully visible above the fold without horizontal scrolling.
- [x] **Bilingual Switching**: Thai and English switch instantly via the `TH | EN` toggle button without page reload, preserving active filter selections and search input.
- [x] **Document Language (`lang`)**: Thai routes output `<html lang="th">` and English routes output `<html lang="en">`; `document.documentElement.lang` synchronizes on client-side language switches.
- [x] **Invalid Locales**: `/fr/planner` and unsupported locales return HTTP 404.
- [x] **Scope Boundary**: Contains no Supabase client connection, authentication logic, or fake social publishing.
- [x] **Clean Checks**: `git diff --check`, `npm run lint`, `npm test`, and `npm run build` pass cleanly.

### Assumptions and deviations

None. All feedback points from Codex's review have been implemented according to instructions.

### Manual reviewer steps

1. In `/Users/nack/contentPlaner`, start the development or production server:
   ```bash
   npm run build
   npx next start -p 3000
   ```
2. Open `http://localhost:3000/` in Google Chrome or Edge.
   - Confirm automatic 307 redirect to `http://localhost:3000/th/planner`.
3. Test invalid locale handling:
   - Open `http://localhost:3000/fr/planner`. Confirm it returns 404 Not Found.
4. Verify document language:
   - Inspect DOM at `http://localhost:3000/th/planner`: `<html lang="th">`.
   - Click `EN` in the language switcher: verify URL updates to `/en/planner`, document language updates to `lang="en"`, and copy updates immediately with zero page reload.
   - Inspect DOM at `http://localhost:3000/en/planner`: `<html lang="en">`.
5. At 1440×900:
   - Confirm absence of `M1 Active` banner, milestone badges in sidebar, and `Preview Loading` button.
   - Verify table typography and hook quick-copy button.
6. At 390×844 (Chrome DevTools device mode):
   - Confirm that the compact summary (`Today | This Month | In Prod`), search bar, and the first content card appear within the first viewport without scrolling.
   - Click `All stages (8)` / `ทุกขั้นตอน (8)` to toggle the workflow breakdown.
   - Click `Filter options` / `ตัวเลือกตัวกรอง` to toggle the 5 filter dropdowns.
7. Run all automated verification commands:
   ```bash
   git diff --check
   npm run lint
   npm test
   npm run build
   ```

## Reviewer notes

Milestone 1 was accepted by Codex on 2026-09-14.

Independent reviewer verification:

- `git diff --check`: passed.
- `npm run lint`: passed with no warnings or errors.
- `npm test` with the production server running: 5 tests passed, 0 skipped, 0 failed.
- `npm run build`: passed; all 13 static pages were generated.
- `/` returned a 307 redirect to `/th/planner` when no English preference cookie was present.
- `/fr/planner` returned 404.
- Server-rendered `/th/planner` and `/en/planner` used the matching `html` language.
- At 390×844, the planner had no horizontal overflow and showed the compact summary, search controls, and one complete content card in the first viewport.
- Switching English to Thai preserved the active `Desk` search, updated the URL and document language, and retained one matching card.
- Navigation after the language switch opened `/th/calendar` with Thai product copy.
- At 1440×900, the first viewport showed the sidebar, summary, filters, and three useful planner rows.

Milestone 2 remains blocked only by Supabase project configuration. Do not place real credentials in tracked files or this handoff.
