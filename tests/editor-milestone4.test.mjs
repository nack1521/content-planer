import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getSafeDomain } from "../src/utils/url/safeDomain.ts";
import { copyToClipboard } from "../src/utils/clipboard.ts";
import { isFormDirty, areLinksEqual, arePlatformsEqual } from "../src/utils/dirtyState.ts";
import { validateContentLink, validateLinksArray, isValidUrl } from "../src/utils/validation.ts";
import { moveItemUp, moveItemDown } from "../src/utils/linkReorder.ts";
import { parseHashtags, formatHashtags } from "../src/utils/hashtags.ts";
import { executeRecordAction } from "../src/utils/recordActions.ts";
import { ModalFocusController } from "../src/utils/modalFocusLifecycle.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// ==============================================================================
// 1. Strict Client Link Validation & Safe Local Domain Parsing
// ==============================================================================
test("Safe Domain Parsing: Extracts hostname cleanly and strips www.", () => {
  assert.equal(getSafeDomain("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "youtube.com");
  assert.equal(getSafeDomain("https://youtube.com/watch?v=123"), "youtube.com");
  assert.equal(getSafeDomain("http://subdomain.example.co.th/path?a=1"), "subdomain.example.co.th");
  assert.equal(getSafeDomain("https://drive.google.com/drive/folders/xyz"), "drive.google.com");
  assert.equal(getSafeDomain("https://WWW.TIKTOK.COM/@creator/video/1"), "tiktok.com");
});

test("Safe Domain Parsing: Safely rejects invalid, empty, or dangerous URLs without network calls", () => {
  assert.equal(getSafeDomain(""), "");
  assert.equal(getSafeDomain("   "), "");
  assert.equal(getSafeDomain(null), "");
  assert.equal(getSafeDomain(undefined), "");
  assert.equal(getSafeDomain("javascript:alert(1)"), "");
  assert.equal(getSafeDomain("data:text/html,<b>hi</b>"), "");
  assert.equal(getSafeDomain("ftp://files.example.com"), "");
  assert.equal(getSafeDomain("file:///etc/passwd"), "");
  assert.equal(getSafeDomain("not-a-valid-url"), "");
  assert.equal(getSafeDomain("http://"), "");
});

test("Strict Client Link Validation: Shared isValidUrl production validator accepts only valid HTTP/HTTPS", () => {
  // Valid URLs
  assert.equal(isValidUrl("https://google.com"), true);
  assert.equal(isValidUrl("https://www.youtube.com/watch?v=123"), true);
  assert.equal(isValidUrl("http://localhost:3000/th/planner"), true);
  assert.equal(isValidUrl("http://example.org/path?query=val#anchor"), true);

  // Malformed URLs
  assert.equal(isValidUrl(""), false);
  assert.equal(isValidUrl("    "), false);
  assert.equal(isValidUrl(null), false);
  assert.equal(isValidUrl(undefined), false);
  assert.equal(isValidUrl("not-a-url"), false);
  assert.equal(isValidUrl("http://"), false);
  assert.equal(isValidUrl("https://"), false);
  assert.equal(isValidUrl("http://   spaces"), false);

  // Dangerous / non-HTTP protocols
  assert.equal(isValidUrl("javascript:alert(document.domain)"), false);
  assert.equal(isValidUrl("data:text/html,<script>alert(1)</script>"), false);
  assert.equal(isValidUrl("ftp://ftp.example.com/file.txt"), false);
  assert.equal(isValidUrl("file:///etc/passwd"), false);
  assert.equal(isValidUrl("blob:https://example.com/uuid-here"), false);

  // Deceptive schemes
  assert.equal(isValidUrl("httpfake://example.com"), false);
  assert.equal(isValidUrl("https:"), false);
  assert.equal(isValidUrl("http:"), false);
});

test("Link Validation: Server and database validators enforce HTTP/HTTPS and valid enums", () => {
  const valid = validateContentLink({
    link_type: "published",
    url: "https://www.tiktok.com/@test/video/123",
    platform: "tiktok",
    label: "Live Post",
    sort_order: 0,
  });
  assert.equal(valid.link_type, "published");
  assert.equal(valid.url, "https://www.tiktok.com/@test/video/123");
  assert.equal(valid.platform, "tiktok");
  assert.equal(valid.label, "Live Post");
  assert.equal(valid.sort_order, 0);

  // Rejects invalid schemes
  assert.throws(() => validateContentLink({ link_type: "asset", url: "javascript:evil()" }), /valid http or https URL/);
  assert.throws(() => validateContentLink({ link_type: "asset", url: "data:text/plain,123" }), /valid http or https URL/);
  assert.throws(() => validateContentLink({ link_type: "asset", url: "ftp://remote.host" }), /valid http or https URL/);

  // Rejects invalid link_type
  assert.throws(() => validateContentLink({ link_type: "invalid_type", url: "https://example.com" }), /Invalid link_type/);

  // Rejects invalid platform
  assert.throws(() => validateContentLink({ link_type: "asset", url: "https://example.com", platform: "myspace" }), /Invalid link platform/);
});

// ==============================================================================
// 2. Link Reordering with Imported Production Helpers
// ==============================================================================
test("Link Reordering: moveItemUp and moveItemDown respect boundaries and perform deterministic reordering", () => {
  const items = [
    { id: "1", title: "First" },
    { id: "2", title: "Second" },
    { id: "3", title: "Third" },
  ];

  // Boundary condition: index 0 cannot move up
  const noopUp = moveItemUp(items, 0);
  assert.deepEqual(noopUp, items, "Moving index 0 up must be a no-op");

  // Boundary condition: negative index cannot move up
  const negativeUp = moveItemUp(items, -1);
  assert.deepEqual(negativeUp, items, "Negative index must be a no-op");

  // Boundary condition: last index cannot move down
  const noopDown = moveItemDown(items, items.length - 1);
  assert.deepEqual(noopDown, items, "Moving last index down must be a no-op");

  // Boundary condition: out-of-range index cannot move down
  const outOfRangeDown = moveItemDown(items, items.length);
  assert.deepEqual(outOfRangeDown, items, "Out of range index must be a no-op");

  // Valid move up: move index 1 up
  const movedUp = moveItemUp(items, 1);
  assert.equal(movedUp[0].id, "2");
  assert.equal(movedUp[1].id, "1");
  assert.equal(movedUp[2].id, "3");

  // Valid move down: move index 0 down
  const movedDown = moveItemDown(movedUp, 0);
  assert.deepEqual(movedDown, items, "Moving back down restores original order");
});

test("Link Ordering: Deterministic sort_order assigned from displayed array order", () => {
  const rawList = [
    { link_type: "idea_source", url: "https://a.com", label: "A" },
    { link_type: "asset", url: "https://b.com", label: "B" },
    { link_type: "published", url: "https://c.com", label: "C" },
  ];

  const savedLinks = rawList.map((l, idx) => ({
    link_type: l.link_type,
    platform: l.platform || null,
    url: l.url.trim(),
    label: l.label ? l.label.trim() : null,
    sort_order: idx,
  }));

  assert.equal(savedLinks[0].sort_order, 0);
  assert.equal(savedLinks[1].sort_order, 1);
  assert.equal(savedLinks[2].sort_order, 2);

  const validated = validateLinksArray(savedLinks);
  assert.equal(validated.length, 3);
  assert.equal(validated[0].sort_order, 0);
  assert.equal(validated[1].sort_order, 1);
  assert.equal(validated[2].sort_order, 2);
});

test("Link Ordering: Initial links are sorted by sort_order ascending", () => {
  const unorderedFromDb = [
    { id: "1", link_type: "note", url: "https://note.com", label: "Note", sort_order: 2 },
    { id: "2", link_type: "idea_source", url: "https://idea.com", label: "Idea", sort_order: 0 },
    { id: "3", link_type: "asset", url: "https://asset.com", label: "Asset", sort_order: 1 },
  ];

  const sorted = [...unorderedFromDb].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  assert.equal(sorted[0].id, "2");
  assert.equal(sorted[1].id, "3");
  assert.equal(sorted[2].id, "1");
});

// ==============================================================================
// 3. Hashtags Utility (Imported Production Helper)
// ==============================================================================
test("Hashtags Utility: parseHashtags and formatHashtags sanitize inputs cleanly", () => {
  assert.deepEqual(parseHashtags(""), []);
  assert.deepEqual(parseHashtags(null), []);
  assert.deepEqual(parseHashtags(undefined), []);

  const parsed = parseHashtags("growth, marketing #creator   #business  strategy");
  assert.deepEqual(parsed, ["#growth", "#marketing", "#creator", "#business", "#strategy"]);

  const formatted = formatHashtags("growth, marketing #creator");
  assert.equal(formatted, "#growth #marketing #creator");
});

// ==============================================================================
// 4. Record Action Error Handling & Success Execution
// ==============================================================================
test("Record Actions: executeRecordAction handles success and sets submitted state", async () => {
  let isSubmitted = false;
  let closed = false;
  let errorSet = null;

  const successAction = async () => ({ id: "record-123" });

  const ok = await executeRecordAction(
    successAction,
    () => {
      isSubmitted = true;
      closed = true;
    },
    (err) => {
      errorSet = err;
    }
  );

  assert.equal(ok, true, "executeRecordAction should return true on success");
  assert.equal(isSubmitted, true, "isSubmitted must be set to true only after success");
  assert.equal(closed, true, "onClose must be invoked only after success");
  assert.equal(errorSet, null, "No error should be recorded on success");
});

test("Record Actions: executeRecordAction safely catches errors, prevents unhandled rejection, and keeps editor open", async () => {
  let isSubmitted = false;
  let closed = false;
  let receivedError = null;

  const failingAction = async () => {
    throw new Error("delete_failed");
  };

  const ok = await executeRecordAction(
    failingAction,
    () => {
      isSubmitted = true;
      closed = true;
    },
    (err) => {
      receivedError = err;
    }
  );

  assert.equal(ok, false, "executeRecordAction should return false on rejection");
  assert.equal(isSubmitted, false, "isSubmitted must remain false when action fails");
  assert.equal(closed, false, "Editor must remain open (onClose not called) when action fails");
  assert.equal(receivedError, "delete_failed", "Error code must be passed to onError for localized translation");
});

// ==============================================================================
// 5. Modal Focus Lifecycle & Regression Protection
// ==============================================================================
test("Focus Lifecycle Controller: Initial focus on mount, opener restore on unmount", () => {
  let openerFocusCalls = 0;
  let titleFocusCalls = 0;

  const fakeOpener = { focus: () => { openerFocusCalls++; } };
  const fakeTitle = { focus: () => { titleFocusCalls++; } };

  const controller = new ModalFocusController();

  // 1. Mount modal
  controller.handleMount(fakeOpener, fakeTitle);
  assert.equal(titleFocusCalls, 1, "Initial field must receive focus on mount");
  assert.equal(openerFocusCalls, 0);

  // 2. Unmount modal
  controller.handleUnmount();
  assert.equal(openerFocusCalls, 1, "Opener must receive focus on unmount");
});

test("Regression Protection: Changing isDirty or typing characters does NOT re-trigger initial field focus", () => {
  let titleFocusCalls = 0;
  let captionFocusCalls = 0;

  const fakeOpener = { focus: () => {} };
  const fakeTitle = { focus: () => { titleFocusCalls++; } };
  const fakeCaption = { focus: () => { captionFocusCalls++; } };

  const controller = new ModalFocusController();

  // Mount
  controller.handleMount(fakeOpener, fakeTitle);
  assert.equal(titleFocusCalls, 1, "Initial focus on mount");

  // User focuses caption and types first character (causing isDirty: false -> true)
  fakeCaption.focus();
  assert.equal(captionFocusCalls, 1);

  // Under the old bug, changing isDirty re-ran the mount effect, calling fakeTitle.focus()!
  controller.handleDirtyStateChange();
  assert.equal(
    titleFocusCalls,
    1,
    "Mutating dirty state must NOT re-trigger initial field focus (must stay at 1)"
  );
  assert.equal(controller.getInitialFocusCount(), 1);
});

test("Focus Lifecycle: Discard dialog saves initiating control, cancel restores to it, confirm restores to opener", () => {
  let openerFocusCalls = 0;
  let closeBtnFocusCalls = 0;
  let cancelBtnFocusCalls = 0;

  const fakeOpener = { focus: () => { openerFocusCalls++; } };
  const fakeCloseBtn = { focus: () => { closeBtnFocusCalls++; } };
  const fakeCancelBtn = { focus: () => { cancelBtnFocusCalls++; } };

  const controller = new ModalFocusController();
  controller.handleMount(fakeOpener, null);

  // User attempts to close by clicking close button
  controller.handleRequestDiscard(fakeCloseBtn);
  assert.equal(controller.getInitiatingControl(), fakeCloseBtn);

  // Discard dialog is opened (Cancel button focused)
  fakeCancelBtn.focus();
  assert.equal(cancelBtnFocusCalls, 1);

  // User cancels discard: focus must return to the initiating control (fakeCloseBtn)
  controller.handleCancelDiscard(null);
  assert.equal(closeBtnFocusCalls, 1, "Cancelling discard must restore focus to initiating control");

  // Now user confirms discard and modal unmounts
  controller.handleConfirmDiscard();
  controller.handleUnmount();
  assert.equal(openerFocusCalls, 1, "Confirming discard and unmounting restores focus to opener element");
});

// ==============================================================================
// 6. Clipboard Utility Resilience
// ==============================================================================
test("Clipboard Utility: Handles success, missing API, empty strings, and rejection gracefully", async () => {
  // 1. Rejection on empty or invalid text
  assert.equal(await copyToClipboard(""), false);
  assert.equal(await copyToClipboard("   "), false);
  assert.equal(await copyToClipboard(null), false);
  assert.equal(await copyToClipboard(undefined), false);

  // 2. Mocking successful navigator.clipboard
  const originalClipboard = globalThis.navigator?.clipboard;
  let copiedText = "";

  Object.defineProperty(globalThis.navigator, "clipboard", {
    value: {
      writeText: async (t) => {
        copiedText = t;
        return Promise.resolve();
      },
    },
    configurable: true,
  });

  const success = await copyToClipboard("Hello Content Planner");
  assert.equal(success, true, "copyToClipboard must return true on successful write");
  assert.equal(copiedText, "Hello Content Planner");

  // 3. Mocking rejected navigator.clipboard (e.g. permissions rejected or insecure context)
  Object.defineProperty(globalThis.navigator, "clipboard", {
    value: {
      writeText: async () => {
        throw new Error("Clipboard permission denied");
      },
    },
    configurable: true,
  });

  const failure = await copyToClipboard("Should fail");
  assert.equal(failure, false, "copyToClipboard must catch rejection and return false without throwing");

  // Restore navigator clipboard
  Object.defineProperty(globalThis.navigator, "clipboard", {
    value: originalClipboard,
    configurable: true,
  });
});

// ==============================================================================
// 7. Dirty-State Comparison (Including Link Order)
// ==============================================================================
test("Dirty State Helpers: arePlatformsEqual and areLinksEqual check equality and ordering", () => {
  assert.equal(arePlatformsEqual(["tiktok", "instagram"], ["instagram", "tiktok"]), true);
  assert.equal(arePlatformsEqual(["tiktok"], ["tiktok", "youtube"]), false);

  const l1 = [{ link_type: "asset", platform: null, url: "https://a.com", label: "A" }];
  const l2 = [{ link_type: "asset", platform: null, url: "https://a.com", label: "A" }];
  const l3 = [{ link_type: "asset", platform: null, url: "https://a.com", label: "B" }];

  assert.equal(areLinksEqual(l1, l2), true);
  assert.equal(areLinksEqual(l1, l3), false);
  assert.equal(areLinksEqual(null, undefined), true);
});

test("Dirty State: Untouched new form is clean (not dirty)", () => {
  const newFormState = {
    title: "",
    platforms: ["tiktok"],
    pillarId: "",
    format: "",
    goal: "",
    status: "idea",
    progress: 0,
    publishDate: "",
    publishTime: "10:00",
    publishTimeKnown: false,
    hook: "",
    objective: "",
    productionDetail: "",
    cta: "",
    caption: "",
    hashtagsStr: "",
    reviewStatus: "",
    notes: "",
    links: [],
  };

  assert.equal(
    isFormDirty(newFormState, { ...newFormState }),
    false,
    "Untouched form must evaluate to false (clean)"
  );

  // Changing title makes form dirty
  assert.equal(
    isFormDirty(newFormState, { ...newFormState, title: "Draft Post" }),
    true,
    "Modifying title makes form dirty"
  );

  // Reverting title makes form clean again
  assert.equal(
    isFormDirty(newFormState, { ...newFormState, title: "" }),
    false,
    "Reverting modified title restores clean status"
  );
});

test("Dirty State: Link order changes cause form to become dirty", () => {
  const baseState = {
    title: "Post with links",
    platforms: ["tiktok"],
    pillarId: "",
    format: "",
    goal: "",
    status: "idea",
    progress: 0,
    publishDate: "",
    publishTime: "10:00",
    publishTimeKnown: false,
    hook: "",
    objective: "",
    productionDetail: "",
    cta: "",
    caption: "",
    hashtagsStr: "",
    reviewStatus: "",
    notes: "",
    links: [
      { id: "1", link_type: "idea_source", platform: null, url: "https://a.com", label: "A", sort_order: 0 },
      { id: "2", link_type: "asset", platform: null, url: "https://b.com", label: "B", sort_order: 1 },
    ],
  };

  // Swapping the links order
  const reorderedState = {
    ...baseState,
    links: [
      { id: "2", link_type: "asset", platform: null, url: "https://b.com", label: "B", sort_order: 0 },
      { id: "1", link_type: "idea_source", platform: null, url: "https://a.com", label: "A", sort_order: 1 },
    ],
  };

  assert.equal(
    isFormDirty(baseState, reorderedState),
    true,
    "Swapping link order must make the form dirty"
  );

  // Restoring original order
  assert.equal(
    isFormDirty(baseState, {
      ...baseState,
      links: [
        { id: "1", link_type: "idea_source", platform: null, url: "https://a.com", label: "A", sort_order: 0 },
        { id: "2", link_type: "asset", platform: null, url: "https://b.com", label: "B", sort_order: 1 },
      ],
    }),
    false,
    "Reverting links to original values and order must return not dirty"
  );
});

// ==============================================================================
// 8. Thai and English Translation Key Parity for Milestone 4
// ==============================================================================
test("Localization Parity: All Milestone 4 keys exist in both en.json and th.json", () => {
  const en = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/messages/en.json"), "utf8"));
  const th = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/messages/th.json"), "utf8"));

  const requiredMilestone4Keys = [
    "copyCaption",
    "copyCta",
    "copyHashtags",
    "copyLink",
    "copied",
    "copyFailed",
    "copyAnnouncement",
    "openLink",
    "moveUp",
    "moveDown",
    "noLinks",
    "linkCard",
    "linkDomain",
    "previewTitle",
    "previewSubtitle",
    "previewHookLabel",
    "previewCaptionLabel",
    "previewCtaLabel",
    "previewHashtagsLabel",
    "emptyHook",
    "emptyCaption",
    "emptyCta",
    "emptyHashtags",
    "discardTitle",
    "discardMessage",
    "discardConfirm",
    "keepEditing",
  ];

  for (const key of requiredMilestone4Keys) {
    assert.ok(
      en.recordModal && typeof en.recordModal[key] === "string" && en.recordModal[key].length > 0,
      `Missing or empty EN translation for key: recordModal.${key}`
    );
    assert.ok(
      th.recordModal && typeof th.recordModal[key] === "string" && th.recordModal[key].length > 0,
      `Missing or empty TH translation for key: recordModal.${key}`
    );
    assert.notEqual(
      en.recordModal[key],
      th.recordModal[key],
      `Expected distinct EN and TH translations for key: recordModal.${key}`
    );
  }
});

// ==============================================================================
// 9. Static Component Markup & ARIA Contract Assertions
// ==============================================================================
test("Static Markup & ARIA Contracts: Declarations exist for accessibility and security", () => {
  const linkCardContent = fs.readFileSync(path.join(projectRoot, "src/components/planner/LinkCard.tsx"), "utf8");
  const textPreviewContent = fs.readFileSync(path.join(projectRoot, "src/components/planner/TextPreview.tsx"), "utf8");
  const discardDialogContent = fs.readFileSync(path.join(projectRoot, "src/components/planner/DiscardConfirmDialog.tsx"), "utf8");
  const recordModalContent = fs.readFileSync(path.join(projectRoot, "src/components/planner/RecordModal.tsx"), "utf8");

  // 1. External links have target="_blank" and rel="noopener noreferrer"
  assert.ok(
    linkCardContent.includes('target="_blank"') && linkCardContent.includes('rel="noopener noreferrer"'),
    "LinkCard external links must declare target='_blank' and rel='noopener noreferrer'"
  );

  // 2. DiscardConfirmDialog has role="alertdialog" and aria-modal="true"
  assert.ok(
    discardDialogContent.includes('role="alertdialog"'),
    "DiscardConfirmDialog must declare role='alertdialog'"
  );
  assert.ok(
    discardDialogContent.includes('aria-modal="true"'),
    "DiscardConfirmDialog must declare aria-modal='true'"
  );
  assert.ok(
    discardDialogContent.includes('aria-labelledby="discard-dialog-title"'),
    "DiscardConfirmDialog must declare aria-labelledby"
  );
  assert.ok(
    discardDialogContent.includes('aria-describedby="discard-dialog-desc"'),
    "DiscardConfirmDialog must declare aria-describedby"
  );

  // 3. RecordModal has live region for copy announcements
  assert.ok(
    recordModalContent.includes('aria-live="polite"'),
    "RecordModal must declare an aria-live='polite' region for accessible copy announcements"
  );

  // 4. RecordModal has dialog role and aria-modal="true"
  assert.ok(
    recordModalContent.includes('role="dialog"'),
    "RecordModal must declare role='dialog'"
  );
  assert.ok(
    recordModalContent.includes('aria-modal="true"'),
    "RecordModal must declare aria-modal='true'"
  );

  // 5. TextPreview has test id and structured preview sections
  assert.ok(
    textPreviewContent.includes('data-testid="text-post-preview"'),
    "TextPreview must declare data-testid='text-post-preview'"
  );
  assert.ok(
    textPreviewContent.includes("whitespace-pre-wrap"),
    "TextPreview must declare whitespace-pre-wrap to preserve caption line breaks"
  );
});
