# Finish plan: hosted Excel/Notion import

Status: **Owner declined a backup; hosted writes remain paused.** This is the agreed path to finish Milestone 7's one-time data import for exactly three separate accounts. Antigravity implements the bounded steps; Codex reviews the result and authorizes no database write on the user's behalf without the user's explicit final approval.

## What is already done

- The user ran the hosted **read-only** preflight on 2026-09-16. It reported three confirmed target accounts, no source-number collisions, and zero database writes.
- The source/date policy is locked: 38 obvious day/month reversals corrected; 22 ambiguous records left unscheduled.
- The tested local import expects, per account, 158 numbered content items, 419 links, 30 reference accounts, and 16 tasks. Account 2 has one pre-existing unnumbered item that must remain (159 total content items afterward).
- Hosted import has **not** run. The import migration has **not** been applied to hosted Supabase. Hosted write authorization is still disabled.
- On 2026-09-17 the owner explicitly declined a backup. The earlier read-only preflight did find one existing unnumbered item in Account 2, so this is not a completely empty database. No-backup execution carries a risk of unrecoverable loss if an unexpected hosted write occurs. The atomic import transaction reduces partial-import risk but is not a backup.

## Remaining sequence

1. **Antigravity:** Add a small, explicit no-backup acknowledgement path to the hosted importer. It must be distinct from `--confirm-backup` (which must never be used falsely), require final execution confirmation, preserve the exact-three-account and manifest guards, and be tested locally. Do not run the backup script or request the database password.
2. **Codex:** Review that change and rerun the hosted **read-only** preflight. Confirm the three target users, no source-number collisions, and Account 2's existing unnumbered item. Stop if the hosted state has changed unexpectedly.
3. **User:** After seeing the read-only result and the no-backup risk, explicitly approve the hosted migration and one-time import without a backup. The backup waiver alone is not execution approval.
4. **Antigravity, only after approval:** Apply the pending import migration, repeat the read-only preflight, then perform the guarded import once with the truthful no-backup acknowledgement. Keep the three target accounts separate. If any result is uncertain, stop and reconcile read-only before considering a rerun.
5. **Codex:** Verify the hosted results and owner isolation: 158 newly imported numbered items, 419 links, 30 reference accounts, and 16 tasks for each account; Account 2 must have 159 total content items because its existing unnumbered item is preserved. Confirm the approved 38/22 date outcomes. Record the result without secrets or private source URLs.
6. **Antigravity + Codex:** Restore the import lock/guard, perform the owner sign-in and private-planner smoke tests, and complete the remaining Milestone 7 release checks in `TASKS.md` before calling the release finished.

## Current next action

Antigravity's next task is **only** the truthful no-backup guard change and its local tests. The existing backup scripts are not needed for this owner's chosen path. Return the diff for Codex review. Do **not** apply the migration, enable hosted-write authorization, or run the import yet.
