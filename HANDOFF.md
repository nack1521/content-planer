# Content Planner Handoff — Milestone 4 Revision Complete

## Milestone Status

**Status: Revision complete; awaiting Codex review**

- **Milestone 3**: Accepted by Codex on 2026-09-14 (baseline preserved).
- **Milestone 4**: Revision complete and verified across all criteria; stopping for Codex review.
- **Milestone 5**: Unstarted (blocked by Milestone 4 review).
- **Hosted Supabase Status**: Clean. Zero hosted migrations or hosted imports were performed. Milestone 2 baseline remains on hosted Supabase without modification. All testing was executed against the isolated local Supabase stack (`127.0.0.1:54321`).
- **Media Uploads / Sprint 2**: Zero media upload features or Sprint 2 capabilities added; dormant `content_media` infrastructure left untouched.

---

## Implemented Behavior & Revisions

### 1. Repaired `RecordModal` Focus Lifecycle
- **Strict Mount/Unmount Focus Invariants**:
  - Initial title focus happens strictly once on mount (`useEffect(..., [])`).
  - Opener element focus restore happens strictly once on unmount (`return () => previousFocusRef.current?.focus()`).
  - Mutating dirty state (e.g. typing the first character into Caption or any other field) does NOT re-trigger initial field focus. Focus remains in the active field.
  - Stable refs (`isDiscardOpenRef`, `handleRequestCloseRef`) ensure keyboard handlers always access the latest dirty/modal state without re-binding or resetting focus.
- **Discard Dialog Focus Trapping & Restoration**:
  - While the discard dialog is open, its Cancel button ("Keep editing") receives focus immediately, and Tab/Shift+Tab traps focus strictly within the dialog.
  - Escape within the discard dialog cancels dismissal and restores focus to the initiating editor control (`lastFocusedBeforeDiscardRef.current`).
  - Confirming discard closes the editor and restores focus to the external opener element.
- **Verification Honesty**:
  - Focus lifecycle behavior is verified through manual live-browser testing. Synthetic, artificial controller test abstractions (`modalFocusLifecycle.ts`) were removed to avoid claiming Node tests protect actual DOM focus transitions.

### 2. Action Error Propagation Contract & Single Localization Boundary
- **Preserved Server Error Codes in Parent Handlers**:
  - Content action handlers in `PlannerView.tsx` and linked-content handlers in `TasksView.tsx` now pass original stable server error codes (`throw new Error(res.error || 'save_failed')`) rather than prematurely translating them with `getLocalizedErrorMessage(t, res.error)`.
  - `RecordModal.tsx` acts as the single localization boundary for save, delete, duplicate, archive, and restore errors.
  - In `src/utils/recordActions.ts`, `extractErrorCode` safely extracts error codes from `Error` instances, strings, error objects, `null`, `undefined`, or empty values, safely defaulting to `'save_failed'`.
- **Failure UI & State Guarantees**:
  - `isSubmittedRef.current = true` and `onClose()` are invoked strictly after action success.
  - On failure or rejection, the modal and draft remain open, and the specific error code is safely translated to display in the modal's error banner (e.g. `not_found` displays "The requested record was not found." / "ไม่พบข้อมูลที่ต้องการ", not generic `unknown`).
  - Prevents unhandled promise rejections.
- **Production Regression Test**:
  - Added automated tests in `tests/editor-milestone4.test.mjs` verifying that stable server error codes (`not_found`, `save_failed`, `unauthorized`, `invalid_id`, `validation_failed`, `service_error`) reach the modal translation boundary unchanged, render their distinct localized strings in both English and Thai, and leave the editor open.

### 3. Enforced Strict Client Link Validation
- Replaced `startsWith('http')` with the shared production URL validator `isValidUrl` from `src/utils/validation.ts`.
- Accepts only valid `http:` and `https:` URLs.
- Rejects malformed URLs (empty, spaces, invalid syntax, missing hostname), dangerous schemes (`javascript:`, `data:`, `ftp:`, `file:`, `blob:`), and deceptive schemes (`httpfake:`, `https:`) before invoking `onSave`.
- Keeps existing server-side and database-level validation unchanged.
- Added comprehensive unit tests in `tests/editor-milestone4.test.mjs`.

### 4. External-Link Workspace
- Extended the content link workspace inside `src/components/planner/RecordModal.tsx` and `src/components/planner/LinkCard.tsx`.
- Supported link types: `idea_source`, `asset`, `note`, and `published`.
- Preserves URL, optional label, optional platform (`tiktok`, `instagram`, `youtube`, `facebook`, `x`), type, and sort order.
- Supports adding, editing, removing, and reordering links.
- Uses accessible "Move up" and "Move down" controls with boundary protection (`disabled={index === 0}` and `disabled={index === totalCount - 1}`) powered by pure helper `src/utils/linkReorder.ts`.
- Assigns stable client IDs (`clientId`) to draft links so input focus and DOM identity do not jump during reordering.
- Shows compact link cards containing:
  - Label with localized fallback (custom label -> safe domain -> localized link type);
  - Localized link type badge;
  - Localized platform badge;
  - Safe local domain parsing via `src/utils/url/safeDomain.ts` (stripping `www.`, zero external scraping or network requests);
  - Copy link button with localized success/error feedback;
  - Open link in a new tab with `target="_blank"` and `rel="noopener noreferrer"`;
  - Move up / move down buttons;
  - Remove button.
- Initial saved links are sorted by `sort_order` ascending.
- On save, deterministic `sort_order` values matching the displayed array order (`0, 1, 2...`) are submitted to the atomic `upsert_content_item_with_links` RPC.

### 5. Live Text Post Preview
- Platform-neutral preview component `src/components/planner/TextPreview.tsx` rendering active draft in real-time.
- Displays:
  - Hook / main message;
  - Caption with line breaks preserved (`whitespace-pre-wrap`);
  - Call to action (CTA);
  - Hashtags cleanly parsed into `#tag` badges via `src/utils/hashtags.ts`.
- Provides distinct localized empty states when fields are blank.

### 6. Accessible Copy Controls & Feedback
- `src/utils/clipboard.ts` safely handles `navigator.clipboard.writeText`, catching rejection or insecure-context errors without throwing.
- Copy buttons for Caption, CTA, Hashtags, and Link URLs.
- Visual feedback toggles between default icon, emerald checkmark + localized "Copied!" message, and rose "Failed to copy" message.
- Screen-reader feedback provided through an `aria-live="polite"` live announcement region.

### 7. Unsaved-Change Protection
- `src/utils/dirtyState.ts` provides pure comparison between baseline state and current editable form state.
- Tracks all fields including link count, values, and order. Fresh untouched form is clean.
- `src/components/planner/DiscardConfirmDialog.tsx` with `role="alertdialog"`, `aria-modal="true"`, and focus trapping.
- Intercepts dismissal attempts when dirty (Close "X" button, Cancel button, backdrop click, Escape key).
- `beforeunload` event listener attached only while form is dirty, removed on clean/save/unmount.

---

## Files Changed

- `src/components/planner/PlannerView.tsx`: Passed raw error codes from server actions without premature translation.
- `src/components/tasks/TasksView.tsx`: Passed raw error codes from linked content actions without premature translation.
- `src/utils/recordActions.ts`: [NEW] Safe async action executor with `extractErrorCode` handling missing or non-Error values.
- `src/utils/url/safeDomain.ts`: [NEW] Safe local domain parser for external links.
- `src/utils/clipboard.ts`: [NEW] Robust clipboard copy helper with error handling.
- `src/utils/dirtyState.ts`: [NEW] Pure dirty-state comparison and link equality functions.
- `src/utils/linkReorder.ts`: [NEW] Pure array item reordering with boundary safety.
- `src/utils/hashtags.ts`: [NEW] Pure hashtag parser and formatter.
- `src/components/common/Icons.tsx`: Added `IconArrowUp`, `IconArrowDown`, and `IconExternalLink`.
- `src/components/planner/LinkCard.tsx`: [NEW] Compact link card with controls, badges, domain, and reordering.
- `src/components/planner/TextPreview.tsx`: [NEW] Platform-neutral text post preview with copy controls.
- `src/components/planner/DiscardConfirmDialog.tsx`: [NEW] Accessible alertdialog for unsaved changes.
- `src/components/planner/RecordModal.tsx`: Repaired focus lifecycle, strict URL validation, safe action error handling, link workspace, text preview, and copy controls.
- `src/messages/en.json`: Added 26 Milestone 4 localization keys.
- `src/messages/th.json`: Added 26 matching Thai localization keys.
- `tests/editor-milestone4.test.mjs`: [NEW] 17 comprehensive production tests covering domain parsing, strict validation, reordering, hashtags, action error propagation regression, non-Error safety, clipboard resilience, dirty detection, localization parity, and static markup contracts.
- `tests/run-tests.mjs`: Registered Milestone 4 test suite into clean-environment test runner.
- `TASKS.md`: Marked Milestone 4 as revision complete; awaiting Codex review.
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
✓ Compiled successfully in 1084ms
  Running TypeScript ...
  Finished TypeScript in 1225ms ...
✓ Generating static pages using 7 workers (17/17) in 352ms
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
✔ 17/17 tests passed
=== 7. Building Content Planner Application from Current Source ===
✓ Compiled successfully
=== 8. Running Live Server & HTTP Integration Suites ===
✔ 14/14 tests passed
=== [SUCCESS] ALL CLEAN-ENVIRONMENT CHECKS AND TEST SUITES PASSED ===
Total: 160 tests passing cleanly across database, domain, accessibility, localization, importer, server actions, Milestone 4 editor, and live HTTP integration.
```

---

## Verification Honesty & DOM Focus Testing Limitation

- **Automated Test Scope**: The automated test suite executes directly against production helper logic (`src/utils/linkReorder.ts`, `src/utils/hashtags.ts`, `src/utils/recordActions.ts`, `src/utils/validation.ts`, `src/utils/dirtyState.ts`, `src/utils/clipboard.ts`). Synthetic focus test controller mocks have been removed.
- **Limitation**: The Node test runner does not run a browser layout or interactive window event engine, so automated tests cannot directly verify real `document.activeElement` transitions across actual browser focus events without adding heavy browser dependencies.
- **Manual Verification Evidence**:
  - Manual live-browser testing was conducted against the local Next.js server connected to the local Supabase stack.
  - Step 1: Opened existing content record from `/th/planner`. Title input initially received focus on modal mount.
  - Step 2: Clicked into `#modal-caption-textarea`. Focus moved to Caption textarea.
  - Step 3: Typed first character `"Z"`. Form transitioned from clean to dirty (`isDirty: true`).
  - Step 4: Focus remained strictly in the Caption textarea; Title input did not steal focus.
  - Step 5: Pressed Escape / clicked Close button. Discard confirmation dialog opened, and focus moved to the "Keep editing" (`#cancelBtn`) button.
  - Step 6: Pressed Escape / clicked "Keep editing". Discard dialog closed, modal and draft remained intact, and focus returned directly to the initiating editor control.
  - Step 7: Confirmed discard; modal unmounted and restored focus to the external opener element.

---

## Manual Review Instructions

1. Start development server with local Supabase: `npm run dev` and navigate to `http://localhost:3000/th/planner`.
2. **Action Error Propagation Check**:
   - In simulated failure/offline mode (e.g. invalid UUID or intercepted network error), trigger Delete, Duplicate, or Archive.
   - Observe that the editor stays open, draft is preserved, and a specific localized error message is displayed (e.g. "ไม่พบข้อมูลที่ต้องการ" or "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง"), NOT the generic "เกิดข้อผิดพลาดที่ไม่คาดคิด".
3. **Focus Stability Check**:
   - Open an existing record or create one.
   - Click into Caption textarea and type a character.
   - Observe that cursor and focus stay in Caption (does not jump back to Title).
   - Press Escape or click Close; observe discard dialog appears with focus on "Keep editing".
   - Press Escape or click "Keep editing"; observe discard dialog closes and focus returns to the initiating control.
4. **Strict URL Validation Check**:
   - Add a link with `javascript:alert(1)`, `data:text/html,123`, or `not-a-url`.
   - Click "Save"; observe client validation error "Please enter a valid HTTP or HTTPS URL" without submitting.
5. **Link Workspace & Live Preview**:
   - Add links, reorder them with Move Up/Down, verify boundary disabling.
   - Observe real-time platform-neutral preview formatting and line-break preservation.
   - Test copy controls for caption, CTA, hashtags, and link URLs.

---

## Confirmation

- **Hosted Supabase was NOT modified**: Zero hosted migrations or hosted imports were performed.
- **Milestone 5 has NOT been started**.
