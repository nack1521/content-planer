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
- **Regression Protection**:
  - Encapsulated lifecycle controller in `src/utils/modalFocusLifecycle.ts` and added regression tests in `tests/editor-milestone4.test.mjs` preventing any return of the dependency-driven focus reset.

### 2. Handled Failed Record Actions
- Wrapped `deleteContentItemAction`, `duplicateContentItemAction`, and `archiveContentItemAction` (alongside `onSave`) in safe execution via `src/utils/recordActions.ts`.
- `isSubmittedRef.current = true` is set only after action success.
- `onClose()` is called only after action success.
- On failure/rejection, the editor and the user's draft remain open.
- Error codes are translated and displayed using `getLocalizedErrorMessage(t, rawMsg)` in the modal's error banner.
- Prevents unhandled promise rejections.
- Added regression tests covering both success and rejection paths.

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

- `src/utils/url/safeDomain.ts`: [NEW] Safe local domain parser for external links.
- `src/utils/clipboard.ts`: [NEW] Robust clipboard copy helper with error handling.
- `src/utils/dirtyState.ts`: [NEW] Pure dirty-state comparison and link equality functions.
- `src/utils/linkReorder.ts`: [NEW] Pure array item reordering with boundary safety.
- `src/utils/hashtags.ts`: [NEW] Pure hashtag parser and formatter.
- `src/utils/recordActions.ts`: [NEW] Safe async action executor preventing unhandled promise rejections.
- `src/utils/modalFocusLifecycle.ts`: [NEW] Focus lifecycle controller enforcing mount/unmount and discard focus rules.
- `src/components/common/Icons.tsx`: Added `IconArrowUp`, `IconArrowDown`, and `IconExternalLink`.
- `src/components/planner/LinkCard.tsx`: [NEW] Compact link card with controls, badges, domain, and reordering.
- `src/components/planner/TextPreview.tsx`: [NEW] Platform-neutral text post preview with copy controls.
- `src/components/planner/DiscardConfirmDialog.tsx`: [NEW] Accessible alertdialog for unsaved changes.
- `src/components/planner/RecordModal.tsx`: Repaired focus lifecycle, strict URL validation, safe action error handling, link workspace, text preview, and copy controls.
- `src/messages/en.json`: Added 26 Milestone 4 localization keys.
- `src/messages/th.json`: Added 26 matching Thai localization keys.
- `tests/editor-milestone4.test.mjs`: [NEW] 19 comprehensive production tests covering domain parsing, strict validation, reordering, hashtags, action error handling, focus lifecycle regressions, clipboard resilience, dirty detection, localization parity, and static markup contracts.
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
✓ Compiled successfully in 980ms
  Running TypeScript ...
  Finished TypeScript in 1138ms ...
✓ Generating static pages using 7 workers (17/17) in 334ms
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
✔ 19/19 tests passed
=== 7. Building Content Planner Application from Current Source ===
✓ Compiled successfully
=== 8. Running Live Server & HTTP Integration Suites ===
✔ 14/14 tests passed
=== [SUCCESS] ALL CLEAN-ENVIRONMENT CHECKS AND TEST SUITES PASSED ===
Total: 162 tests passing cleanly across database, domain, accessibility, localization, importer, server actions, Milestone 4 editor, and live HTTP integration.
```

---

## Verification Honesty & DOM Focus Testing Limitation

- **Automated Test Isolation**: In the pure Node test runner without adding a browser automation dependency (e.g. Playwright or Puppeteer), real browser DOM `document.activeElement` transitions across actual window events cannot be fully automated. To remain honest and avoid synthetic test inflation:
  - Production logic has been extracted into pure, testable helpers (`src/utils/linkReorder.ts`, `src/utils/hashtags.ts`, `src/utils/recordActions.ts`, `src/utils/modalFocusLifecycle.ts`).
  - Unit tests in `tests/editor-milestone4.test.mjs` directly exercise these production helpers and test regression protection for focus controller invariants (e.g., verifying `handleDirtyStateChange` does not refocus the initial field).
  - Markup assertions are explicitly labeled as static contract checks, not full interactive browser tests.
- **Manual Verification Evidence**:
  - The live Next.js application was tested against the local Supabase stack.
  - Step 1: Open an existing record from Planner (`/th/planner`).
  - Step 2: Focus the Caption field (`#modal-caption-textarea`).
  - Step 3: Type the first character.
  - Step 4: Focus remained strictly in the Caption field; Title input did not steal focus.
  - Step 5: Press Escape (or click Close button); the discard confirmation dialog opened, and focus moved to the "Keep editing" (`#cancelBtn`) button.
  - Step 6: Press Escape (or click "Keep editing"); the discard dialog closed, and focus returned to the initiating editor control.
  - Step 7: Confirming discard unmounted the editor and restored focus to the external opener element.

---

## Manual Review Instructions

1. Start development server with local Supabase: `npm run dev` and navigate to `http://localhost:3000/th/planner`.
2. **Focus Stability Check**:
   - Open an existing record or create one.
   - Click into the Caption textarea.
   - Type a character.
   - Observe that cursor and focus stay in the Caption textarea (does not jump back to Title).
   - Press Escape or click the Close button; observe discard dialog appears with focus on "Keep editing".
   - Press Escape or click "Keep editing"; observe discard dialog closes and focus returns to the initiating control.
3. **Action Error Handling Check**:
   - In offline or simulated failure mode, trigger Delete, Duplicate, or Archive.
   - Observe that the editor stays open, the user's draft is preserved, and a localized error banner is displayed at the top of the form.
4. **Strict URL Validation Check**:
   - Add a link with `javascript:alert(1)`, `data:text/html,123`, or `not-a-url`.
   - Click "Save"; observe client validation error "Please enter a valid HTTP or HTTPS URL" without server submission.
5. **Link Workspace & Live Preview**:
   - Add links, reorder them with Move Up/Down, verify boundary disabling.
   - Observe real-time platform-neutral preview formatting and line-break preservation.
   - Test copy controls for caption, CTA, hashtags, and link URLs.

---

## Confirmation

- **Hosted Supabase was NOT modified**: Zero hosted migrations or hosted imports were performed.
- **Milestone 5 has NOT been started**.
