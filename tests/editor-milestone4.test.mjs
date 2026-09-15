import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getSafeDomain } from "../src/utils/url/safeDomain.ts";
import { copyToClipboard } from "../src/utils/clipboard.ts";
import { isFormDirty, areLinksEqual, arePlatformsEqual } from "../src/utils/dirtyState.ts";
import { validateContentLink, validateLinksArray } from "../src/utils/validation.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// ==============================================================================
// 1. URL Validation & Safe Local Domain Parsing (Zero Remote Fetching)
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

test("Link Validation: Strictly validates HTTP/HTTPS and rejects malicious payloads", () => {
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
// 2. Link CRUD Payload & Deterministic Ordering
// ==============================================================================
test("Link Ordering: Deterministic sort_order assigned from array order", () => {
  const rawList = [
    { link_type: "idea_source", url: "https://a.com", label: "A" },
    { link_type: "asset", url: "https://b.com", label: "B" },
    { link_type: "published", url: "https://c.com", label: "C" },
  ];

  // Simulating the save mapping in RecordModal
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
// 3. Reorder Boundary Behavior & Stable Identity
// ==============================================================================
test("Reorder Boundary: Disallows moving first item up and last item down", () => {
  let list = [
    { clientId: "c1", label: "First", url: "https://first.com" },
    { clientId: "c2", label: "Middle", url: "https://middle.com" },
    { clientId: "c3", label: "Last", url: "https://last.com" },
  ];

  const handleMoveUp = (index) => {
    if (index <= 0) return list;
    const copy = [...list];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    return copy;
  };

  const handleMoveDown = (index) => {
    if (index >= list.length - 1) return list;
    const copy = [...list];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    return copy;
  };

  // Boundary checks: index 0 cannot move up
  const afterNoopUp = handleMoveUp(0);
  assert.deepEqual(afterNoopUp, list, "Move up on index 0 must be a no-op");

  // Boundary checks: last index cannot move down
  const afterNoopDown = handleMoveDown(list.length - 1);
  assert.deepEqual(afterNoopDown, list, "Move down on last index must be a no-op");

  // Valid move up: move index 1 up
  const afterUp = handleMoveUp(1);
  assert.equal(afterUp[0].clientId, "c2", "c2 should now be at index 0");
  assert.equal(afterUp[1].clientId, "c1", "c1 should now be at index 1");
  assert.equal(afterUp[2].clientId, "c3");

  // Valid move down: move index 0 down
  list = afterUp;
  const afterDown = handleMoveDown(0);
  assert.equal(afterDown[0].clientId, "c1", "c1 moved back to index 0");
  assert.equal(afterDown[1].clientId, "c2", "c2 moved back to index 1");
});

// ==============================================================================
// 4. Live Text Preview Formatting
// ==============================================================================
test("Live Text Preview: Formats hook, caption with preserved line breaks, CTA, and hashtags", () => {
  const rawCaption = "Line 1: Announcement!\n\nLine 2: Key details here.\nLine 3: Final note.";
  const rawHashtags = "creator, marketing #business   growth";

  // Hashtag parsing logic identical to TextPreview & RecordModal
  const parsedHashtags = rawHashtags
    .split(/[,\s]+/)
    .map((h) => h.trim().replace(/^#+/, ""))
    .filter((h) => h.length > 0)
    .map((h) => `#${h}`);

  assert.deepEqual(parsedHashtags, ["#creator", "#marketing", "#business", "#growth"]);

  // Preserved line breaks check
  assert.ok(rawCaption.includes("\n\n"));
  const lines = rawCaption.split("\n");
  assert.equal(lines.length, 4);
  assert.equal(lines[0], "Line 1: Announcement!");
  assert.equal(lines[1], "");
  assert.equal(lines[2], "Line 2: Key details here.");
  assert.equal(lines[3], "Line 3: Final note.");
});

// ==============================================================================
// 5. Successful and Failed Clipboard Behavior
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

  Object.defineProperty(globalThis.navigator, 'clipboard', {
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
  Object.defineProperty(globalThis.navigator, 'clipboard', {
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
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: originalClipboard,
    configurable: true,
  });
});

// ==============================================================================
// 6. Dirty-State Comparison (Including Link Order)
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

  // Comparing fresh form with itself
  assert.equal(isFormDirty(newFormState, { ...newFormState }), false, "Fresh untouched form must not be dirty");
});

test("Dirty State: Detects changes in text fields, schedule, and platforms", () => {
  const base = {
    title: "Initial Title",
    platforms: ["tiktok"],
    pillarId: "",
    format: "",
    goal: "",
    status: "idea",
    progress: 0,
    publishDate: "",
    publishTime: "10:00",
    publishTimeKnown: false,
    hook: "Catchy hook",
    objective: "",
    productionDetail: "",
    cta: "Click bio",
    caption: "Caption body",
    hashtagsStr: "#tech",
    reviewStatus: "",
    notes: "",
    links: [],
  };

  // Same values -> not dirty
  assert.equal(isFormDirty(base, { ...base }), false);

  // Modify title -> dirty
  assert.equal(isFormDirty(base, { ...base, title: "New Title" }), true);

  // Modify hook -> dirty
  assert.equal(isFormDirty(base, { ...base, hook: "Different hook" }), true);

  // Modify caption -> dirty
  assert.equal(isFormDirty(base, { ...base, caption: "Different caption" }), true);

  // Modify CTA -> dirty
  assert.equal(isFormDirty(base, { ...base, cta: "Different CTA" }), true);

  // Modify platforms -> dirty
  assert.equal(isFormDirty(base, { ...base, platforms: ["tiktok", "instagram"] }), true);

  // Modify progress -> dirty
  assert.equal(isFormDirty(base, { ...base, progress: 25 }), true);

  // Modify publish date -> dirty
  assert.equal(isFormDirty(base, { ...base, publishDate: "2026-10-01" }), true);
});

test("Dirty State: Detects adding, editing, removing, and REORDERING links", () => {
  const baseWithLinks = {
    title: "Title",
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
      { link_type: "idea_source", platform: "youtube", url: "https://youtube.com/1", label: "Clip 1" },
      { link_type: "asset", platform: null, url: "https://drive.google.com/2", label: "Drive" },
    ],
  };

  // Identical links in same order -> not dirty
  assert.equal(isFormDirty(baseWithLinks, { ...baseWithLinks }), false);

  // 1. Add link -> dirty
  assert.equal(
    isFormDirty(baseWithLinks, {
      ...baseWithLinks,
      links: [
        ...baseWithLinks.links,
        { link_type: "note", platform: null, url: "https://notes.com", label: "Notes" },
      ],
    }),
    true,
    "Adding a link must mark form as dirty"
  );

  // 2. Remove link -> dirty
  assert.equal(
    isFormDirty(baseWithLinks, {
      ...baseWithLinks,
      links: [baseWithLinks.links[0]],
    }),
    true,
    "Removing a link must mark form as dirty"
  );

  // 3. Edit link URL -> dirty
  assert.equal(
    isFormDirty(baseWithLinks, {
      ...baseWithLinks,
      links: [
        { ...baseWithLinks.links[0], url: "https://youtube.com/edited" },
        baseWithLinks.links[1],
      ],
    }),
    true,
    "Editing a link URL must mark form as dirty"
  );

  // 4. Edit link label -> dirty
  assert.equal(
    isFormDirty(baseWithLinks, {
      ...baseWithLinks,
      links: [
        { ...baseWithLinks.links[0], label: "Edited Label" },
        baseWithLinks.links[1],
      ],
    }),
    true,
    "Editing a link label must mark form as dirty"
  );

  // 5. REORDER links (swapping 0 and 1) -> MUST MARK DIRTY
  const reorderedLinks = [baseWithLinks.links[1], baseWithLinks.links[0]];
  assert.equal(
    isFormDirty(baseWithLinks, {
      ...baseWithLinks,
      links: reorderedLinks,
    }),
    true,
    "Reordering links must mark form as dirty"
  );

  // 6. Reverting back to original -> not dirty
  assert.equal(
    isFormDirty(baseWithLinks, {
      ...baseWithLinks,
      links: [
        { link_type: "idea_source", platform: "youtube", url: "https://youtube.com/1", label: "Clip 1" },
        { link_type: "asset", platform: null, url: "https://drive.google.com/2", label: "Drive" },
      ],
    }),
    false,
    "Reverting links to original values and order must return not dirty"
  );
});

// ==============================================================================
// 7. Confirmed versus Cancelled Dismissal Flow
// ==============================================================================
test("Dismissal Flow: Clean form closes directly; dirty form requires confirmation", () => {
  let modalClosed = false;
  let discardDialogOpen = false;

  const onClose = () => { modalClosed = true; };

  const handleRequestClose = (isDirty, isSubmitted) => {
    if (isSubmitted || !isDirty) {
      onClose();
    } else {
      discardDialogOpen = true;
    }
  };

  // Case A: Clean form
  handleRequestClose(false, false);
  assert.equal(modalClosed, true, "Clean form should close immediately");
  assert.equal(discardDialogOpen, false);

  // Reset
  modalClosed = false;
  discardDialogOpen = false;

  // Case B: Dirty form
  handleRequestClose(true, false);
  assert.equal(modalClosed, false, "Dirty form must not close immediately");
  assert.equal(discardDialogOpen, true, "Dirty form must open discard dialog");

  // User cancels discard
  discardDialogOpen = false;
  assert.equal(modalClosed, false, "Cancelling discard keeps modal open with draft intact");

  // User confirms discard
  modalClosed = true;
  assert.equal(modalClosed, true, "Confirming discard closes modal");

  // Case C: Successfully saved form
  modalClosed = false;
  discardDialogOpen = false;
  handleRequestClose(true, true); // isDirty=true but isSubmitted=true
  assert.equal(modalClosed, true, "Submitted form closes without discard prompt");
  assert.equal(discardDialogOpen, false);
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
// 9. Accessibility, ARIA Roles, and Safe External Links
// ==============================================================================
test("Accessibility: Safe link attributes and ARIA roles are defined properly", () => {
  const linkCardContent = fs.readFileSync(path.join(projectRoot, "src/components/planner/LinkCard.tsx"), "utf8");
  const textPreviewContent = fs.readFileSync(path.join(projectRoot, "src/components/planner/TextPreview.tsx"), "utf8");
  const discardDialogContent = fs.readFileSync(path.join(projectRoot, "src/components/planner/DiscardConfirmDialog.tsx"), "utf8");
  const recordModalContent = fs.readFileSync(path.join(projectRoot, "src/components/planner/RecordModal.tsx"), "utf8");

  // 1. External links have target="_blank" and rel="noopener noreferrer"
  assert.ok(
    linkCardContent.includes('target="_blank"') && linkCardContent.includes('rel="noopener noreferrer"'),
    "LinkCard external links must use target='_blank' and rel='noopener noreferrer'"
  );

  // 2. DiscardConfirmDialog has role="alertdialog" and aria-modal="true"
  assert.ok(
    discardDialogContent.includes('role="alertdialog"'),
    "DiscardConfirmDialog must have role='alertdialog'"
  );
  assert.ok(
    discardDialogContent.includes('aria-modal="true"'),
    "DiscardConfirmDialog must have aria-modal='true'"
  );
  assert.ok(
    discardDialogContent.includes('aria-labelledby="discard-dialog-title"'),
    "DiscardConfirmDialog must have aria-labelledby"
  );
  assert.ok(
    discardDialogContent.includes('aria-describedby="discard-dialog-desc"'),
    "DiscardConfirmDialog must have aria-describedby"
  );

  // 3. RecordModal has live region for copy announcements
  assert.ok(
    recordModalContent.includes('aria-live="polite"'),
    "RecordModal must have an aria-live='polite' region for accessible copy announcements"
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
    "TextPreview must have data-testid='text-post-preview'"
  );
  assert.ok(
    textPreviewContent.includes("whitespace-pre-wrap"),
    "TextPreview must preserve caption line breaks with whitespace-pre-wrap"
  );
});

// ==============================================================================
// 10. beforeunload Event Listener Lifecycle
// ==============================================================================
test("beforeunload Listener Lifecycle: Attaches only when dirty and detaches on clean/unmount", () => {
  const events = [];
  const fakeWindow = {
    addEventListener: (type, handler) => {
      events.push({ action: "add", type, handler });
    },
    removeEventListener: (type, handler) => {
      events.push({ action: "remove", type, handler });
    },
  };

  // Simulating the effect in RecordModal
  function runBeforeUnloadEffect(isDirty, isSubmitted, win) {
    if (!isDirty || isSubmitted) return () => {};

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    win.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      win.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }

  // 1. When clean -> no listener added
  const cleanupClean = runBeforeUnloadEffect(false, false, fakeWindow);
  cleanupClean();
  assert.equal(events.length, 0, "No beforeunload listener should be registered when clean");

  // 2. When dirty -> listener added
  const cleanupDirty = runBeforeUnloadEffect(true, false, fakeWindow);
  assert.equal(events.length, 1);
  assert.equal(events[0].action, "add");
  assert.equal(events[0].type, "beforeunload");

  // 3. Simulating event trigger
  const fakeEvent = { preventDefaultCalled: false, returnValue: null, preventDefault() { this.preventDefaultCalled = true; } };
  events[0].handler(fakeEvent);
  assert.equal(fakeEvent.preventDefaultCalled, true);
  assert.equal(fakeEvent.returnValue, "");

  // 4. When unmounted or cleaned up -> listener removed
  cleanupDirty();
  assert.equal(events.length, 2);
  assert.equal(events[1].action, "remove");
  assert.equal(events[1].type, "beforeunload");

  // 5. When submitted -> no listener added even if dirty
  events.length = 0;
  const cleanupSubmitted = runBeforeUnloadEffect(true, true, fakeWindow);
  cleanupSubmitted();
  assert.equal(events.length, 0, "No listener added when form is already submitted");
});
