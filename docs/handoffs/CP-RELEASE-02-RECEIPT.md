# CP-RELEASE-02 — Verified Production Receipt (Desktop UX)

Owner grant: Discord `1562283416894840943`. Commit/deployment COMPLETE; affected desktop owner UAT READY, not yet accepted.

## Exact version and target

- Commit `25e9366110bd7125924675c45b722824b6972576` (`25e9366`), `fix(desktop): anchor sidebar and expand task row editing`.
- 50 explicit files committed: two app components, one regression test, 47 bounded task/pre-release evidence records. No Git push. Earlier unrelated root/project/import/operator changes remain preserved outside commit/upload.
- Deployment `dpl_hdg9oLjeDzvdBD1acg6raAbDTWRj`, `https://content-planner-db6x1sn0d-nack4.vercel.app`, READY/production.
- Existing alias `https://content-planner-zeta-dusky.vercel.app` independently resolves to the exact same deployment ID. Existing project content-planner / prj_hL67aRubi46pkuWn0KfOmsCtEARy retained. Application function outputs verified in sin1; middleware placement is not represented as single-region app placement.

## Artifact and checks

Deployed isolated production-source archive of that exact commit. All 84 src files match the accepted review seal; CLI dry-run verified 98 upload files, no docs/logs/tests/scripts/Supabase operator/private/env files. Existing project link copied; no environment values copied or config/secret/account/DB/import/migration operation performed. CLI releaseCommit metadata was explicitly supplied with the local commit.

Fresh local release typecheck/full lint/build/normal worktree whitespace commands exited 0 with NEXT_TELEMETRY_DISABLED=1. Lint zero errors/four inherited fixture warnings; build compiled/typechecked/generated 17 static pages. Next's normal automatic dotenv load was not manual credential inspection. Reviewed 26-test and separate 21-case exact-handler evidence was retained, not rerun or represented as mounted/browser testing.

Staged-content secret scan across the 50 files found zero credential signatures. Whole-staged diff --check returned 2 for 19 inherited whitespace notices in six immutable evidence documents/logs; source/tests staged check returned 0. Preserve those received evidence bytes; do not call the whole staged check clean. No source fix/review loop was introduced for documentation whitespace.

## Independent external verification

- Exact deployment and Production alias independently read back via pinned Vercel CLI 65.0.0: READY, production, same ID.
- /th/login and /en/login returned HTTP 200.
- Anonymous /th/planner, /th/tasks, /th/calendar, /th/ideas and /th/settings returned HTTP 307 to /th/login.
- Served CSS contains h-screen -> height:100vh. Served public shell chunk `/_next/static/immutable/chunks/02jql_nv9un24.js` contains both updated sticky sidebar and independently scrollable middle-navigation source tokens. Served assets establish uploaded version presence, NOT rendered footer coordinates or browser behavior.
- Machine records: `/Users/nack/.hermes/workspaces/content-planer/CP-RELEASE-02/` (release-state, previous/exact/alias inspections, dry-run, deployment output, verification).

No authenticated login/CRUD/RLS, real pointer/keyboard interactions, measured sidebar positions, mounted mobile behavior or hosted navigation timing were performed. Existing Supabase project/environment was reused without data operations; actual old-record visibility remains owner-verified rather than inferred from anonymous probes.

## Rollback available, not run

Previous known READY release: dbbe3f1, `dpl_d7HwSTJSnrbd9WNrgRHhn8VQCh4Z`, `https://content-planner-a3grmjfey-nack4.vercel.app`.
From `/Users/nack/contentPlaner` if rollback is needed/authorized:
`npx --yes vercel@65.0.0 rollback https://content-planner-a3grmjfey-nack4.vercel.app`
Read back alias/region/routes again after any rollback. No rollback was executed.

## Affected desktop UAT — pending

Use the Production alias, existing allow-listed owner account, commit 25e9366.
1. Long page/scroll: sidebar language/timezone/Sign Out remain visible at viewport bottom; switch menus/loading without footer shifting. Also try a short window so middle navigation scrolls while footer remains reachable.
2. Tasks checkbox: comfortable left padding, unchanged icon size, table still fits without horizontal scrolling and description remains last.
3. Inert row areas open the correct task once; checkbox toggles only; linked content opens its content editor only; title and Tab/Enter/Space still work without double activation. Use a fictional test task for toggles, not important existing data.
4. Drag-select/copy row text without opening task edit; mobile cards/navigation remain as before.

Reply numbered PASS/issue and route/device, without credentials/private data. Keep UAT pending until feedback; do not infer previous unreported cases passed or start another work loop automatically.
