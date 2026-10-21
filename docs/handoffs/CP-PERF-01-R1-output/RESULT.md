# CP-PERF-01-R1 Implementation Result — Evidence Correction for Auth-Call Deduplication

- **Status:** R1-IMPLEMENTED-AWAITING-REVIEW
- **Original Review Verdict:** HOLD (preserved from `docs/handoffs/CP-PERF-01-output/REVIEW.md`)
- **Correction Contract:** `docs/handoffs/CP-PERF-01-R1.md`
- **Workspace:** `/Users/nack/contentPlaner`, received HEAD `2225a7620f992a7865fc5eba33be548edbbdbec9`
- **Date:** 2026-10-20
- **Primary Review Destination:** `jaah-review of content-planer` (Luna requested)
- **Deployment Status:** LOCAL ONLY — NOT DEPLOYED to Preview or Production; NOT READY for hosted owner UAT until reviewed and deployed.

---

## 1. R1 Disposition & Instrumentation Architecture

In the initial review (`docs/handoffs/CP-PERF-01-output/REVIEW.md`), Luna issued a HOLD finding (**R1**):
> *"Actual auth-call deduplication is asserted through a supplied mock, not observed at the production factory seam. The retained tests cannot substantiate the reported 'exactly one authentication call' or percentage reduction."*

### Resolution Strategy
To fix R1 without modifying any application code in `src/**`:
1. **Isolated Module Loader (`tests/navigation-r1-loader.mjs`):**
   - Intercepts imports of `@/utils/supabase/server` during test execution and resolves them to an isolated synthetic client fixture (`tests/navigation-r1-fixture.mjs`).
   - Does not modify the shared `tests/test-loader.mjs`.
2. **Synthetic Client Fixture (`tests/navigation-r1-fixture.mjs`):**
   - Provides a synthetic `createClient()` factory and client with `auth.getClaims()` and query builder `.from(table).select().eq().is().order()`.
   - Captures telemetry counters: `createClientCalls`, `getClaimsCalls`, and `executedQueries`.
   - Completely offline: 0 network calls, 0 database writes, 0 real credentials.
3. **Execution of Actual Production Seams:**
   - Tests execute the real production functions exported from `src/utils/supabase/navigationReadContext.ts`:
     - `createNavigationReadContext()` (lines 15–44)
     - `withNavigationReadContext()` (lines 75–80)
     - `getNavigationReadContext()` (lines 60–70)
   - Read actions (`getContentItemsAction`, `getContentPillarsAction`, `getTasksAction`, `getReferenceAccountsAction`) execute their real production logic.
   - The captured telemetry directly records calls originating from production code, eliminating the test-local `mockContext` counter.

---

## 2. Exact Source and Test Lines

### Production Source Seam Exercised (Unchanged in R1)
- `src/utils/supabase/navigationReadContext.ts`:
  - Lines 15–44: `createNavigationReadContext()` invokes `createClient()` and `supabase.auth.getClaims()`.
  - Lines 60–70: `getNavigationReadContext()` retrieves context from `AsyncLocalStorage`.
  - Lines 75–80: `withNavigationReadContext()` runs the async page scope.
- `src/app/actions/content.ts`:
  - Lines 79–119: `getContentPillarsAction()` consumes `getNavigationReadContext()`.
  - Lines 121–186: `getContentItemsAction()` consumes `getNavigationReadContext()`.
- `src/app/actions/tasks.ts`:
  - Lines 44–90: `getTasksAction()` consumes `getNavigationReadContext()`.
- `src/app/actions/reference-accounts.ts`:
  - Lines 25–52: `getReferenceAccountsAction()` consumes `getNavigationReadContext()`.

### Test Wiring Exercised in `tests/navigation-performance.test.mjs`
- **Planner Page Pattern (lines 166–191):**
  `withNavigationReadContext(createNavigationReadContext(), () => Promise.all([getContentItemsAction(), getContentPillarsAction()]))`
- **Tasks Page Pattern (lines 193–227):**
  `withNavigationReadContext(createNavigationReadContext(), () => Promise.all([getTasksAction(), getContentItemsAction(), getContentPillarsAction()]))`
- **Ideas Page Pattern (lines 229–263):**
  `withNavigationReadContext(createNavigationReadContext(), () => Promise.all([getContentItemsAction(), getContentPillarsAction(), getReferenceAccountsAction()]))`
- **Calendar Page Pattern (lines 265–285):**
  `withNavigationReadContext(createNavigationReadContext(), () => Promise.all([getContentItemsAction(), getContentPillarsAction()]))`
- **Real `getClaims`-Error Branch Control (lines 360–378):**
  `configureSession({ claimsError: ... })` -> `withNavigationReadContext(createNavigationReadContext(), ...)`
- **Independent Subsequent Requests (lines 380–424):**
  Request 1 (User A: `00000000-0000-4000-a000-000000000001`) followed by Request 2 (User B: `00000000-0000-4000-a000-000000000002`).

---

## 3. Actual Factory Dependency Observations

Under the isolated synthetic client fixture, dependency invocations originating directly from `createNavigationReadContext()` were captured:

| Route Initial-Read Pattern | Read Actions Invoked | Observed `createClient` Calls | Observed `getClaims` Calls | Database Queries Executed |
|---|---|:---:|:---:|:---:|
| **Planner Page** | `getContentItemsAction`, `getContentPillarsAction` | **1** | **1** | 2 |
| **Tasks Page** | `getTasksAction`, `getContentItemsAction`, `getContentPillarsAction` | **1** | **1** | 3 |
| **Ideas Page** | `getContentItemsAction`, `getContentPillarsAction`, `getReferenceAccountsAction` | **1** | **1** | 3 |
| **Calendar Page** | `getContentItemsAction`, `getContentPillarsAction` | **1** | **1** | 2 |

### Key Findings:
1. **Single Context Resolution:** Each page's parallel initial reads share the single promise created by `createNavigationReadContext()`. Only 1 `createClient()` and 1 `getClaims()` call occur per page-read scope.
2. **Fresh Subsequent Requests:** When an independent subsequent request is executed for User B (`00000000-0000-4000-a000-000000000002`), `createNavigationReadContext()` runs freshly, producing fresh `createClient` and `getClaims` calls (telemetry counter increments to 2) with zero retention of User A's identity or state.
3. **Fail-Closed on Claims Error:** When `getClaims()` returns an error, `createNavigationReadContext()` executes its production `if (claimsError)` branch and returns `{ supabase, userId: null, error: 'unauthorized' }`. Both read actions return `{ error: 'unauthorized' }` and execute **exactly 0 database queries**.

---

## 4. Retained Assertions & Qualifications

- **C1 (Navigation & Route Loading Boundaries):** Retained source file existence, client component directive, `useLinkStatus` usage, live region accessibility attributes, and loading skeleton structure checks. Qualified explicitly: these are static source scans, not mounted browser or interactive transition tests.
- **C2.5 (Representative Payload Integrity):** Retained representative payload mapping assertions using valid RFC 4122 v4 UUIDs for all entities (`id`, `user_id`, `pillar_id`, `task_id`, `link_id`, `account_id`). Preserves `source_number`, `hook`, `caption`, `cta`, `hashtags`, `review_status`, `publish_at`, `publish_time_known`, `pillar`, `links`, and `tasks`. Qualified: representative field verification, not an exhaustive mapping test of every possible database column.
- **C2.6 (React.cache Demonstration):** Retained standalone React server dispatcher cache demonstration, but explicitly labeled as generic library behavior only. The production route pages rely on the explicit AsyncLocalStorage path verified in C2.1–C2.4.
- **C3 (Missing Identity & Isolation):** Retained fail-closed identity, non-contamination, and user separation tests.
- **C4 (Freshness & Contracts):** Retained query non-caching test across requests, date clearing (`publish_at: null`), and sorting/pagination logic.
- **C5 (Localization & Accessibility):** Retained 100% dictionary key parity (`en.json` vs `th.json`) and accessible attribute verification.

---

## 5. Corrected and Withdrawn Claims in Original RESULT.md

The original `docs/handoffs/CP-PERF-01-output/RESULT.md` has been amended to remove overstated claims:
1. **Source-Derived Pre-Fix Baseline:** The previous statement that auth calls were reduced from 2 or 3 down to 1 has been qualified: pre-fix call counts (2 or 3) are derived from code inspection of the baseline source (where each action called `createClient` and `getClaims` independently), not from pre-fix runtime benchmarks.
2. **Withdrawn Percentage Reductions:** Claims of "50% reduction in auth overhead" and "66.7% reduction in auth overhead" have been removed. The verified evidence establishes synthetic call-count deduplication at the factory dependency seam, not measured elapsed-time or network latency savings.
3. **Static vs Mounted Boundaries:** C1 verification is explicitly documented as static source and attribute verification; interactive click tracing, focus trapping, and live streaming content replacement remain NOT RUN locally.
4. **Representative Payloads:** Clarified that payload assertions verify representative fields and relationships rather than an exhaustive column mapping.

---

## 6. Frozen R1 Final Checks Results

Executed once in the required order; all gates exited with code 0:

```text
Check 1: node --loader ./tests/test-loader.mjs --loader ./tests/navigation-r1-loader.mjs --test tests/navigation-performance.test.mjs
Exit: 0 | Tests: 19 passed, 0 failed, 0 skipped | Duration: ~511ms

Check 2: git diff --check
Exit: 0 | Output: clean (0 whitespace/formatting errors)
```

Raw stdout, stderr, and exit manifests are stored in `docs/handoffs/CP-PERF-01-R1-output/checks/`.

---

## 7. Protected-Hash Accounting

Checked against the frozen correction baseline at `/Users/nack/.hermes/workspaces/content-planer/CP-PERF-01-R1/baseline/manifest.json`:
- **Total Protected Files in Baseline:** 176 files.
- **Unchanged Protected Files:** 172 files verified byte-identical (including all files in `src/**`, build/package configs, shared test loader, original reviewer checks, and inherited dirty/untracked files).
- **Authorized Modified Files (4):**
  1. `tests/navigation-performance.test.mjs` (C2/R1 instrumentation update)
  2. `docs/handoffs/CP-PERF-01-output/RESULT.md` (claims qualification and R1 link)
  3. `TASKS.md` (status update)
  4. `HANDOFF.md` (status and evidence update)
- **New Authorized Files:**
  1. `tests/navigation-r1-loader.mjs`
  2. `tests/navigation-r1-fixture.mjs`
  3. `docs/handoffs/CP-PERF-01-R1-output/RESULT.md`
  4. `docs/handoffs/CP-PERF-01-R1-output/checks/*`

---

## 8. Remaining Proof Limits

1. **Interactive Navigation & Streaming:** Live browser click interaction, pending indicator visibility, and route-streaming swaps were not tested with a real browser harness (deferred to owner UAT).
2. **Hosted Latency & RLS:** Actual end-to-end network latency improvements on Vercel/Supabase and hosted RLS enforcement remain UNVERIFIED locally (deferred to owner UAT).
3. **Three-Account Isolation Smoke Test:** Full three-account browser isolation in Production remains unperformed and is not claimed.
