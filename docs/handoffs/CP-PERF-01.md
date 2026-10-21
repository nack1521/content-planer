# CP-PERF-01 — Responsive menu navigation, bounded first pass

Status: PREPARED, not submitted. Nack opens a fresh Antigravity session and submits the saved prompt.
Workspace: `/Users/nack/contentPlaner`; received branch `main`, HEAD `2225a7620f992a7865fc5eba33be548edbbdbec9`.
Authority: owner messages `1562029410314362931` and `1562030833781440526` approve delegation of phase 1, not deployment in this implementation pass.
Actors: Hermes coordinates/intakes; Antigravity implements; the owner-designated `jaah-review of content-planer` thread (requested `gpt-6-luna xhigh fast`) performs the sole primary review; Nack performs hosted UAT after the later deployment phase. The thread/model are owner-managed, not configured by this document.
Budget: one bounded implementation pass and one primary review. Consolidate blockers; no autonomous correction/review loop.

## Read and authority

Read root `AGENTS.md`, `PROJECT.md`, `ARCHITECTURE.md`, `TASKS.md`, the current top block of `HANDOFF.md`, and this handoff. This explicit owner follow-up overrides the old first-unchecked-milestone rule; do NOT reconcile migrations or reopen completed milestones. Follow installed Next.js docs, particularly `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md` and the relevant loading/useLinkStatus/cache documentation before using those APIs.

## Outcome and hypothesis

Menu navigation should acknowledge a click promptly while protected page data is loading, and initial page reads should avoid redundant authentication work within one server render. Preserve data and business behavior.

Observed source: sidebar/mobile menus already use Next Link; Planner and Calendar await two read actions, Tasks and Ideas await three, and each read currently creates a client and calls getClaims. No route loading.tsx exists. getContentItemsAction currently returns full items, links and tasks used by RecordModal. These are hypotheses for perceived delay, NOT a proven signed-in latency diagnosis. Repeated getClaims calls do not necessarily mean repeated network calls.

Make only these small changes:
1. Add localized, accessible loading boundaries and pending-link feedback for the existing five app menus. Preserve the shared shell and current theme; do not intercept normal modifier-click, keyboard or browser navigation. Keep pending feedback tied to the actual transition, not a timer that can stick or claim success.
2. Share a validated read context within a single server-render request, or use a comparably small aggregate server-only read loader, to avoid duplicate initial-read authentication. Preserve the proxy boundary and independently authenticated public server-action entry points. Do not accept a client-supplied user ID/client as authority. Keep mutation auth fresh and unchanged. Never retain user/client/data in a module-global variable, cross-request cache, unstable_cache, persistent browser store or new client data-cache library. A React cache proof must exercise its real server-render semantics: its plain Node/client implementation may not memoize.
3. Keep query fields and full editor payloads unchanged in this pass. Do not add lazy-detail endpoints, schema/index changes, server pagination, bulk prefetching or a broad data-layer rewrite. If safe read-context sharing cannot fit the boundary, report that blocker; do not silently turn a loading-only change into a measured backend-speedup claim.

## Allowed implementation paths

Existing paths (edit only navigation wiring or initial read functions):
- `src/components/shell/DesktopSidebar.tsx`
- `src/components/shell/MobileNav.tsx`
- `src/app/[locale]/planner/page.tsx`
- `src/app/[locale]/tasks/page.tsx`
- `src/app/[locale]/calendar/page.tsx`
- `src/app/[locale]/ideas/page.tsx`
- `src/app/actions/content.ts` — only getContentItemsAction/getContentPillarsAction and necessary imports; mutation bodies unchanged.
- `src/app/actions/tasks.ts` — only getTasksAction and necessary imports.
- `src/app/actions/reference-accounts.ts` — only getReferenceAccountsAction and necessary imports.
- `src/messages/en.json`, `src/messages/th.json` — only additional matched loading/navigation keys.
- `TASKS.md`, `HANDOFF.md` — update this follow-up only; retain history and inherited wording.

New implementation paths, create only those needed:
- `src/app/[locale]/planner/loading.tsx`
- `src/app/[locale]/tasks/loading.tsx`
- `src/app/[locale]/calendar/loading.tsx`
- `src/app/[locale]/ideas/loading.tsx`
- `src/app/[locale]/settings/loading.tsx`
- `src/components/shell/NavigationPending.tsx`
- `src/components/shell/PageLoading.tsx`
- `src/utils/supabase/navigationReadContext.ts`
- `src/utils/supabase/navigationReads.ts`
- `tests/navigation-performance.test.mjs`

No other source/test/config changes without stopping and reporting the exact need. New source is not permission to create an unrelated abstraction framework.

## Preservation and safety

The received worktree contains unrelated edits in PROJECT.md, ARCHITECTURE.md, HOSTED_IMPORT_FINISH_PLAN.md and scripts/prepare-hosted-import.mjs, plus untracked PASSWORD_LOGIN_SETUP.md, chatgpt-conversation-history.md and scripts/set-owner-password.mjs. Preserve their exact bytes. Do not stash, reset, clean, stage, commit or push. Existing HEAD already contains the latest date-clear and fitted task-table changes and was pushed before this task.

Frozen baseline: `/Users/nack/.hermes/workspaces/content-planer/CP-PERF-01/baseline/manifest.json`. Editable root status documents are preserved as .before copies there. Check the current worktree against the baseline before editing; unexpected concurrent edits mean stop and coordinate. Do not change the baseline, handoff or prompts.

Forbidden this pass: theme changes, Classroom source access, dependency installation, package/lock/config changes, proxy/login/callback/server-client changes, database/Storage writes, migrations, imports, account/password actions, service-role use, production/preview deployment and Git writes. Do not read .env values or private import material. The known local Next dev tracing concern makes password sign-in testing out of scope. Never capture passwords, cookies, tokens, real notes or content in evidence. No real-account browser session is required for implementation.

## Essential cases and evidence boundaries

C1. Under a deliberately delayed synthetic transition, the actual navigation/loading components expose loading feedback, the shell remains navigable, and final populated content replaces loading. Check keyboard activation and interruption/back navigation using existing installed tools if available. Source assertions alone are not mounted/browser proof; label any unavailable boundary NOT RUN. Do not install browser tooling or invent screenshots.
C2. Initial read fan-out: capture auth-call counts before/after on the real changed production read seam with a synthetic authenticated context; verify full item/link/task payloads and error contracts remain intact. A source count or independent fake copy is not runtime proof. Do not use a benchmark with invented latency to claim hosted speedup.
C3. Missing/invalid identity performs no owner-data query; independent synthetic A and B requests retain their own identity and data; an auth/query failure cannot reuse a previous successful owner's result. Proxy and mutation auth remain unchanged. Mocks establish only synthetic behavior, not hosted RLS.
C4. Reload/mutation freshness is preserved by not caching query results across requests. Existing full editor fields, date clearing, task links, filtering/sorting and 25-item pagination remain unchanged. Existing valid assertions must not be weakened. Test the affected contract, not a parallel reimplementation.
C5. Thai/English loading text, visible focus, and desktop/mobile menu usability are preserved without adopting the future rose theme.

If actual signed-in timings cannot safely be measured, report them UNVERIFIED and defer the short hosted check to owner UAT. The accepted first-pass evidence can establish reduced duplicated work and responsive feedback, not a guaranteed end-to-end speedup. Do not open a separate profiling project to complete this pass.

## Finite checks

Use installed dependencies only. New tests must use valid fictional state, no real Supabase client network, no DB/auth/account writes, no production browser access and no top-level spawned services. Inspect hooks/imports before running them. Normal RED/GREEN work on the new regression is allowed inside this implementation pass; preserve actual results rather than manufacturing a historical RED.

After implementation, run this final sequence once, capture exact argv, stdout/stderr and exit per command, and stop the final sequence on its first failure:

1. `node --loader ./tests/test-loader.mjs --test tests/navigation-performance.test.mjs tests/planner-list.test.mjs tests/task-list.test.mjs tests/task-content-search.test.mjs tests/localization-scanner.test.mjs`
2. `npx --no-install tsc --noEmit`
3. `npm run lint`
4. `npm run build`
5. `git diff --check`

Do NOT run npm test, test:db, password-auth, importer or authenticated-action suites in this pass. The selected existing tests are pure utilities/source scans; inspect the new test before invocation. Build may use existing configuration without printing its values. No local password login or extra live server is authorized. If an optional mounted/browser check needs a new dependency/server harness, mark that boundary NOT RUN instead of expanding scope. Do not count lint/static accessibility checks as real navigation behavior.

## Outputs and stop

Create only this output subtree in the repo: `docs/handoffs/CP-PERF-01-output/`.
- `RESULT.md`: changed paths, reasoning, C1-C5 evidence/limits, exact gate outcomes and counts, before/after auth-call observations, any measured timing with method, major remaining risks, and a short later owner-UAT checklist.
- `checks/`: raw command outputs plus an explicit argv/exit manifest; no secrets.
- `REVIEW.md` is reserved for Luna; Antigravity must not write a reviewer verdict.

Update TASKS.md and only the current CP-PERF-01 block in HANDOFF.md to IMPLEMENTED-AWAITING-REVIEW or BLOCKED. Mark checks as not run when absent; local implementation is NOT DEPLOYED and NOT READY for hosted owner UAT. Preserve the output of failed checks; report one consolidated set of blockers, then stop. Return `CP-PERF-01-IMPLEMENTATION-DONE` or `CP-PERF-01-BLOCKED` with the exact RESULT.md path. Do not start theme work, another correction pass or a deployment. Nack will notify Hermes; Hermes will perform bounded artifact intake and prepare the sole primary review assignment.
