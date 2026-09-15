# Content Planner Handoff — Milestone 4 Implementation Complete

## Milestone Status

**Status: Implementation complete; awaiting Codex review**

- **Milestone 3**: Accepted by Codex on 2026-09-14 (baseline preserved).
- **Milestone 4**: Implementation complete and verified across all criteria; stopping for Codex review.
- **Hosted Supabase Status**: Clean. Zero hosted migrations or hosted imports were performed. Milestone 2 baseline remains on hosted Supabase without modification. All testing was executed against the isolated local Supabase stack (`127.0.0.1:54321`).

---

## Implemented Behavior

### 1. External-Link Workspace
- Extended the content link workspace inside `src/components/planner/RecordModal.tsx` and created `src/components/planner/LinkCard.tsx`.
- Supported link types: `idea_source`, `asset`, `note`, and `published`.
- Preserves URL, optional label, optional platform (`tiktok`, `instagram`, `youtube`, `facebook`, `x`), type, and sort order.
- Supports adding, editing, removing, and reordering links.
- Uses accessible "Move up" and "Move down" controls with boundary protection (`disabled={index === 0}` and `disabled={index === totalCount - 1}`).
- Assigns stable client IDs (`clientId`) to draft links so input focus and DOM identity do not jump during reordering.
- Shows compact link cards containing:
  - Label with sensible localized fallback (custom label -> safe domain -> localized link type);
  - Localized link type badge;
  - Localized platform badge (when assigned);
  - Safe local domain parsing via `src/utils/url/safeDomain.ts` (stripping `www.`, rejecting non-HTTP/HTTPS schemes, zero external scraping or network requests);
  - Copy link button with localized success/error feedback;
  - Open link in a new tab with `target="_blank"` and `rel="noopener noreferrer"`;
  - Move up / move down buttons;
  - Remove button.
- Initial saved links are sorted by `sort_order` ascending.
- On save, deterministic `sort_order` values matching the displayed array order (`0, 1, 2...`) are submitted to the existing atomic `upsert_content_item_with_links` RPC.

### 2. Live Text Post Preview
- Created `src/components/planner/TextPreview.tsx` rendering a platform-neutral formatting preview directly inside the editor.
- Previews the active unsaved draft in real-time.
- Displays:
  - Hook / main message;
  - Caption with line breaks preserved (`whitespace-pre-wrap`);
  - Call to action (CTA);
  - Hashtags cleanly parsed into `#tag` badges.
- Provides distinct localized empty states when fields are blank.
- Does not imitate any specific social-media proprietary interface.

### 3. Accessible Copy Controls & Feedback
- Created `src/utils/clipboard.ts` handling `navigator.clipboard.writeText` safely. Catches API rejection or insecure-context errors and returns `false` without crashing.
- Added copy buttons for:
  - Caption;
  - Call to Action;
  - Hashtags;
  - Individual link URLs.
- Visual feedback toggles between default icon, emerald checkmark + localized "Copied!" message, and rose "Failed to copy" message.
- Screen-reader feedback provided through an `aria-live="polite"` live announcement region.
- Does not report success unless copying actually succeeds.

### 4. Unsaved-Change Protection
- Created `src/utils/dirtyState.ts` providing pure comparison logic between initial baseline state and current editable form state.
- Tracks title, platforms, content pillar, format, goal, workflow status, progress, publish date/time, time known, hook, objective, production detail, CTA, caption, hashtags, review status, notes, and links (including link count, values, and order).
- A fresh, untouched new form evaluates to `false` (not dirty).
- Created `src/components/planner/DiscardConfirmDialog.tsx` with `role="alertdialog"`, `aria-modal="true"`, and focus trapping.
- Intercepts dismissal attempts when dirty:
  - Close "X" button;
  - Cancel button;
  - Modal backdrop click;
  - Escape key.
- The nested discard dialog exclusively handles Escape and Tab while open, preventing the parent modal handler from interfering.
- Cancelling discard keeps the editor open with all draft values and restores focus to the editor control.
- Confirming discard closes the editor.
- Browser tab closing, refresh, and navigation are guarded via `beforeunload` event listener attached only while the form is dirty and cleanly removed on unmount or save.
- Successful save, delete, duplicate, and archive operations set `isSubmittedRef.current = true`, closing without any discard warning.
- Failed operations keep the editor open, display localized error feedback, and preserve the user's draft.

### 5. Quality & Localization
- 100% parity between `src/messages/en.json` and `src/messages/th.json` with 26 new keys covering copy controls, link workspace, preview labels, empty states, and discard dialog.
- Preserved all existing Milestone 3 fields, production tasks readout, and responsive styling.
- Zero migrations created; zero dependencies added.
- `content_media` table and storage bucket remain dormant and unexposed.

---

## Files Changed

- `src/utils/url/safeDomain.ts`: [NEW] Safe local domain parser for external links.
- `src/utils/clipboard.ts`: [NEW] Robust clipboard copy helper with error handling.
- `src/utils/dirtyState.ts`: [NEW] Pure dirty-state comparison and link equality functions.
- `src/components/common/Icons.tsx`: Added `IconArrowUp`, `IconArrowDown`, and `IconExternalLink`.
- `src/components/planner/LinkCard.tsx`: [NEW] Compact link card with controls, badges, domain, and reordering.
- `src/components/planner/TextPreview.tsx`: [NEW] Platform-neutral text post preview with copy controls.
- `src/components/planner/DiscardConfirmDialog.tsx`: [NEW] Accessible alertdialog for unsaved changes.
- `src/components/planner/RecordModal.tsx`: Integrated link workspace, text preview, copy controls, dirty tracking, and discard protection.
- `src/messages/en.json`: Added 26 Milestone 4 localization keys.
- `src/messages/th.json`: Added 26 matching Thai localization keys.
- `tests/editor-milestone4.test.mjs`: [NEW] 16 comprehensive behavioral tests for domain parsing, reordering, preview formatting, clipboard handling, dirty detection, dismissal flow, accessibility, and beforeunload.
- `tests/run-tests.mjs`: Registered Milestone 4 test suite into clean-environment test runner.
- `TASKS.md`: Marked Milestone 4 as implementation complete; awaiting Codex review.
- `HANDOFF.md`: Updated handoff documentation.

---

## Exact Verification Results

### 1. Whitespace / Diff Check
Command: `git diff --check`
Result: Clean exit (0 whitespace errors).

### 2. ESLint
Command: `npm run lint`
Result: Clean exit (0 errors, 0 warnings).

### 3. Isolated Local Supabase pgTAP Database Tests
Command: `npm run test:db`
Result:
```
/Users/nack/contentPlaner/supabase/tests/database/rls.test.sql .. ok
All tests successful.
Files=1, Tests=85,  0 wallclock secs ( 0.02 usr  0.01 sys +  0.01 cusr  0.00 csys =  0.04 CPU)
Result: PASS
[SUCCESS] All Content Planner pgTAP database tests passed on isolated local Supabase stack.
```

### 4. Next.js Production Build
Command: `npm run build`
Result:
```
▲ Next.js 16.3.5 (Turbopack)
- Environments: .env.local
✓ Compiled successfully in 1045ms
  Running TypeScript ...
  Finished TypeScript in 1195ms ...
✓ Generating static pages using 7 workers (17/17) in 366ms
  Finalizing page optimization ...
Route (app): all 17 routes compiled and generated cleanly without errors.
```

### 5. Complete Test Runner (`npm test`)
Command: `npm test`
Result:
```
=== 1. Verifying and Preparing Isolated Local Supabase Environment ===
85/85 pgTAP tests passed.
=== 2. Running Production Domain & Validation Suites ===
✔ 15/15 tests passed
=== 3. Running Accessibility & Keyboard Navigation Suite ===
✔ 6/6 tests passed
=== 4. Running Localization & String Scanner Suite ===
✔ 5/5 tests passed
=== 5. Running Production Importer CLI & Idempotency Suite ===
✔ 10/10 tests passed
=== 6. Running Authenticated Server Actions & Atomic Rollback Suite ===
✔ 8/8 tests passed
=== 6b. Running Content Editor & Link Workspace Suite (Milestone 4) ===
✔ 16/16 tests passed
=== 7. Building Content Planner Application from Current Source ===
✓ Compiled successfully
=== 8. Running Live Server & HTTP Integration Suites ===
✔ 14/14 tests passed
=== [SUCCESS] ALL CLEAN-ENVIRONMENT CHECKS AND TEST SUITES PASSED ===
Total: 159 tests passing cleanly across database, domain, accessibility, localization, importer, server actions, Milestone 4 editor, and live HTTP integration.
```

---

## Manual Review Instructions

1. Start development server: `npm run dev` and navigate to `http://localhost:3000/th/planner` or `http://localhost:3000/en/planner`.
2. **Untouched Form Clean Check**:
   - Click "New Content" (`+ แผนใหม่` / `+ New Content`).
   - Press Escape or click the "X" close button without making changes.
   - Verify the modal closes immediately without prompting for discard.
3. **External-Link Workspace**:
   - Open any record or create a new one.
   - In "Content Links", click "Add Link".
   - Enter a URL (e.g. `https://www.youtube.com/watch?v=123`), select platform "YouTube", select type "Idea Source", and enter label "Tutorial reference".
   - Observe the card header displaying `#1`, label, platform badge, type badge, and parsed domain `youtube.com`.
   - Add a second link (e.g. `https://drive.google.com/drive/folders/abc`), type "Asset / Drive".
   - Verify that link #1 has "Move up" disabled and "Move down" enabled; link #2 has "Move down" disabled and "Move up" enabled.
   - Click "Move up" on link #2; verify link #2 moves to position #1 with inputs and focus preserved.
   - Click "Open link" (external link icon) and verify it opens in a new browser tab with `target="_blank"` and `rel="noopener noreferrer"`.
4. **Live Text Preview**:
   - Enter a hook, multi-line caption, and call-to-action in the form fields.
   - Observe the "Post Text Preview" section updating live below caption.
   - Verify caption line breaks are preserved cleanly.
   - Enter hashtags separated by spaces or commas (e.g. `marketing, tech growth`); observe preview tags rendered as `#marketing #tech #growth`.
   - Clear fields to verify localized empty state fallbacks.
5. **Copy Controls & Accessible Announcements**:
   - In the text preview, click "Copy caption", "Copy CTA", or "Copy hashtags".
   - Verify visual checkmark feedback ("Copied!") for 2 seconds.
   - In link cards, click the copy button next to the link URL; verify URL is copied with localized feedback.
6. **Unsaved-Change Protection**:
   - Make any change to a field or link.
   - Press Escape, click the close button, or click the outer backdrop.
   - Verify the "Unsaved Changes" alert dialog appears.
   - Click "Keep Editing"; verify the dialog closes, all draft values remain intact, and focus returns to the editor.
   - Press Escape again and click "Discard Changes"; verify the modal closes.
   - Try refreshing the browser tab while changes are pending; verify browser `beforeunload` warning is triggered.
   - Edit a record and click "Save Record"; verify save succeeds atomically and modal closes without any discard prompt.

---

## Assumptions and Deviations

- None. All implementation adheres strictly to the approved Milestone 4 roadmap specifications without schema modifications or external package additions.

## Unresolved Risks

- None. Local test isolation, RLS enforcement, atomic rollback, and client runtime validation remain fully intact and verified.

## Confirmation

- **Hosted Supabase was NOT modified**: No migrations were applied to hosted Supabase, and no hosted data was touched.
