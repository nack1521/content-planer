# CP-COLOR-01 — Direct color-only cream/rose theme

Status: PREPARED, not submitted. Owner instruction `1562093674400059464` cancels CP-THEME-SAMPLE-01 and requests direct implementation, primarily colors, with minimal changes. This task supersedes that sample prompt and its composition redesign. Do not create a sample or run both tasks.
Workspace `/Users/nack/contentPlaner`, current worktree at HEAD `2225a7620f992a7865fc5eba33be548edbbdbec9`. Antigravity implements; Hermes intakes; Luna performs one material-regression review; deployment and owner UAT follow later. Performance/R1 source-synthetic review is complete; preserve all its work and evidence.

## Exact outcome and non-goals

Recolor the existing app to warm cream/paper surfaces, muted rose/pink accents and readable dark warm text, based on the owner's already-viewed Classroom screenshot. Apply consistently to shell, Planner, Tasks, Calendar, Ideas, Settings, Login, dialogs, links, focus/hover/pending/loading/empty states. Do NOT copy the reference's profile layout.

Preserve current component/DOM structure, route/menu behavior, geometry, spacing, density, typography, icon shapes, shadows/elevation, radii, table columns, breakpoints, pagination and all business/auth/data logic. Color-related CSS variables or class names are allowed; functional attributes, handlers, queries, hook order and signatures are not. Existing gradients may receive new color stops but do not use this task to redesign decorations. Do not add theme switching, a new design system/library, new components or an unrelated cleanup.

Start with a small central color-token mapping and only the local surface/foreground corrections necessary for contrast; minimize changed files. Do not globally remap generic black/white in a way that makes white-on-primary text unreadable. Functional danger/success/warning meanings, platform brand colors and user-defined pillar colors must retain their semantics; do not blindly turn every badge pink.

Proposed approved-direction palette (not sampled exact hex from the reference): paper #FBF7F5, white surface #FFFFFF, ink #2D2526, secondary #746365, primary rose #A13F5B, selected soft rose #F5E4E8. Existing dark sidebar may become a warm light surface by changing its background/text/border colors only, without layout changes. Recompute contrast for actual text/background pairs. Prior calculations: ink/paper 14.05:1, secondary/paper 5.31:1, white/primary 6.22:1, primary/soft rose 5.08:1. Normal text >=4.5:1; essential focus/control indicators >=3:1. Do not claim rendered readability solely from numeric contrast.

## Allowed edits

Color declarations only in `src/app/globals.css`, `src/app/[locale]/login/page.tsx`, `src/app/[locale]/settings/page.tsx`, and existing `.tsx` files under `src/components/auth/`, `calendar/`, `ideas/`, `planner/`, `shell/`, `tasks/`. No new app files. Keep PlatformBadge.tsx, PillarBadge.tsx and StatusBadge.tsx unchanged; preserve their semantic/user-defined colors. Prefer fewer files rather than touching every allowed file.

Only current status entries in TASKS.md/HANDOFF.md may be updated. New report/check files may be created under `docs/handoffs/CP-COLOR-01-output/`; REVIEW.md is reserved for Luna. Original sample artifacts, if any exist, stay untouched and are not implementation inputs. No edits to src/app/actions/**, utils/**, context/**, types/**, messages/**, proxy/auth routes, tests/**, package/lock/config files, earlier handoffs/results/reviews or unrelated work.

Baseline: `/Users/nack/.hermes/workspaces/content-planer/CP-COLOR-01/baseline/manifest.json`; dirty editable shell/pending/loading files and root status docs have .before copies outside test discovery. Verify current hashes before editing and stop on unexpected concurrent changes. No stash/reset/clean, Git writes, DB/Storage/migration/import/account/password operations, private/env reads, install, deployment or host migration. No real-account browser login because the dev tracing concern remains unresolved.

## Cases and finite checks

C1. Existing menu/content/task/editor behavior remains unchanged by a color-only diff, including R1 navigation wiring, date clearing, last-column task description and 25-item pagination. Inspect diff for non-color edits and remove only accidental task-owned changes before final gates.
C2. Main surfaces/controls/loading/dialogs use the cream/rose palette consistently; preserved semantic/brand/user colors are intentional exceptions. Scan the changed sources and built bundle for surviving old primary-purple literals; explain intentional exceptions, not a wholesale unrelated purge.
C3. Actual color pairs have measured contrast. If existing browser tooling can verify desktop/mobile colors and console state safely without account login or new services, retain genuine evidence. Otherwise mark that rendered boundary NOT RUN and defer real-account visuals to approved later UAT; no browser-install/profiling project.

Run once as the final sequence, in order, stop on first failed/blocked gate. Inspect test imports/hooks before invocation; keep existing assertions and test runner unchanged. Capture exact argv/stdout/stderr/exit under output/checks/.
1. `node --loader ./tests/test-loader.mjs --test tests/planner-list.test.mjs tests/task-list.test.mjs tests/task-content-search.test.mjs tests/localization-scanner.test.mjs tests/accessibility.test.mjs`
2. `npx --no-install tsc --noEmit`
3. `npm run lint`
4. `npm run build`
5. `git diff --check`

Do not run npm test, DB/auth/import suites or reopen the performance gate; original performance evidence remains historical. Existing static accessibility assertions are not mounted/browser proof. Contrast/color scans are permitted deterministic read-only checks using installed tools. No automatic retry/correction loop after a failed final gate.

## Result and stop

Write `docs/handoffs/CP-COLOR-01-output/RESULT.md`: exact changed paths/color roles, confirmation of unchanged structure/logic and protected hashes, actual checks/counts/exits/contrast, intentional non-theme color exceptions and any visual proof limits. Mark LOCAL ONLY, NOT DEPLOYED and not yet hosted UAT. Return `CP-COLOR-01-DONE` or `CP-COLOR-01-BLOCKED`, exact result path, then STOP for coordinator intake and one Luna review. No prototype approval step, app redesign, extra phase or self-deployment.
