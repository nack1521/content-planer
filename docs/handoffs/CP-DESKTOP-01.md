# CP-DESKTOP-01 — Stable Sidebar and Task Row Interaction

Status: PREPARED, not submitted. Owner request Discord `1562271280328089631` authorizes this named desktop UX follow-up. Workspace `/Users/nack/contentPlaner`, received HEAD `dbbe3f19e0d8f66d737b591e4eaadcb38885ca26`. Antigravity implements; Hermes intakes; same Luna thread does one material-regression review; Nack submits/notifies. No commit/push/deploy grant for this pass. Previous release UAT has reported these issues, not a blanket PASS for other cases.

Read AGENTS.md, PROJECT.md, ARCHITECTURE.md, current TASKS/HANDOFF and relevant installed Next styling/navigation guidance. This named task overrides first-incomplete-milestone selection. Preserve the accepted performance, cream/rose theme, F1/F2 corrections and all unrelated dirty work.

## Four owner outcomes and defaults

1. Desktop sidebar's LOWER block means language switch, timezone and Sign Out. Keep it visible at viewport bottom while the content scrolls; it must not follow page content height or require scrolling to reach. Sidebar remains aligned at viewport top and full viewport height on every existing menu, including route loading, empty, short and long content. Prefer a viewport-height sticky sidebar with nonshrinking header/footer and a min-height-zero independently scrollable middle nav. Do not convert the whole app to a new scrolling system, overlay content or freeze document scrolling. If viewport height is short, middle links scroll while footer remains reachable. Preserve sign-out/language behavior and keyboard visibility.
2. Same footer coordinates across Planner/Tasks/Calendar/Ideas/Settings at the same viewport/zoom; loading transitions must not move it according to page length. Keep current sidebar desktop breakpoint; do not alter mobile header/bottom nav.
3. Desktop Tasks checkbox: increase LEFT breathing room in its table cell, default `pl-3` with small existing right padding. Preserve visual checkmark/button size, semantics and alignment; do not pad inside a fixed-size button until the icon shrinks. Preserve fixed-fit table, description last/2 lines and no horizontal scrolling; do not redesign column ratios unless essential to avoid overflow and report that exception.
4. Desktop Tasks: a normal primary click on non-interactive space anywhere across the record row opens its existing task editor ONCE, populated with that task. Includes badges, date, description and empty cell space. Linked-content button still invokes existing handleOpenContentRecord behavior ONLY, not task editing or task toggle. Checkbox still toggles completion ONLY, not editing/linking. Title edit button remains a native keyboard entry and must not double-trigger row edit. Preserve native table semantics; do not wrap the row in a button or nest buttons. Don't force a button role onto a row containing independent controls. Avoid opening an editor after selecting/copying row text; retain ordinary text selection. Use subtle existing-theme hover/cursor feedback, not a new theme/layout.

Scope is desktop: keep mobile cards, their title/link/checkbox interactions and existing table/card breakpoints unchanged. Existing linked-content behavior opens its current content editor; do not replace it with a new route or tab. Preserve sorting/filtering/search/pagination/modal save/delete/focus and auth/data mutations.

## Allowed writes

Only `src/components/shell/DesktopSidebar.tsx`, `src/components/shell/AppShell.tsx` if needed for sidebar containment, `src/components/tasks/TasksView.tsx`, and new `tests/desktop-ux.test.mjs`. Reuse existing labels; no translation/content change needed. Only current TASKS/HANDOFF routing blocks; new RESULT/check artifacts under `docs/handoffs/CP-DESKTOP-01-output/` (REVIEW.md/reviewer-checks reserved for Luna). No other app file, existing tests/assertions, dependency/config/schema/auth/utility/data action or prior report/evidence edits. If a safe event-test seam cannot fit these paths, report the exact evidence limit rather than refactoring another module silently.

Baseline `/Users/nack/.hermes/workspaces/content-planer/CP-DESKTOP-01/baseline/manifest.json`; .before copies retain all three editable source files and root status docs. Verify hashes before edits; stop on unexpected concurrent changes. No stash/reset/clean, private/env/credential reads, install, DB/import/account/network operations, real login, Git writes or deployment. Do not poll the reviewer or launch another phase.

## Required cases and finite checks

Add bounded no-network source/synthetic regressions for viewport-pinned sidebar structure; row edit activation on inert areas; checkbox/content/title exceptions and no duplicate edit; selection guard; retained keyboard title/control access and unchanged mobile/table fit. Test actual production handler logic where safely accessible, not only a copied test-only algorithm. State which assertions are static vs executed; do not call source class assertions browser proof.

After inspecting selected imports/hooks, run once in order, stop on first nonzero/blocked gate and retain separate stdout/stderr/exit and exact argv/hash manifest:
1. `node --loader ./tests/test-loader.mjs --test tests/desktop-ux.test.mjs tests/task-list.test.mjs tests/task-content-search.test.mjs tests/accessibility.test.mjs`
2. `npx --no-install tsc --noEmit`
3. `npm run lint`
4. `npm run build`
5. `git diff --check`

No full npm test, DB/password/import/performance/R1 suite or auto-retry/fix loop. Known unchanged test warnings are not scope for cleanup.

Rendered acceptance: real sidebar footer bounds at fixed desktop viewport should be invariant across menus/long scroll/loading and remain reachable in short windows; exercise row click vs checkbox/link/title with actual pointer/keyboard behavior. If existing safe browser/component tooling can prove this without accounts, private data, app-route/debug scaffolds or new installs, retain genuine evidence. Otherwise mark that boundary NOT RUN and explicitly leave rendered/real-account verification to post-deployment owner UAT; no fabricated coordinates or new infrastructure prerequisite. Synthetic source tests alone do not close the browser boundary.

## Deliver and stop

Write `docs/handoffs/CP-DESKTOP-01-output/RESULT.md`: exact paths/changes, cases/checks/counts, preservation/hash accounting, actual proof limits and focused UAT steps. LOCAL ONLY, NOT DEPLOYED. Return `CP-DESKTOP-01-DONE` or `CP-DESKTOP-01-BLOCKED` plus result path and STOP for coordinator intake and one Luna review. No auto-correction loop, commit, deploy or unrelated polish.
