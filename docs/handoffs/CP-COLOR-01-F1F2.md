# CP-COLOR-01-F1F2 — One Authorized Focused Correction

Status: PREPARED, not submitted. Owner grant: Discord `1562132392620331081` approves the coordinator's proposed single correction of F1/F2, then same-reviewer verification of those findings only. Workspace `/Users/nack/contentPlaner`. Antigravity implements; Hermes receives; Nack submits/notifies. This is an app-source correction, NOT the earlier performance evidence-only R1.

Read AGENTS.md/project contracts, current HANDOFF/TASKS, the local Next styling guidance before editing, `docs/handoffs/CP-COLOR-01-output/REVIEW.md` and `CP-COLOR-01-REVIEW-RECEIPT.md`. This named task overrides the generic first-incomplete milestone/full-suite/full-build cycle for this focused pass only. No sample, redesign, whole-product re-review or performance/R1 reopening.

## Exact scope

F1: restore the RECEIVED PRE-COLOR non-color utilities identified by Luna, while retaining the new cream/rose color utilities:
- LoginForm brand mark: shadow-xs -> shadow-md.
- LoginForm main card: shadow-sm -> shadow-xl; restore backdrop-blur-md.
- DesktopSidebar brand mark: shadow-xs -> shadow-md; remove only the newly added active-item font-semibold (retain the existing inherited weight).
- Settings back-to-Planner Link and DiscardConfirmDialog keep-editing button: remove only their newly added bare `border` width utility. Do not remove existing border colors, other pre-existing borders or alter dimensions/layout.

F2: only fix the two reported LOGIN color pairs. Email placeholder becomes `placeholder:text-[#746365]` on white (5.65237:1). Email and password input RESTING borders become `border-[#9C8B8E]` on white (3.23215:1); password has the same failing border pair, so keep the two inputs consistent. Preserve white fill, text color, existing border width, focus ring/border, labels, submission/auth logic and all other controls. Do not replace every pink border, recolor the whole app or add outline/size/opacity workarounds. Recompute from actual source values without rounding before threshold tests: normal placeholder >=4.5:1; resting boundary >=3:1.

## Allowed writes and preservation

Only these four existing app files, and only the F1/F2 token changes above:
1. `src/components/auth/LoginForm.tsx`
2. `src/components/shell/DesktopSidebar.tsx`
3. `src/app/[locale]/settings/page.tsx`
4. `src/components/planner/DiscardConfirmDialog.tsx`

Only current routing/status blocks in TASKS.md/HANDOFF.md; new result/check artifacts under `docs/handoffs/CP-COLOR-01-F1F2-output/`. Reserve its REVIEW.md and reviewer-checks/ for Luna. No other source, tests, config, package/lock, existing handoff/report/check edits. The original implementation RESULT, HOLD review and all prior evidence remain unchanged; qualify inaccurate earlier assertions in the NEW result instead of rewriting history. Specifically withdraw universal typography/geometry and every-pair-contrast preservation claims, and explain that the existing icon.svg purple brand asset was outside the earlier utility scan/scope.

Correction baseline: `/Users/nack/.hermes/workspaces/content-planer/CP-COLOR-01-F1F2/baseline/manifest.json`; all four editable source files and root status docs have .before copies there. Confirm hashes before edits and stop on unexpected concurrent changes. The original color baseline remains the pre-color reference; the correction baseline is the received HELD candidate. Never use Git HEAD to overwrite inherited performance/color work.

No app-source files outside the four; no handlers/DOM/spacing/fonts beyond the exact restoration, new dependencies, private/env reads, services/browser/login, network/DB/Storage/import/account operations, Git writes, stash/reset/clean, deployment or host changes. Keep existing semantic/platform/pillar colors and accepted performance work unchanged.

## Finite evidence and checks

Before running, create `docs/handoffs/CP-COLOR-01-F1F2-output/checks/verify-f1f2.mjs`: a small no-network source/contrast checker using only Node built-ins. It may read only the four sources, their .before copies and the correction manifest. Check each named F1 utility at its exact element, verify F2 values on email/password inputs and their white fill/focus preservation, compute relative-luminance contrast on those actual values, and reject source differences beyond the specified changes. Emit explicit per-finding assertions and measured pairs. Do not import app/SDK code, invoke subprocesses, read credentials, run a server or change the existing test runner/assertions. The checker and its claims are independently reviewed later; a supplied script is not self-proving. Label it source/contrast proof, not mounted/browser testing.

Run the following final sequence once, in order; stop on first nonzero/blocked gate, retain outputs and do not retry/fix-loop. Record exact argv, separate stdout/stderr, exit and artifact hashes in checks/manifest.json. A command NOT RUN has no invented exit.

1. `node docs/handoffs/CP-COLOR-01-F1F2-output/checks/verify-f1f2.mjs`
2. `npx --no-install eslint -- "src/components/auth/LoginForm.tsx" "src/components/shell/DesktopSidebar.tsx" "src/app/[locale]/settings/page.tsx" "src/components/planner/DiscardConfirmDialog.tsx"`
3. `npx --no-install tsc --noEmit`
4. `git diff --check`

No full npm test, original 31-test sequence, performance/auth/DB/import suite, full lint or fresh build in this focused pass. Prior full checks remain historical; production build is a later deployment boundary, not claimed current proof. File/hash inventory and exact source diff inspection are required; they are not extra app execution. Source checker cannot establish actual rendering; real-account/browser UAT remains explicitly deferred.

## Deliverable and stop

Write `docs/handoffs/CP-COLOR-01-F1F2-output/RESULT.md`: F1/F2 correction mapping, exact changed files/tokens and fresh line references, retained/withdrawn evidence claims, actual scoped checks/contrasts/counts/limits and protected-file hash accounting. State original HOLD retained pending same-reviewer F1/F2-only follow-up; no broader acceptance. Mark LOCAL ONLY, NOT DEPLOYED, hosted UAT NOT READY.

Return `CP-COLOR-01-F1F2-DONE` or `CP-COLOR-01-F1F2-BLOCKED` and exact result path, then STOP. Do not submit to Luna, start another phase, auto-correct again or deploy.
