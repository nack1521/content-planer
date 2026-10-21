# CP-COLOR-01 — Sole Material-Regression Review

**Verdict: HOLD** — the candidate has confirmed COLORS-ONLY scope violations and newly worsened contrast pairs below the task thresholds. This verdict applies to the local source/check boundary only; it is not deployment or UAT approval.

## Candidate identity and baseline

- Candidate seal: `/Users/nack/.hermes/workspaces/content-planer/CP-COLOR-01/incoming/manifest.json`, SHA-256 `a4d513d99f21c8c9708c0e1ea78728202085b1dd97938aed9465b44abd5cb629`. All 211 sealed entries matched the current workspace at preflight; no missing or mismatched entry.
- Comparison baseline: `/Users/nack/.hermes/workspaces/content-planer/CP-COLOR-01/baseline/manifest.json`, SHA-256 `2a3a38be46f7c5f4f581364556fed0df2984a208ba8dee68ff1fd20afb2fcbd7` (204 entries). Of the common paths, 175 were unchanged and 27 were changed UI/style source files. `HANDOFF.md` and `TASKS.md` were excluded from the candidate seal as mutable routing/status files; their pre-review hashes were recorded and remained unchanged during this review.
- I compared to received baseline bytes, not raw Git HEAD: five source baselines came from retained `.before` copies; the other 22 were reconstructed from index blobs only after their SHA-256 matched the received baseline manifest. All 27 changed source files were therefore available for direct diff inspection. Nine candidate-only paths were task intake/report/check artifacts; no unexpected source path or removal was found.
- The prior CP-PERF-01 / R1 verdicts were not reopened or rerun.

## Material findings

### F1 — Non-color visual changes violate the explicit scope

The received-baseline diff contains non-color class changes, contrary to the COLORS-ONLY contract and the RESULT.md claim that box shadows and typography were unchanged:

- `src/components/auth/LoginForm.tsx:67`: brand mark shadow size changed `shadow-md` → `shadow-xs`.
- `src/components/auth/LoginForm.tsx:79`: card shadow changed `shadow-xl` → `shadow-sm`, and `backdrop-blur-md` was removed.
- `src/components/shell/DesktopSidebar.tsx:74`: brand mark shadow size changed `shadow-md` → `shadow-xs`.
- `src/components/shell/DesktopSidebar.tsx:99`: `font-semibold` was added to the active navigation item, overriding its inherited `font-medium` weight.
- `src/app/[locale]/settings/page.tsx:203` and `src/components/planner/DiscardConfirmDialog.tsx:101`: a bare `border` utility was added where the received baseline had none.

These are direct out-of-scope presentation changes; no DOM restructuring or changed handler/data/auth logic was found in the 27 source diffs. The finding is not a claim of a major functional regression.

### F2 — Login text and resting control-boundary contrast worsened

- `src/components/auth/LoginForm.tsx:199` changes the email placeholder from `#64748B` on `#020617` (**4.24:1**) to `#9C8B8E` on white (**3.23:1**). The candidate pair is below the specified 4.5:1 normal-text target and is materially lower than its received-baseline pair.
- The same input’s resting border changes from `#334155` on `#020617` (**1.95:1**) to `#E8CCD2` on white (**1.50:1**). Because the input and its card are both white, this border is the primary resting-state visual delimiter and is below the specified 3:1 control-indicator target. Its rose focus ring on white is **6.22:1** and passes, but that does not repair the unfocused-state boundary.

These are source-level color measurements; no rendered readability claim is made.

## Contrast and exception coverage

The following actual candidate pairs were independently recalculated using WCAG relative-luminance contrast:

- Ink `#2D2526` on paper `#FBF7F5`: **14.05:1**; on white: **14.96:1**.
- Secondary `#746365` on paper: **5.31:1**; on white: **5.65:1**.
- Rose `#A13F5B` on soft rose `#F5E4E8`: **5.08:1**; on its `#EED8DC` hover surface: **4.59:1**.
- White on primary / hover / active rose (`#A13F5B` / `#8D324C` / `#78283E`): **6.22:1 / 7.80:1 / 9.67:1**.
- Rose focus indicator on paper / white / soft rose: **5.84:1 / 6.22:1 / 5.08:1**.
- Secondary on the sidebar’s 60%-soft-rose hover composited over paper (`#F7ECED`): **4.89:1**.
- Changed semantic login alerts remain differentiated: rose-600 on white **4.70:1**, rose-700 on rose-50 **5.72:1**, and amber-800 on amber-50 **6.84:1**.
- The white `CP` brand mark over the new gradient’s light stop `#C26880` is **3.76:1**. It is a small brand mark, not counted as body copy; no rendered logo assessment was made. The review does not claim exhaustive contrast coverage for every component/state.

`PlatformBadge.tsx`, `PillarBadge.tsx`, and `StatusBadge.tsx` are byte-identical to the received baseline, preserving platform, user-defined pillar, and semantic status colors. The old purple gradient in unchanged `src/app/icon.svg` also remains; it is an existing brand asset outside the allowed edit list, not a new candidate change. Source scans found the remaining purple utility names in `PlatformBadge` and `StatusBadge`; compiled CSS also contains generic Tailwind `--color-purple-*` theme variables, which are not evidence of an applied purple utility. The RESULT.md statement that only two old-purple occurrences exist is incomplete because its scan missed the icon’s hex literals.

## Frozen checks — run once, in order

Fresh raw stdout, stderr, and exit files are under `docs/handoffs/CP-COLOR-01-output/reviewer-checks/`.

1. `node --loader ./tests/test-loader.mjs --test tests/planner-list.test.mjs tests/task-list.test.mjs tests/task-content-search.test.mjs tests/localization-scanner.test.mjs tests/accessibility.test.mjs` — **exit 0**; 31 passed, 0 failed, 0 skipped. Node emitted the experimental-loader warning in stdout; stderr was empty.
2. `npx --no-install tsc --noEmit` — **exit 0**; no compiler diagnostics. npm emitted an `Unknown user config "allow-scripts"` warning to stderr.
3. `npm run lint` — **exit 0**; 0 errors, 4 warnings. The warnings are the unused `counter` in unchanged `tests/navigation-performance.test.mjs:549` and `_cols`, `_field`, `_opts` in unchanged `tests/navigation-r1-fixture.mjs:94,103`; their received-baseline hashes match, so these are inherited fixture warnings, not color regressions. npm emitted the same user-config warning to stderr.
4. `npm run build` — **exit 0**; Next compiled, ran TypeScript, and generated 17/17 static pages. The log reports `.env.local` loaded automatically; I did not inspect its contents or perform a login/account operation. npm emitted the same user-config warning to stderr.
5. `git diff --check` — **exit 0**; stdout and stderr empty. This check does not cover untracked files; `NavigationPending.tsx` and `PageLoading.tsx` were instead compared directly against their retained received-baseline copies.

The check sequence completed without a failed or blocked gate. No source/test/config fix, installation, server/browser, real-account test, database operation, Git write, or deployment was performed. The build regenerated `.next` artifacts.

## Evidence limits and disposition

- Rendered/browser and real-account UAT were explicitly deferred and remain **NOT RUN**. No hosted performance, RLS, or runtime behavior is claimed.
- The targeted tests are utility/static checks, not mounted-component or browser proof; the build proves compilation/static generation, not authenticated behavior.
- Contrast figures cover the important changed palette/state pairs listed above, not every possible rendered foreground/background combination.
- Review evidence and per-check raw logs are retained in `docs/handoffs/CP-COLOR-01-output/reviewer-checks/`. No correction or second review was started.

**Disposition:** return the bounded findings to the coordinator/implementer for a separately authorized correction decision. Preserve the explicit deferral of browser UAT; this HOLD does not authorize redesign, performance/R1 work, or deployment.
