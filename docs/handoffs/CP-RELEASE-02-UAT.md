# CP-RELEASE-02 — Owner Desktop UAT Acceptance

Owner feedback: Discord `1562416547702636636`, “1–4: ผ่าน”. This accepts the four desktop UAT cases offered in the preceding release response for application commit `25e9366110bd7125924675c45b722824b6972576` (`25e9366`).

Verified release reference: `dpl_hdg9oLjeDzvdBD1acg6raAbDTWRj`, existing Production alias `https://content-planner-zeta-dusky.vercel.app`. Read [the deployment receipt](CP-RELEASE-02-RECEIPT.md) for build/serving/rollback evidence; that earlier receipt's pending-UAT state is historical and is resolved by this separate acceptance.

## Owner-reported cases — PASS

1. On a long page, scrolling and menu changes keep the language/timezone/Sign Out block at the bottom of the viewport; include a short-window check.
2. Tasks checkbox left padding and desktop table fit.
3. Inert task-row clicks open editing, while the checkbox independently toggles status and linked content independently opens its existing editor.
4. Drag-select/copy row text without opening the editor, and use Tab/Enter on the task title without double activation.

This is owner-reported acceptance of the offered cases, not an automated browser trace or a quantified timing/accessibility measurement. It does not establish unoffered mobile, all-account/auth/RLS, complete CRUD/data-integrity, or whole-product regression coverage. Keep the earlier independent source/synthetic review and this owner report as separate evidence layers.

## Closeout and Git scope

The desktop implementation/review/deployment/UAT sequence is closed for those cases. The same owner message authorizes a README refresh and Git push of the pending application commits plus documentation. The README describes the deployed theme/navigation/Tasks behavior and current verification limits. No new source, dependency, data/config, account, migration/import or manual deployment change is included; no further work/review loop is started.

Original implementation/review/deployment reports remain preserved. Unrelated dirty project/import/operator files are not included in the documentation commit or upload.
