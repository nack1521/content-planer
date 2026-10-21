# CP-COLOR-01 — Sole Material-Regression Review

Status: PREPARED for Nack to submit in `jaah-review of content-planer`; not submitted by Hermes. Workspace `/Users/nack/contentPlaner`, HEAD `2225a7620f992a7865fc5eba33be548edbbdbec9`. This is the single theme review in the approved sequence, not permission to fix/deploy.
Read AGENTS.md, current HANDOFF/TASKS, `docs/handoffs/CP-COLOR-01.md`, CP-COLOR-01-INTAKE.md and CP-COLOR-01-output/RESULT.md with retained logs.
Received-color baseline/.before copies: `/Users/nack/.hermes/workspaces/content-planer/CP-COLOR-01/baseline/manifest.json`.
Candidate seal: `/Users/nack/.hermes/workspaces/content-planer/CP-COLOR-01/incoming/manifest.json`. Verify pinned existing hashes before checks and after review. This seal excludes mutable root routing documents; only your approved review artifacts may be added.

## Review the actual requested boundary

Owner explicitly canceled sample/design expansion and requested COLORS ONLY. Evaluate material correctness, unreadable colors, interaction/data/auth regressions and direct violations of the no-layout/type/geometry contract. Compare candidate to the received color baseline (not HEAD, which lacks already-reviewed performance work). Preserve CP-PERF/R1 acceptance and its proof limits. No sample, broad redesign, benchmark, fresh R1 or unrelated fixture/style audit.

Check C1-C3 in the color handoff. Verify scope with actual changed class/declaration differences, not path names alone. Specifically assess the intake's sidebar shadow/font changes against the explicit color-only limit and the result's zero-change claims. Consolidate material findings; distinguish an exact requirement/scope deviation from a hypothetical major functional bug or optional polish.

Verify central tokens and important changed text/background/focus pairs, including light-shell inactive/active/hover states, primary controls, login and loading/dialog states. State what pairs were actually assessed. Preserve intentional semantic/platform/user-defined color exceptions; do not demand eliminating every purple occurrence. Broader all-pairs/WCAG or browser claims require evidence. If checking compiled colors, inspect existing build assets without mistaking CSS presence for runtime rendering.

Browser, real-account visuals, hosted performance/RLS and owner UAT were explicitly deferred; report NOT RUN/UNVERIFIED, not an automatic infrastructure requirement. No app server/browser login or network grant. A static accessibility test is not keyboard/render proof. The four warnings in baseline-identical R1 tests/fixture are known inherited warnings, not a color-pass regression or permission to fix tests.

## Finite checks and preservation

Read-only source/hash/git inspection and offline contrast arithmetic are permitted. Inspect the frozen test imports/hooks for no-network synthetic/source-only behavior before running. Run this sequence once, in order, stop on the first nonzero/blocked result; no retries/filters/extra runtime probes. Preserve exact argv, separate stdout/stderr and exit records under a fresh `docs/handoffs/CP-COLOR-01-output/reviewer-checks/` directory; do not overwrite implementer logs.

1. `node --loader ./tests/test-loader.mjs --test tests/planner-list.test.mjs tests/task-list.test.mjs tests/task-content-search.test.mjs tests/localization-scanner.test.mjs tests/accessibility.test.mjs`
2. `npx --no-install tsc --noEmit`
3. `npm run lint`
4. `npm run build`
5. `git diff --check`

No full npm test, performance/DB/auth/import suite, env/private-data access, install, server/browser, network/DB/account operation, source/test/report fixing, Git writes or deployment. A platform guard that never runs a command is BLOCKED/NOT RUN with no exit, not a failing product test; stop the acceptance sequence rather than repeatedly retrying or bypassing a permission gate. Non-executing read-only report consolidation remains allowed.

## Outputs and verdict

Only write `docs/handoffs/CP-COLOR-01-output/REVIEW.md` and new reviewer-checks/ artifacts. Preserve all received app, test, report, historical evidence and unrelated dirty/untracked bytes. Record final path/status/hash accounting after your outputs exist; immutable source seal must still match.

Write PASS/HOLD/BLOCKED for the agreed color-only source/checked boundary, consolidated material findings with exact references, optional polish separately, measured contrast coverage, actual commands/counts/warnings and unverified browser/UAT limits. No zero-defect, all-WCAG, deployed or owner-accepted claim. No autonomous correction loop. Return `CP-COLOR-01-REVIEW-DONE`, verdict and exact report path, then STOP for coordinator decision.
