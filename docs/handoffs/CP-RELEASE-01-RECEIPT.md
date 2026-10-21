# CP-RELEASE-01 — Verified Production Receipt

Owner grant: Discord `1562266084441198603`. Release COMPLETE; owner UAT READY, not yet performed/accepted.

## Version and deployment

- Local app/evidence commit: `dbbe3f19e0d8f66d737b591e4eaadcb38885ca26` (`dbbe3f1`), `feat(ui): warm rose theme and smoother navigation`.
- 170 explicit files committed: reviewed source, three performance test files and bounded handoff/evidence packet. Secret-signature scan over staged contents found zero hits. No Git push; main remains one local commit ahead of origin/main. Unrelated inherited docs/scripts/private operator files and mutable root status history were not staged or uploaded.
- Production deployment: `dpl_d7HwSTJSnrbd9WNrgRHhn8VQCh4Z`, READY, URL `https://content-planner-a3grmjfey-nack4.vercel.app`.
- Existing alias `https://content-planner-zeta-dusky.vercel.app` independently resolves to that same deployment ID. Existing project/organization retained.
- All application function outputs verified in `sin1`; global middleware separately reports multiple regions including sin1. Build-machine sfo1 is not the app-runtime region.

## Packaging and checks

Deployed with pinned Vercel CLI 65.0.0 from an isolated archive of the exact commit, not the dirty project worktree. Archive has 84 reviewed src files, all hash-matched to the accepted candidate seal. CLI dry run enumerated 98 upload files; no env files, reports/logs, tests, scripts, ref or Supabase operator assets were uploaded. Metadata releaseCommit explicitly identifies the local commit. No dependency/config/env/account/DB migration/import operation was performed.

Fresh pre-release TypeScript/full lint/build passed (lint: zero errors, four inherited fixture warnings); normal worktree diff --check passed. Whole STAGED diff --check later returned 2 on 30 pre-existing whitespace notices in nine immutable evidence documents (Markdown hard-break spaces, raw build-progress CRs, EOF blank lines); staged src/tests check passed. Historical bytes were deliberately preserved and these doc notices are not claimed clean. Retained test/reviewer proofs were not rerun or promoted into new authenticated/runtime claims.

## External readback and serving checks

- Read back exact deployment and production alias independently via `vercel inspect --json`; both READY/production and same ID.
- Public `/th/login` and `/en/login`: HTTP 200.
- Unauthenticated `/th/planner`, `/th/tasks`, `/th/calendar`, `/th/ideas`, `/th/settings`: HTTP 307 to `/th/login`.
- Served stylesheet contains cream/rose and corrected neutral colors.
- Initial verification incorrectly assumed the Login form classes would appear in server HTML; that assertion failed. Inspection confirmed the existing Suspense/client-render bailout, with no form in initial HTML. No app fix/redeploy was made. The currently served login JS `/_next/static/immutable/chunks/08702bn195pfd.js` contains the corrected placeholder/resting-border classes and restored card shadow/blur. This verifies served asset presence, NOT mounted visual correctness.
- Raw public/alias/region/bundle verification records: `/Users/nack/.hermes/workspaces/content-planer/CP-RELEASE-01/`.

Same Vercel project and existing Production environment were reused, without changing Supabase configuration or performing a database write/import. Existing-record visibility, real-account auth/CRUD/RLS and measured navigation speed are deliberately NOT VERIFIED by anonymous probes; owner UAT must check them.

## Rollback available, not executed

Previous deployment: `dpl_3WQw3dCNjNXm6jppD4umiEXBzEB7`, `https://content-planner-2vk6g3ek3-nack4.vercel.app`.
From `/Users/nack/contentPlaner` using its unchanged same-project link (no scratch-directory dependency):
`npx --yes vercel@65.0.0 rollback https://content-planner-2vk6g3ek3-nack4.vercel.app`
Then inspect the production alias and probe routes again. CLI usage verified with rollback --help; no rollback was needed or run.

## Owner UAT card

Use Production alias and the existing allow-listed owner account on commit dbbe3f1. No local dev-server login, password sharing or private-data screenshots required.
1. Login: expected old records visible; no re-import or account reset.
2. Planner/Tasks/Calendar/Ideas/Settings: expected navigation feedback/no indefinite wait; report perceived latency rather than assuming speedup.
3. Desktop/mobile: expected cream/rose palette, readable controls, Tasks description last/no horizontal desktop scroll, narrow-screen cards retained.
4. Use a clearly fictional test record/task: save/edit, clear a content date, reload; expected values and task status persist. Do not destructively edit important existing records just to test.

Reply numbered PASS/issue for each; report route/device and observable problem, not credentials. UAT remains pending until owner feedback. Do not start another implementation/review loop automatically.
