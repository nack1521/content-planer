# CP-PERF-01 Coordinator Intake

Date: 2026-10-20. Outcome: INTAKE-COMPLETE / PRIMARY-REVIEW-PREPARED. This is artifact intake, not an independent acceptance verdict.
Owner completion notice: Discord message `1562039921198239826`; owner also reports the review thread has been initialized. Actual reviewer model settings were not independently inspected.

## Candidate identity and preservation

Workspace `/Users/nack/contentPlaner`; HEAD remains `2225a7620f992a7865fc5eba33be548edbbdbec9`. Candidate app changes are uncommitted.
Original frozen baseline: `/Users/nack/.hermes/workspaces/content-planer/CP-PERF-01/baseline/manifest.json`.
Received immutable source/result/evidence hash seal: `/Users/nack/.hermes/workspaces/content-planer/CP-PERF-01/incoming/manifest.json` (149 selected files). This seal excludes mutable root TASKS.md/HANDOFF.md, so coordinator routing updates do not invalidate app/evidence identity.

The offline coordinator helper compared 125 baseline files with the incoming selected inventory: 112 unchanged, 13 modified, 26 added, zero removed, zero unexpected changes and zero damaged preserved copies. Of the modifications, 11 are app source/message files and two are task/status documents. Of the additions, nine are implementation/test files and 17 are result/check artifacts. The new optional navigationReads.ts was not created. All changed paths fit the handoff allowlist; this is path/hash accounting, not a functional code-review PASS.
Unrelated inherited dirty/untracked files retained baseline hashes. Git diff for the three action modules changes only necessary imports and the allowed initial read functions; mutation bodies are unchanged. No app source, tests, dependencies, account settings, database or deployment were changed by this intake. No acceptance tests/build were rerun by Hermes.

## Retained checks reconciled, not freshly rerun

Read checks/manifest.json, every declared stdout/stderr and each separate exit record. All five exit records contain `EXIT:0` and match manifest exit_code 0.
- Gate 1 exact selected Node command: aggregate 41 tests, 41 passes, zero failures/skips; 41 visible pass rows, including 17 CP-PERF-01 rows. Retained runner duration is 416.884 ms; RESULT.md's approximate ~770 ms is not the raw duration. Loader experimental warnings occur inside stdout, not stderr.
- Gate 2 npx --no-install tsc --noEmit: exit 0, empty retained output.
- Gate 3 npm run lint: exit 0, no retained diagnostics. Reviewer still needs to check configuration/coverage rather than treating an exit alone as coverage proof.
- Gate 4 npm run build: exit 0; retained output includes successful compilation/typecheck and 17/17 static-generation progress. This does not mean every application route is static: the route list marks protected app routes dynamic.
- Gate 5 git diff --check: exit 0, empty output; its whitespace coverage does not include untracked source files.

Intake parser note: first read-only parser expected bare integer exit text and failed on `EXIT:0`. Read the actual exit artifact, corrected the read-only parser to the explicit EXIT:<integer> format, and completed reconciliation. No tests, writes or extra runtime checks were run by the failed parser.

## Evidence questions for the sole reviewer

These are source/report sanity observations, not an acceptance verdict or permission to fix:
1. C1 tests read TSX source strings; they do not mount components or exercise delayed navigation. RESULT.md also says full browser testing was NOT RUN, but its 'DOM structure/React server-render contracts' wording needs evidence scoping. Browser keyboard/back/interruption/zero-shift claims are unverified, not automatically reproduced defects. Hosted UAT is explicitly later.
2. C2.1-C2.3 increment a counter in mockContext(), invoke that function once in the test, and inject its resolved context into production read actions. Assess whether this proves actual createClient/getClaims invocation counts from createNavigationReadContext, or only consumption of one provided context. There is no captured pre-fix runtime command/result; separate inferred source-before counts from observed after behavior. A percent change in call counts is not a percent reduction in elapsed auth overhead.
3. C2.5 constructs a custom React server dispatcher and memoizes a standalone cachedReader, not the exported production getCachedNavigationReadContext. Assess whether the generic React.cache demonstration supports the production request-cache claim. The app also has an explicit AsyncLocalStorage wrapper; inspect that actual wiring without demanding an unrelated cache rewrite.
4. C3 null/error contexts are supplied by the test. Distinguish coverage of downstream read guards from execution of the real getClaims-error branch. Assess actual identity isolation and ordinary query-failure behavior at the permitted synthetic/source boundary.
5. Query shapes/mutation bodies appear unchanged in the scoped action diff; full CRUD/real database persistence/hosted RLS were NOT exercised by this intake. Do not invent hosted performance or security proof.

## Routing and stop

Primary review contract: `docs/handoffs/CP-PERF-01-REVIEW.md`.
Copyable prompt: `docs/handoffs/CP-PERF-01-REVIEW-PROMPT.txt`.
Reviewer verdict target: `docs/handoffs/CP-PERF-01-output/REVIEW.md`.
No reviewer verdict exists at this intake. No theme work/deployment starts until the primary review decision and next approved phase. Local candidate remains NOT READY for hosted owner UAT. Nack submits the reviewer prompt and returns when the review is done; no polling or automatic correction loop.
