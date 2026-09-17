# Finish plan: hosted Excel/Notion import

Status: **Password ready; backup verification next. Hosted writes remain paused.** This is the agreed path to finish Milestone 7's one-time data import. Antigravity implements the bounded steps; Codex reviews the result and authorizes no database write on the user's behalf without the user's explicit final approval.

## What is already done

- The user ran the hosted **read-only** preflight on 2026-09-16. It reported three confirmed target accounts, no source-number collisions, and zero database writes.
- The source/date policy is locked: 38 obvious day/month reversals corrected; 22 ambiguous records left unscheduled.
- The tested local import expects, per account, 158 numbered content items, 419 links, 30 reference accounts, and 16 tasks. Account 2 has one pre-existing unnumbered item that must remain (159 total content items afterward).
- Hosted import has **not** run. The import migration has **not** been applied to hosted Supabase. Hosted write authorization is still disabled.

## Remaining sequence

1. **User:** Obtain the hosted Supabase database password privately. Do not send it in chat, commit it, or put it into a shell command that may be saved in history.
2. **Antigravity:** Prepare a verified, private backup of the *current hosted state* before changing it. Verify that the backup contains the existing planner data (including Account 2's unnumbered item) and document its scope, timestamp, restore method, and limitations. A single default `supabase db dump` is schema-only and is **not** enough to claim a data backup. Do not restore over the live project merely to test the backup.
3. **Codex + user:** Review the backup evidence and exact execution plan. If the backup cannot be verified, stop here. Ask the user for explicit final approval of the hosted migration and one-time import; earlier approval to prepare/preflight is not this final approval.
4. **Antigravity, only after approval:** Apply the pending import migration, rerun hosted read-only preflight, then perform the guarded import once. Keep the three target accounts separate. If any result is uncertain, stop and reconcile read-only before considering a rerun.
5. **Codex:** Verify the hosted results and owner isolation: 158 newly imported numbered items, 419 links, 30 reference accounts, and 16 tasks for each account; Account 2 must have 159 total content items because its existing unnumbered item is preserved. Confirm the approved 38/22 date outcomes. Record the result without secrets or private source URLs.
6. **Antigravity + Codex:** Restore the import lock/guard, perform the owner sign-in and private-planner smoke tests, and complete the remaining Milestone 7 release checks in `TASKS.md` before calling the release finished.

## Current next action

The user confirmed **“database password ready”** on 2026-09-16. Antigravity's next task is **backup only**: guide the user to enter the password privately (never in chat, source files, command history, or logs); export roles, schema, and data with the current Supabase-supported procedure; account explicitly for Auth users and Storage metadata that may be excluded by default; and verify the backup can recover the current planner state, including Account 2's existing unnumbered item. Store backup files privately with restricted access and report only their location, timestamp, scope, verification evidence, and limitations—no data rows or secrets. Stop and return the evidence for Codex review. Do **not** apply the migration, enable hosted-write authorization, or run the import yet.

Official references: [Supabase database backups](https://supabase.com/docs/guides/platform/backups) and [CLI backup/restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
