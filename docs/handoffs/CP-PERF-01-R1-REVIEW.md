# CP-PERF-01-R1 — Narrow Evidence Review

Status: PREPARED for the same Luna reviewer in `jaah-review of content-planer`. Owner grant `1562049297296658433`: one evidence-only correction and one R1-only review. Workspace `/Users/nack/contentPlaner`, HEAD `2225a7620f992a7865fc5eba33be548edbbdbec9`.

Read AGENTS.md, the current top HANDOFF block, original `docs/handoffs/CP-PERF-01-output/REVIEW.md`, `docs/handoffs/CP-PERF-01-R1.md`, the R1 RESULT and R1 INTAKE. Candidate seal: `/Users/nack/.hermes/workspaces/content-planer/CP-PERF-01-R1/incoming/manifest.json`. Correction baseline/.before bytes: `/Users/nack/.hermes/workspaces/content-planer/CP-PERF-01-R1/baseline/manifest.json`.
Verify sealed app/test/report/check hashes before runtime execution. New review outputs are the only authorized additions; root HANDOFF/TASKS are mutable coordinator routing and excluded from this candidate seal. Stop if any pinned existing file has drifted.

## Sole question: is R1 resolved at the approved synthetic production-function boundary?

1. Validate that the dedicated loader replaces only the external client-construction module with the intended single fixture identity. Inspect imports/hooks before collection: no real network/auth/DB/env access, spawn, server or password path. All src/** must match the correction baseline. Do not widen into production refactoring.
2. Inspect revised C2 assertions against actual factory -> createClient/getClaims -> ALS -> read-action execution for all four initial-read patterns. Captured counts must originate from production calls, not the test calling a local counter once. Verify representative successful data/owner filters, fresh subsequent identity and actual claims-error zero-query control. Do not treat sequential fixture state as concurrent isolation evidence.
3. Reconcile corrected RESULT claims: old pre-fix counts are source-derived, actual new counts are synthetic dependency observations, generic React.cache is not production fallback/Next lifecycle proof, static C1 checks are not mounted/browser evidence, and payload tests are representative. Check cited line ranges against current source; preserve original logs and historical HOLD, do not demand reconstructing historical RED.
4. Preserve unrelated prior accepted review rows and deferred boundaries: no fresh C1-C5 audit, optional cosmetic backlog, browser infrastructure, hosted timing/auth/RLS or full CRUD gate. The absence of explicitly deferred evidence is not a new R1 blocker. Do not turn a scoped R1 PASS into full product/browser/UAT/release PASS.

## One finite sequence

After safety/hash checks, run at most once in this order and stop execution at the first nonzero or blocked command. Fresh raw exact argv/stdout/stderr/exit go under `docs/handoffs/CP-PERF-01-R1-output/reviewer-checks/`; do not overwrite implementer logs.

1. `node --loader ./tests/test-loader.mjs --loader ./tests/navigation-r1-loader.mjs --test tests/navigation-performance.test.mjs`
2. `git diff --check`

No full suite, typecheck/lint/build cycle, additional runtime probes, browser/server, dependency install, source/test/report fixing, env/private data, DB/account operations, Git writes or deployment. Non-writing source/hash inspection and final preservation accounting are allowed. A setup/fixture failure is BLOCKED evidence, not a product RED; retain it and stop, no repair/retry.

## Outputs and verdict

Write only `docs/handoffs/CP-PERF-01-R1-output/REVIEW.md` and new files in its reviewer-checks/ directory. Do not modify original REVIEW/RESULT, prior evidence, root status docs or this assignment.
Record candidate identity, scoped R1 PASS/HOLD/BLOCKED, actual checks/counts, remaining limits, protected-hash/path/status verification including reviewer outputs and one consolidated disposition. If HOLD, identify whether the exact remaining gap is missed-existing, correction-introduced or unknown; do not open another task or correction loop. Return `CP-PERF-01-R1-REVIEW-DONE` with verdict/report path, then STOP for coordinator intake. No automatic next pass.
