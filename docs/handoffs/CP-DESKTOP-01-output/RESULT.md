# CP-DESKTOP-01 Result Report — Stable Sidebar and Task Row Interaction

**Status:** CP-DESKTOP-01-DONE  
**Date:** 2026-10-21  
**Workspace:** `/Users/nack/contentPlaner`  
**State:** LOCAL ONLY, NOT DEPLOYED  
**Reviewer:** Luna (one material-regression review)  

---

## 1. Executive Summary & Implemented Outcomes

CP-DESKTOP-01 implements the desktop UX follow-up authorized under Discord `1562271280328089631`. It delivers four concrete outcomes with zero regressions to accepted cream/rose colors, F1/F2 corrections, performance wiring, or mobile cards:

1. **Viewport-Pinned Desktop Sidebar (Outcomes 1 & 2):**
   - The lower sidebar block (language switcher, timezone badge, Sign Out button) remains pinned at the viewport bottom across all routes, during route loading, and while document content scrolls.
   - Implemented via a viewport-height sticky container (`sticky top-0 h-screen`), a nonshrinking header (`shrink-0`), a nonshrinking footer (`shrink-0`), and a min-height-zero independently scrollable middle navigation container (`flex-1 min-h-0 overflow-y-auto`).
   - On short viewports, navigation links scroll cleanly inside the middle area while the header and footer remain pinned and reachable.
   - Normal document scrolling for page content is fully preserved.

2. **Desktop Tasks Checkbox Breathing Room (Outcome 3):**
   - Increased left padding on the table status/checkbox column to `pl-3` (with `pr-1` right padding) on both `<th>` and `<td>`.
   - Preserved checkmark button dimensions (`w-5 h-5`), visual alignment, and accessible `aria-label`.
   - Preserved the fixed-table layout, 100% column allocation, and description as the last column (`w-[23%]`) with zero horizontal overflow.

3. **Desktop Tasks Whole-Row Click Activation (Outcome 4):**
   - Clicking inert row areas (badges, date, description, empty cell space) opens the task's existing editor modal populated with that task.
   - **Checkbox Exception:** Clicking the checkbox button stops propagation and toggles task completion only; it does not open the task editor.
   - **Linked Content Exception:** Clicking the linked content button stops propagation and opens the content editor only; it does not trigger task editing or status toggles.
   - **Title Keyboard & Click Access:** The title button stops propagation and opens the task editor once. Accessible keyboard entry (Tab + Space/Enter) remains native; row clicks do not double-trigger.
   - **Text Selection Guard:** Selecting or dragging to copy text within the row is guarded via `window.getSelection()`; mouseup after text selection does not trigger the editor modal.
   - **Table Semantics Preserved:** `<tr>` retains native HTML table semantics (no nested buttons, no `role="button"` or `tabIndex` on the row).
   - **Mobile Cards Unchanged:** Mobile card markup, breakpoints, and interactions remain completely untouched.

---

## 2. Exact Changes by File & Line Reference

### 1. `src/components/shell/DesktopSidebar.tsx`
- **Line 70:** Replaced `min-h-screen` with `sticky top-0 h-screen` on `<aside>` for viewport-pinned containment.
- **Line 72:** Added `shrink-0` to the brand header container to prevent collapsing on short viewports.
- **Line 90:** Added `min-h-0 overflow-y-auto` to the middle `<nav>` container for independent vertical scrolling.
- **Line 119:** Added `shrink-0` to the footer container to ensure language, timezone, and Sign Out remain pinned at the bottom.

### 2. `src/components/tasks/TasksView.tsx`
- **Lines 217–234:** Added `handleRowClick` handler:
  - Enforces primary mouse click only (`event.button === 0`, no modifier keys).
  - Checks `window.getSelection()` to avoid triggering edit when text is selected.
  - Checks `target.closest('button, a, input, select, textarea, [role="button"]')` to ignore clicks originating on or inside interactive controls.
  - Calls `handleOpenEdit(task)`.
- **Line 622:** Updated table header checkbox cell `<th>` to `py-3 pl-3 pr-1`.
- **Line 654:** Added `onClick={(event) => handleRowClick(task, event)}` and `cursor-pointer` to `<tr>`.
- **Line 659:** Updated table body checkbox cell `<td>` to `py-3 pl-3 pr-1 text-center`.
- **Lines 662–665:** Added `event.stopPropagation();` to the checkbox button `onClick`.
- **Lines 679–682:** Added `event.stopPropagation();` to the title button `onClick`.
- **Lines 733–736:** Added `event.stopPropagation();` to the linked content button `onClick`.

### 3. `src/components/shell/AppShell.tsx`
- **Unchanged:** Sidebar sticky containment was fully achieved within `DesktopSidebar.tsx` without needing changes to `AppShell.tsx`.

### 4. `tests/desktop-ux.test.mjs` (New File)
- Added 4 test suites:
  1. `[static source assertion]` DesktopSidebar sticky containment, header `shrink-0`, nav `min-h-0 overflow-y-auto`, and footer `shrink-0`.
  2. `[static source assertion]` TasksView table checkbox padding `pl-3 pr-1`, `w-5 h-5` button size, accessible label, and 100% column allocation.
  3. `[executed synthetic test]` TasksView `handleRowClick` production algorithm execution with 9 distinct mock event cases (inert `<td>`, `<p>`, `<span>`, checkbox button, title button, linked content button, active text selection, right-click, and modifier keys).
  4. `[static source assertion]` Table native HTML semantics, absence of invalid `role="button"`, button `stopPropagation` verification, and mobile card block preservation.

---

## 3. Finite Checks Sequence Execution

All 5 frozen check gates were executed once in order and passed with exit code 0:

| Gate | Check Command | Exit Code | Result Summary | Log Artifacts |
| :--- | :--- | :---: | :--- | :--- |
| **1** | `node --loader ./tests/test-loader.mjs --test tests/desktop-ux.test.mjs tests/task-list.test.mjs tests/task-content-search.test.mjs tests/accessibility.test.mjs` | **0** | 26 passed, 0 failed across all 4 suites | [`01-tests.stdout.txt`](file:///Users/nack/contentPlaner/docs/handoffs/CP-DESKTOP-01-output/checks/01-tests.stdout.txt), [`01-tests.stderr.txt`](file:///Users/nack/contentPlaner/docs/handoffs/CP-DESKTOP-01-output/checks/01-tests.stderr.txt) |
| **2** | `npx --no-install tsc --noEmit` | **0** | 0 compiler diagnostics | [`02-tsc.stdout.txt`](file:///Users/nack/contentPlaner/docs/handoffs/CP-DESKTOP-01-output/checks/02-tsc.stdout.txt), [`02-tsc.stderr.txt`](file:///Users/nack/contentPlaner/docs/handoffs/CP-DESKTOP-01-output/checks/02-tsc.stderr.txt) |
| **3** | `npm run lint` | **0** | 0 errors (4 pre-existing fixture warnings in unchanged test files) | [`03-lint.stdout.txt`](file:///Users/nack/contentPlaner/docs/handoffs/CP-DESKTOP-01-output/checks/03-lint.stdout.txt), [`03-lint.stderr.txt`](file:///Users/nack/contentPlaner/docs/handoffs/CP-DESKTOP-01-output/checks/03-lint.stderr.txt) |
| **4** | `npm run build` | **0** | Turbopack build succeeded, 17/17 static pages generated | [`04-build.stdout.txt`](file:///Users/nack/contentPlaner/docs/handoffs/CP-DESKTOP-01-output/checks/04-build.stdout.txt), [`04-build.stderr.txt`](file:///Users/nack/contentPlaner/docs/handoffs/CP-DESKTOP-01-output/checks/04-build.stderr.txt) |
| **5** | `git diff --check` | **0** | Clean, 0 whitespace or formatting issues | [`05-diff-check.stdout.txt`](file:///Users/nack/contentPlaner/docs/handoffs/CP-DESKTOP-01-output/checks/05-diff-check.stdout.txt), [`05-diff-check.stderr.txt`](file:///Users/nack/contentPlaner/docs/handoffs/CP-DESKTOP-01-output/checks/05-diff-check.stderr.txt) |

Full check manifest with exact argv, command strings, exit codes, and artifact SHA-256 hashes is recorded in [`docs/handoffs/CP-DESKTOP-01-output/checks/manifest.json`](file:///Users/nack/contentPlaner/docs/handoffs/CP-DESKTOP-01-output/checks/manifest.json).

---

## 4. Baseline & Protected Hash Accounting

- **Baseline Manifest:** `/Users/nack/.hermes/workspaces/content-planer/CP-DESKTOP-01/baseline/manifest.json` (263 total files).
- **Modified App Files:** Exactly 2 source files (`DesktopSidebar.tsx` and `TasksView.tsx`).
- **Modified Status Documents:** Exactly 2 files (`TASKS.md` and `HANDOFF.md`, status/routing blocks only).
- **New Files:** Exactly 1 test file (`tests/desktop-ux.test.mjs`) and check artifacts under `docs/handoffs/CP-DESKTOP-01-output/`.
- **Unmodified Baseline Files:** All 261 other files in the baseline manifest remain 100% byte-identical against their recorded SHA-256 hashes.
- **Theme & Badges:** `globals.css`, `PlatformBadge.tsx`, `PillarBadge.tsx`, and `StatusBadge.tsx` remain completely untouched.

---

## 5. Actual Proof Limits & Distinction

- **Static vs Executed Distinction:**
  - Sidebar sticky classes (`sticky top-0 h-screen`, `shrink-0`, `min-h-0 overflow-y-auto`) and table padding classes (`pl-3 pr-1`) are verified via static AST/source assertions.
  - The row click event filtering logic (button matching, selection checking, modifier rejection, interactive control exception handling) is verified via synthetic execution of the production algorithm with mock DOM trees and synthetic event objects.
- **Mounted / Browser Testing:** **NOT RUN**. Real browser pixel coordinates, sticky scroll boundaries under window scrolling, and mouse click pointer events cannot be proven by static tests alone. To protect production security boundaries and avoid development server tracing issues, real-browser smoke tests and account logins were not performed.
- **Hosted State:** LOCAL ONLY. No deployment was initiated; Vercel deployment and owner UAT remain NOT READY pending reviewer verification.

---

## 6. Focused Manual Verification Steps for Reviewer / Owner UAT

When deployed to a test environment or during local desktop inspection:

1. **Sidebar Sticky Containment:**
   - Open any route with long content (e.g. Planner or Tasks with 25 items).
   - Scroll the main content window down.
   - Verify that the sidebar header (CP logo) and lower block (language switch, timezone, Sign Out) remain fixed in the viewport and do not scroll out of view.
   - Shrink the browser window vertically to ~500px: verify that navigation links in the middle can scroll independently while the header and footer remain pinned and fully visible.
   - Navigate between Planner, Tasks, Calendar, Ideas, and Settings: verify that the footer coordinates stay in the exact same viewport position regardless of whether the page is loading, short, or long.

2. **Tasks Table Checkbox Padding:**
   - Navigate to `/th/tasks` or `/en/tasks` on desktop (>1280px).
   - Observe the first column checkbox: verify comfortable left breathing room (`12px` / `pl-3`) from the table border.

3. **Tasks Row Click Activation:**
   - Click on non-interactive space in any task row (e.g. status badge, date, description, or empty space): verify the edit modal opens populated with that task.
   - Click the checkbox: verify it toggles completion status without opening the task edit modal.
   - Click the linked content button (e.g. `#12 Video title`): verify it opens the content item record modal, not the task edit modal.
   - Click the task title: verify it opens the task edit modal once (no double-triggering).
   - Drag across task description text to highlight/copy text: release the mouse button and verify the edit modal does NOT open.
   - Tab through the table with keyboard: verify standard focus on checkbox, title button, and linked content button without unexpected focus traps.

---

## 7. Task Signal

**CP-DESKTOP-01-DONE**  
Result report path: `docs/handoffs/CP-DESKTOP-01-output/RESULT.md`
