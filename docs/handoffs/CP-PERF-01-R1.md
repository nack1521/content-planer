# CP-PERF-01-R1 — Evidence-only correction of the auth-count HOLD

Status: PREPARED, not submitted. Owner approval: Discord `1562049297296658433`, responding to the proposal for one test/evidence correction and one narrow R1 review, with no application changes.
Workspace: `/Users/nack/contentPlaner`; received HEAD `2225a7620f992a7865fc5eba33be548edbbdbec9`.
Budget: one bounded evidence implementation pass, then the same Luna reviewer checks R1 only. No automatic additional pass, feature work, theme work or deployment.

## Read and frozen finding

Read AGENTS.md, the current TASKS.md/HANDOFF.md block, `docs/handoffs/CP-PERF-01-output/REVIEW.md`, the original CP-PERF-01 handoff and this correction. Preserve the original review verdict HOLD and its checks exactly. Its sole blocking R1 is that supplied-context counters do not execute/count the production createNavigationReadContext -> createClient -> getClaims path; the standalone cachedReader is not production-cache proof. No confirmed major app defect was found. C1 browser/navigation, hosted timing/RLS and owner UAT remain explicitly deferred; do not add those gates now.

## Required correction

1. Instrument the existing production factory/read seam without editing it. Execute the actual exported createNavigationReadContext, withNavigationReadContext and production initial-read actions. Replace ONLY the external client-construction dependency in the isolated test process with a synthetic client whose createClient and auth.getClaims calls are captured. Do not replace the production factory, AsyncLocalStorage wrapper, read actions or verified result with a precomputed context. Source-string counts and a test-local mockContext counter are not the acceptance signal.
2. Exercise the same explicit ALS factory/fan-out pattern wired in the four page sources: Planner/Calendar with two initial reads; Tasks/Ideas with three. Assert actual factory dependency call counts (one createClient and one getClaims per independent page-read scope), expected owner-filtered queries and representative populated payloads. Do not call a counter manually to manufacture the expected total.
3. Run an independent subsequent request through the actual factory with a different fictional identity, proving a fresh client/claims resolution and no retained previous identity. Include a real factory getClaims-error result leading to zero owner-data queries. Keep controls small and synthetic. Use valid fictional UUIDs for new fixtures.
4. The explicit ALS path is enough for this R1 factory/read correction; do not build a Next server or manipulate React internals to prove a full request lifecycle. If retaining the standalone React.cache demonstration, label it generic library behavior only. Its fallback production cache/Next renderer behavior remains unverified unless directly exercised without expanding scope. A factory/read seam test is not a rendered route/page/browser test.
5. Correct RESULT.md claims consistently: distinguish source-derived old counts, newly observed synthetic factory call counts, generic cache demonstrations, static C1 scans, representative payload assertions and unmeasured hosted latency. Remove elapsed-auth-overhead percentages. Do not invent pre-fix execution or historical RED. Keep original check outputs as historical and point to new R1 outputs. The original RESULT.md and test bytes are preserved in the correction baseline; do not overwrite original logs or REVIEW.md.

## Exact write allowlist

Existing editable:
- `tests/navigation-performance.test.mjs`: C2/R1-related tests, imports and synthetic fixture support only. Preserve unrelated C1/C3/C4/C5 assertions and existing legitimate sorting/pagination/localization tests. Do not weaken a valid assertion to obtain PASS.
- `docs/handoffs/CP-PERF-01-output/RESULT.md`: qualify/withdraw only the evidence claims above and link the correction result; preserve historical check provenance.
- `TASKS.md`, `HANDOFF.md`: current CP-PERF-01/R1 state only.

New files:
- `tests/navigation-r1-loader.mjs` — required for the frozen final command.
- `tests/navigation-r1-fixture.mjs` — create only if needed.
- Files under `docs/handoffs/CP-PERF-01-R1-output/` except REVIEW.md (reserved for Luna).

Use a separate loader/fixture to substitute the exact `@/utils/supabase/server` import; do not change shared tests/test-loader.mjs. Loaders must scope replacements to this isolated test invocation, must not forward fixture/client calls to real Supabase, and must resolve the same fixture module identity for the tests and production import. If a different test seam or source change is required, STOP and report the precise blocker. Do not silently broaden the allowlist.

Protected: ALL src/**, original handoff/prompts, original REVIEW.md/reviewer-checks/checks, package/lock/config files, shared test loader, all unrelated dirty/untracked files. No app refactor, env/private-data access, service-role credentials, network calls, server/browser starts, installs, database/account operations, Git writes or deployment. This is a new owner-approved correction, not a reset of the historical review budget.

## Baseline and finite verification

Frozen correction baseline: `/Users/nack/.hermes/workspaces/content-planer/CP-PERF-01-R1/baseline/manifest.json`. Received editable test/report/status documents have .before copies outside discovery. Verify source/protected hashes before editing; preserve any unexpected concurrent bytes and stop if identity has drifted. Do not edit baseline/manifests or this handoff/prompt.

Use installed Node/dependencies only. The new loader/fixture must be safe before test collection: no env reads, real network/DB clients, top-level external execution or services. New behavioral regressions must assert calls from production code, not only injected state. Ordinary RED/GREEN development inside this one pass is allowed; retain actual runs, no fabricated historical results.

Final checks, once in order, stop after first failure/block:
1. `node --loader ./tests/test-loader.mjs --loader ./tests/navigation-r1-loader.mjs --test tests/navigation-performance.test.mjs`
2. `git diff --check`

No full-suite rerun, lint/build/typecheck cycle, browser infrastructure or unrelated tests are required for this test/report-only correction; prior app gates remain historical. These commands do not authorize extra runtimes or another correction loop. Do not count git diff --check as coverage of new untracked files; inspect their actual bytes. Retain exact argv, stdout, stderr and exit for each run in fresh R1-output/checks files. If collection/setup fails, label it a harness blocker, not a product RED; do not bypass a blocked execution or add an unapproved final retry.

## Result and stop

Write `docs/handoffs/CP-PERF-01-R1-output/RESULT.md`: R1 disposition and exact source/test lines, actual factory dependency observations, retained assertions, corrected/withdrawn claims, real command totals/exits, protected-hash accounting, remaining proof limits. Update current root status to R1-IMPLEMENTED-AWAITING-REVIEW or R1-BLOCKED without changing the original HOLD verdict. Do not self-author REVIEW.md or mark whole-product PASS.

Return `CP-PERF-01-R1-DONE` or `CP-PERF-01-R1-BLOCKED`, exact result path, then STOP. Nack reports completion; Hermes intakes the result and prepares one narrow R1-only review for Luna. Theme implementation and deployment remain outside this pass.
