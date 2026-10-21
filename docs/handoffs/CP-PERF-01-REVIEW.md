# CP-PERF-01 — Sole Primary Review Assignment

Status: PREPARED for Nack to submit in `jaah-review of content-planer`; one primary review, not an implementation/correction grant.
Workspace: `/Users/nack/contentPlaner`; HEAD `2225a7620f992a7865fc5eba33be548edbbdbec9`, with the uncommitted candidate pinned below.
Read AGENTS.md, CP-PERF-01.md, CP-PERF-01-INTAKE.md, the current HANDOFF.md block, RESULT.md and retained checks before deciding.
Original contract: `docs/handoffs/CP-PERF-01.md`.
Exact candidate source/result/check identity: `/Users/nack/.hermes/workspaces/content-planer/CP-PERF-01/incoming/manifest.json`.
Original dirty-source baseline: `/Users/nack/.hermes/workspaces/content-planer/CP-PERF-01/baseline/manifest.json`.
Verify pinned hashes before any acceptance command and again after allowed evidence writes. If app/result/check hashes have changed, stop as BLOCKED and report the exact paths rather than reviewing an unidentified candidate. Do not modify the seals.

## Scope and gate

Review the entire C1-C5 contract and affected initial-read/navigation paths for major correctness, data/identity isolation, auth, freshness, errors and usability regressions. Review all in-scope blockers once; optional polish stays backlog. Hermes performed intake only and did not rerun tests or issue an acceptance verdict.

Specifically assess the intake's evidence questions: supplied-context auth counters versus real auth factory calls; the standalone cachedReader/custom-dispatcher test versus production cache wiring; source scans versus mounted navigation; invalid-claims and query-error coverage; preserved mutation/query contracts. Do not assume test names or implementer prose prove a boundary. Do not invent a security leak or product bug solely from missing browser evidence.

C1 real-browser interaction, actual hosted signed-in timing, hosted RLS and owner UAT were explicitly deferred or unavailable in this pass. Report those as NOT RUN/UNVERIFIED, not automatically as new mandatory infrastructure work. Required source/synthetic C2-C4 claims must still have sufficient independent evidence; unsupported required claims may justify HOLD. Do not relax missing required evidence into PASS, and do not require a real-account/DB test forbidden by the owner.

## Permission and finite execution

Read-only inspection, hashes, git status/diff and the original five final commands are authorized for this sole reviewer. Do not install tools, edit app/tests/configs, start servers, log in with real accounts, access env values, call hosted Supabase, run DB/migration/import/password suites, commit/push/deploy, or auto-fix. Inspect the new test's imports/hooks first to establish no-network synthetic execution safety. If unsafe, mark that command BLOCKED/NOT RUN; do not replace it with a different test harness.

Run the following sequence at most once, in order, stopping on the first nonzero/blocked result. Retain each exact argv, stdout, stderr and exit in a fresh `docs/handoffs/CP-PERF-01-output/reviewer-checks/` directory. Do not overwrite implementer logs. Do not rerun, broaden, filter or add an ad hoc runtime probe after a failure; read-only consolidation/reporting is still allowed.

1. `node --loader ./tests/test-loader.mjs --test tests/navigation-performance.test.mjs tests/planner-list.test.mjs tests/task-list.test.mjs tests/task-content-search.test.mjs tests/localization-scanner.test.mjs`
2. `npx --no-install tsc --noEmit`
3. `npm run lint`
4. `npm run build`
5. `git diff --check`

These commands use existing dependencies and do not authorize full npm test or services. Check actual compiler/linter input coverage. Label source regexes and synthetic fakes honestly. Do not count untracked files as covered by git diff --check. A passing total is not evidence that assertions measure the claimed mechanism.

## Allowed outputs and final verdict

Only write:
- `docs/handoffs/CP-PERF-01-output/REVIEW.md`
- New files under `docs/handoffs/CP-PERF-01-output/reviewer-checks/`

No edits to root TASKS.md/HANDOFF.md; Hermes owns coordinator routing after this verdict. Preserve every inherited dirty/untracked file and implementer artifact. Record pre/post path/status/hash accounting including your own outputs; do not classify those approved outputs as unexpected scope.

REVIEW.md must contain PASS, HOLD or BLOCKED scoped to the demonstrated boundary; candidate manifest path/identity; C1-C5 evidence map; consolidated major findings with source/test references; optional backlog separated; actual command outcomes/counts and missing proof; preservation result; next actor. PASS is not deployment approval, UAT success or a zero-defect guarantee.

Do not fix findings or initiate another review/correction pass. Return `CP-PERF-01-REVIEW-DONE`, verdict and exact REVIEW.md path; STOP for coordinator decision. Nack will report completion.
