# CP-PERF-01 — Sole Primary Review

## Verdict: HOLD

This is a bounded primary review of the local CP-PERF-01 candidate, not deployment approval or a zero-defect guarantee. I found no confirmed major source-level auth, ownership, query-shape, mutation, or navigation regression in the reviewed scope. HOLD is for one required evidence gap: the claimed production-path authentication deduplication count was not actually measured by the supplied tests.

## Candidate identity

- Workspace: `/Users/nack/contentPlaner`
- Base: `main` at `2225a7620f992a7865fc5eba33be548edbbdbec9`
- Candidate seal: `/Users/nack/.hermes/workspaces/content-planer/CP-PERF-01/incoming/manifest.json`
- Candidate manifest SHA-256: `e3d2adb58a33dacb232dd8cb5aa16fa3f70d8b9da6fb265163aac2907aba0452`
- The seal's 149 selected candidate/result/check files matched before the authorized checks; final verification is recorded in `reviewer-checks/postflight.json`.
- Retained implementer outputs were read and reconciled; those are implementer evidence, not fresh reviewer telemetry. Fresh raw reviewer command outputs are under `reviewer-checks/`.

## C1–C5 evidence map

### C1 — Navigation and route-loading feedback

- **Source:** `DesktopSidebar.tsx` and `MobileNav.tsx` place `NavigationPending` beneath each of the five Next `<Link>`s; the mobile link is positioned for its indicator. All five route folders have a `loading.tsx` rendering the corresponding `PageLoading` variant. `NavigationPending` uses `useLinkStatus` without intercepting link events; `PageLoading` provides localized status text and a visual skeleton.
- **Framework context:** Installed Next 16.3.5 docs say `loading.tsx` supplies a Suspense fallback while shared layouts remain interactive/interruptible, and `useLinkStatus` belongs in a Link descendant. This supports the source design, not an exercised user journey.
- **Synthetic test:** `tests/navigation-performance.test.mjs:27-88` checks source strings, file existence and attributes. It does not mount the components, render a delayed transition, or assert populated content replacing a fallback. RESULT.md's phrase “DOM structure and React server-render contracts” is stronger than the retained test establishes.
- **Browser/hosted:** Keyboard activation, browser back/interruption, actual pending state, rendered layout shift, and final content were **NOT RUN**. Real-browser testing and hosted owner UAT were explicitly deferred; this is not treated as a new infrastructure requirement.
- **Assessment:** No major source-level navigation regression found; interactive behavior remains unverified.

### C2 — Initial-read authentication fan-out and payload

- **Source:** Each changed page calls `createNavigationReadContext()` once and invokes its initial reads inside `withNavigationReadContext(...)`. The read actions use `getNavigationReadContext()` and the action diff removes their individual `createClient()`/`getClaims()` calls. The changed production code therefore has a coherent source-level design for one context resolution per page render, with the same context supplied to its parallel reads.
- **Synthetic test limitation (major finding R1):** `tests/navigation-performance.test.mjs:267-338` calls a test-local `mockContext()` once, increments a counter there, and injects the already-created context into the production read actions. Its assertion proves that this test called its own mock once and that the actions consume a supplied context; it does **not** count calls to production `createNavigationReadContext()`, `createClient()`, or `getClaims()` on a page/read path.
- **React cache test limitation:** `tests/navigation-performance.test.mjs:371-423` creates a separate `cachedReader` and manually installs a React server dispatcher. It does not call the exported `getCachedNavigationReadContext`. The actual page path uses the explicit AsyncLocalStorage wrapper; the test does not verify that wiring or a Next request lifecycle.
- **Before/after claim:** The old per-action calls are inferable from the sealed base-source diff (two or three reads each had their own client/claims call). No retained pre-fix runtime counter exists. The “2–3 down to 1” counts/percentages are therefore source-derived, not measured observations; they do not establish elapsed-time savings or fewer network round trips.
- **Payload:** The production query and mapping remain unchanged in the action diff. The synthetic payload assertions at `tests/navigation-performance.test.mjs:340-369` cover representative fields and relationships, not every mapped field despite the report's “completely preserved” wording.
- **Assessment:** **Required evidence gap.** Source inspection supports the intended implementation, but the required observed count at the actual production seam is not independently established. No source defect is alleged. This is the reason for HOLD.

### C3 — Missing identity, isolation and failures

- **Source:** `navigationReadContext.ts:15-44` obtains verified claims and returns no user ID on missing claims/auth errors; read actions check both `userId` and client before querying and retain owner-scoped `.eq("user_id", userId)` filters. Mutations continue using their own `createClient()` and `getClaims()` path; the reviewed diff changes only the allowed initial-read functions/imports.
- **Synthetic test:** `tests/navigation-performance.test.mjs:429-498` verifies downstream behavior with supplied null/error contexts and separate fictional A/B contexts. It does not execute the production `getClaims()` failure branch or prove hosted RLS. The new tests do not inject an ordinary query failure; source branches return their existing fetch/service errors.
- **Assessment:** Synthetic/source evidence supports fail-closed handling and owner separation; hosted RLS and the real auth-error branch are **UNVERIFIED**. No cross-user leak or newly introduced query-error defect was found.

### C4 — Freshness and existing data behavior

- **Source:** The context contains auth/client state only; query results are not stored in a module-global or persistent cache. The route pages create a fresh context per render. Existing query projections, row mapping, mutation bodies, date-clearing behavior, and task/content contracts are unchanged in the scoped diff.
- **Synthetic/check evidence:** `tests/navigation-performance.test.mjs:504-563` checks distinct data on two supplied contexts and date-null fields. The selected suite also passed the existing planner/task sorting-pagination and task-content-search tests. These are synthetic/unit boundaries, not database persistence or full CRUD proof.
- **Assessment:** No major freshness or CRUD regression identified from source and authorized tests. Real database persistence and authenticated reloads were **NOT RUN**.

### C5 — Localization, focus and responsive usability

- **Source/synthetic:** Matched Thai/English loading keys are present. The selected localization scanner and navigation string/parity assertions pass. Existing Link keyboard behavior and focus styling were not replaced by custom click handlers.
- **Limit:** No mounted keyboard/focus test, rendered viewport measurement, or browser visual check was run. Static class/attribute checks do not establish actual focus announcement, clipping, or mobile layout.
- **Assessment:** No major source-level usability regression found; rendered behavior remains unverified.

## Consolidated major finding

**R1 — HOLD: actual auth-call deduplication is asserted through a supplied mock, not observed at the production factory seam.** The retained tests cannot substantiate the reported “exactly one authentication call” or percentage reduction. The separate React cache demonstration also does not exercise the exported production cache wrapper. Keep the implementation's source-level one-context-per-page design distinct from runtime measurement; do not claim measured hosted speedup. The next decision belongs to the Coordinator; no correction or second review was started here.

## Authorized reviewer checks

Run once in the contract's order; all exited 0. Exact argv, stdout, stderr and exit records are in `reviewer-checks/manifest.json` and its per-gate files.

1. `node --loader ./tests/test-loader.mjs --test tests/navigation-performance.test.mjs tests/planner-list.test.mjs tests/task-list.test.mjs tests/task-content-search.test.mjs tests/localization-scanner.test.mjs` — **PASS**, 41 passed, 0 failed, 0 skipped; raw duration 876.319 ms.
2. `npx --no-install tsc --noEmit` — **PASS**, exit 0, no stdout. TypeScript config includes `**/*.ts`, `**/*.tsx`, and `**/*.mts`; `node_modules` is excluded.
3. `npm run lint` — **PASS**, exit 0, no ESLint diagnostics. The installed Next ESLint config targets JS/TS/JSX extensions including `.ts`/`.tsx`; global ignores are build outputs and `next-env.d.ts`. npm emitted only its `allow-scripts` user-config warning on stderr.
4. `npm run build` — **PASS**, exit 0; Next.js 16.3.5 compiled/typechecked and generated 17/17 SSG pages. Protected app routes remain listed as dynamic. npm emitted the same user-config warning on stderr.
5. `git diff --check` — **PASS**, exit 0, empty output. This checks the tracked diff only; it does not cover the new untracked source/test files.

The suite's source assertions and synthetic fakes are not browser, hosted-auth, RLS, or persistence evidence. No full `npm test`, DB/auth/account operation, login, server start, deployment, commit, or push was performed.

## Optional backlog (non-blocking)

- If later required, add a bounded synthetic probe that instruments the actual production context factory/read path; keep it no-network/no-database and avoid treating generic `React.cache` behavior as proof of route-level behavior.
- Browser keyboard/back/interruption, responsive layout, hosted signed-in timings, hosted RLS, and owner UAT remain deferred to their approved later boundary. Do not turn these into an expanded profiling or infrastructure project.

## Preservation and handoff

- Pre-review snapshot: `reviewer-checks/preflight.json` records all 52 pre-existing porcelain status paths and their file hashes. The seven inherited dirty/untracked files named in the handoff were verified byte-identical to the original baseline.
- Final status/path/hash comparison and post-check candidate-seal verification: `reviewer-checks/postflight.json`. Only this verdict and files under `reviewer-checks/` were added; all pre-existing path/status/hash entries were verified unchanged.
- Next actor: Hermes Coordinator/Nack to decide the bounded response to R1. Candidate remains local-only, not deployed, and not ready for hosted UAT. No automatic correction/review loop was initiated.
