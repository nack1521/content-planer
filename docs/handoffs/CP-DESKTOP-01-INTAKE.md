# CP-DESKTOP-01 — Coordinator Intake

Owner completion notice: Discord `1562275108431859743`. Implementation received; sole Luna review PREPARED, not submitted. LOCAL ONLY, NOT DEPLOYED. No primary verdict by coordinator.

## Scope/provenance reconciliation

Compared with `/Users/nack/.hermes/workspaces/content-planer/CP-DESKTOP-01/baseline/manifest.json`: 263 baseline entries, 259 unchanged, four authorized modifications (DesktopSidebar.tsx, TasksView.tsx and two root routing documents), 18 authorized additions (new test plus 17 report/check files), zero removals/unexpected paths/damaged .before copies. AppShell.tsx and all other protected app/test/config/prior-evidence files remain byte-identical. RESULT/HANDOFF's '261 other entries unchanged' omits the two changed routing docs; use computed 259. No acceptance implication from path accounting alone.

All 15 hash-listed raw artifacts match manifest sizes/hashes. Exact argv/order and actual exit records reconcile: all five exits 0. Raw tests show 26 tests/26 passes/zero fail/skip and 26 visible pass rows. Lint has zero errors/four inherited warnings; build records successful compilation/typecheck and 17/17 generation. Hermes did not rerun acceptance or fix code.

## Important claim mismatch for the sole reviewer

`tests/desktop-ux.test.mjs` locates `handlerMatch` from production source, but does not execute that extracted function. Lines 121-143 run a separately handwritten `runProductionRowClickLogic` mirror; the source match establishes presence only. Therefore the RESULT/test title's 'production logic execution' wording is not supported by those 26 passing tests. Its mock closest also does not actually implement attribute selectors. These are evidence limits to assess, not a confirmed broken product behavior or a coordinator HOLD verdict.

The actual small production handler and button wiring are available for independent primary assessment. The reviewer contract permits one tightly bounded, read-only actual-handler probe using installed TypeScript and synthetic targets, saved only under reviewer-checks. This closes the independent verification boundary without modifying source/tests, adding dependencies or requesting a new implementation loop just to replace the implementer's test mirror. No claim that such a probe proves real browser bubbling/rendering.

Sidebar position/short-window reachability, no horizontal overflow and 'zero regressions' statements remain unverified rendered claims: source-class assertions and source diff do not measure coordinates. Browser/authenticated UAT was explicitly deferred. Do not add browser infrastructure, require real login or reopen accepted theme/performance/F1F2 gates.

## Route

`docs/handoffs/CP-DESKTOP-01-REVIEW.md`; exact prompt `docs/handoffs/CP-DESKTOP-01-REVIEW-PROMPT.txt`; verdict `docs/handoffs/CP-DESKTOP-01-output/REVIEW.md`.
Incoming seal `/Users/nack/.hermes/workspaces/content-planer/CP-DESKTOP-01/incoming/manifest.json`, excluding mutable root status docs. Nack submits to the same Luna thread. One material-regression review, no fixes/commit/push/deploy/automatic correction or second reviewer. Current Production remains dbbe3f1, unaffected by this local candidate.
