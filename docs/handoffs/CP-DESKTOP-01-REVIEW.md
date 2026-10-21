# CP-DESKTOP-01 — Sole Primary Review

Status: PREPARED for Nack to submit to the existing Luna thread. Workspace `/Users/nack/contentPlaner`, received HEAD dbbe3f19e0d8f66d737b591e4eaadcb38885ca26. Review the owner's desktop outcomes, not another color/performance redesign.
Read AGENTS/current root status, CP-DESKTOP-01.md, CP-DESKTOP-01-INTAKE.md, RESULT and retained logs.

## Identity and material cases

Verify all existing entries of `/Users/nack/.hermes/workspaces/content-planer/CP-DESKTOP-01/incoming/manifest.json` before/after review. Record mutable root status hashes separately and leave them unchanged. Received baseline/.before copies `/Users/nack/.hermes/workspaces/content-planer/CP-DESKTOP-01/baseline/manifest.json`; compare there, preserving inherited dirty work, not blindly with HEAD.

- Sidebar: inspect sticky viewport-height containment in the unchanged AppShell/ancestor flow, nonshrinking header/footer, independently scrollable middle nav, short-window keyboard reachability and loading/menu stability at the source boundary. Do not declare measured positions or 'always pinned' from h-screen presence alone. Do not force a new scroll-system design when current structure suffices.
- Tasks: left padding preserves button size and fixed-fit/description-last table; inert row clicks open the correct task once, checkbox only toggles, title still opens once via keyboard/native button, linked content retains existing content-editor action, text selection is not stolen. Inspect exact live handlers and wiring, table semantics, mobile blocks, sorting/paging/focus/data preservation.
- Claims: distinguish all 26 recorded tests from actual-handler execution. The new test currently executes a handwritten mirror despite finding production source. Independently assess actual code and the bounded probe below; no code/test fixing or automatic HOLD solely because a safely verifiable evidence seam can be covered by the primary reviewer. Preserve report bytes; qualify universal/no-overflow/all-regression statements and routing-count discrepancy instead of accepting them as rendered proof.

## Exact production-handler probe, no infrastructure expansion

After inspecting the production function and test imports for side effects, author only `docs/handoffs/CP-DESKTOP-01-output/reviewer-checks/row-handler-probe.mjs`. Use installed TypeScript to locate/extract the actual handleRowClick arrow from TasksView (AST preferred), remove types, and execute that exact body with injected synthetic window/getSelection and a handleOpenEdit spy. Do not copy/rewrite/reimplement the algorithm or load the full app/SDK. Assert positive inert areas pass the actual task once, nested button/SVG/content/title/control targets do not invoke row editing, selected text suppresses opening and primary/modifier handling follows source. Do not weaken expectations to match a defect. Direct source inspection must independently verify the actual child stopPropagation/action callbacks; a parent guard probe does not prove DOM event bubbling. Only builtin filesystem/assert and installed TypeScript imports, no writes except fresh reviewer evidence, no env/network/subprocess/account/service calls.
If exact extraction cannot be done within these tools/scope, report BLOCKED/evidence limit and stop; do not install/refactor for testability.

## Finite final sequence

Run once in order after safety inspection, stop on first nonzero/platform block, no retries. Capture each exact argv, separate stdout/stderr/exit and hashes under fresh reviewer-checks/:
1. `node --loader ./tests/test-loader.mjs --test tests/desktop-ux.test.mjs tests/task-list.test.mjs tests/task-content-search.test.mjs tests/accessibility.test.mjs`
2. `node docs/handoffs/CP-DESKTOP-01-output/reviewer-checks/row-handler-probe.mjs`
3. `npx --no-install tsc --noEmit`
4. `npm run lint`
5. `npm run build`
6. `git diff --check`

The single extra offline probe is explicit independent evidence for the already-required production-handler boundary, not a new app/runtime project. No full npm test, previous performance/F1F2/auth/DB/import suite, browser/server/real login, private/env data, network/DB/account operation, install, source/test/config/report edit, Git write or deployment. Inherited warnings are not a cleanup task. Build may regenerate normal ignored artifacts; do not call them source changes.

Browser positions/hit-testing/auth/data UAT were explicitly deferred. Mark NOT RUN/UNVERIFIED, not a new infrastructure prerequisite. Source/synthetic checks cannot establish rendered dimensions or actual pointer behavior.

## Output and stop

Only new CP-DESKTOP-01-output/REVIEW.md and reviewer-checks/ artifacts may be written. Preserve implementer reports/logs, old review/evidence, source/tests and unrelated work. After outputs exist, record final path/hash and status preservation. Write PASS/HOLD/BLOCKED for the agreed source/synthetic boundary, consolidate material findings with exact references, optional polish separately, actual fresh/retained evidence and explicit browser/hosted limits. No zero-defect/rendered/deployed/UAT claim.
Return CP-DESKTOP-01-REVIEW-DONE, verdict and exact report path, then STOP. No autonomous fix/correction or another primary review.
