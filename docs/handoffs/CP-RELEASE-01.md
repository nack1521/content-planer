# CP-RELEASE-01 — Pre-release Record

Owner authorization: Discord `1562266084441198603` approves local commit and Production deployment of the reviewed performance/color candidate to the existing Vercel project, retaining existing Supabase data. Git push, DB/account/migration/import/secret changes are not authorized or planned.

## Accepted inputs

- CP-PERF-01 original primary review plus R1-only PASS, closeout `CP-PERF-01-R1-CLOSEOUT.md`.
- CP-COLOR-01 original primary review plus same-reviewer PASS — F1/F2 only, closeout `CP-COLOR-01-F1F2-CLOSEOUT.md`.
- Final app bytes match the 250-entry correction incoming seal; all changed pre-performance source baselines match HEAD, so no inherited app edits are silently included. Preserve unrelated PROJECT/ARCHITECTURE/import scripts/password docs and inherited root routing-document history outside this commit.

## Fresh release checks

From `/Users/nack/contentPlaner`, sequence completed with exit 0: `npx --no-install tsc --noEmit`, `npm run lint`, `npm run build`, `git diff --check`. Lint has zero errors and four known unchanged fixture warnings; build compiled/typechecked/generated 17 static pages. Retained reviewed tests are not claimed rerun. Full/password/DB/auth/import tests and account login remain NOT RUN.

Vercel CLI local no-install resolution initially failed because no local CLI package was installed; resolved using ephemeral pinned `npx --yes vercel@65.0.0`, without changing project dependencies. Verified CLI identity nack1521 and existing project content-planner in nack4.

## Exact target and rollback before release

Project prj_hL67aRubi46pkuWn0KfOmsCtEARy, organization team_s31kgMFuC30CXhh4D1HeKNAl. Alias https://content-planner-zeta-dusky.vercel.app.
Previous verified Production deployment dpl_3WQw3dCNjNXm6jppD4umiEXBzEB7, URL https://content-planner-2vk6g3ek3-nack4.vercel.app, READY, functions sin1.
If rollback is separately authorized/needed, use the linked release directory:
`npx --yes vercel@65.0.0 rollback https://content-planner-2vk6g3ek3-nack4.vercel.app`
Then inspect the production alias and route behavior again. No rollback was executed.

## Packaging and remaining verification

Stage explicit reviewed src changes, the three performance test files and the task-specific handoff/evidence packet after staged-file secret scanning. No blanket git add, no push. Staged-content secret scan found no credential signatures across 170 files. Staging immutable reports/raw logs revealed 30 existing whitespace notices in nine evidence documents (Markdown hard-break spaces, build-progress CRs, blank EOF lines); whole staged `git diff --cached --check` returned 2. Source/test-only staged whitespace check returned 0. Preserve those historical evidence bytes rather than normalizing accepted hashes; this is not a source/build failure, and the whole-staged whitespace result is NOT claimed clean. No active Git hooks were found. Deploy an isolated production-source archive of that exact commit, linked to the same Vercel project, rather than uploading unrelated dirty worktree files or evidence logs. No .env/private data copied; Production environment remains managed by the existing Vercel project.

This is a pre-release record, not a claim that deployment is live. Exact commit/deployment/version, artifact/alias/region verification, public/protected route results and owner UAT instructions will be recorded in `CP-RELEASE-01-RECEIPT.md` after actual execution. Browser/authenticated CRUD/RLS and hosted navigation speed remain unverified until approved owner UAT.
