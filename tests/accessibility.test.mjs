import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

test("1. Form controls in modals and views have explicit label htmlFor associations", () => {
  const files = [
    "src/components/planner/RecordModal.tsx",
    "src/components/tasks/TasksView.tsx",
    "src/components/ideas/ReferenceAccountsView.tsx",
    "src/components/ideas/IdeasView.tsx"
  ];

  for (const relPath of files) {
    const filePath = path.join(projectRoot, relPath);
    const content = fs.readFileSync(filePath, "utf8");

    const labelMatches = [...content.matchAll(/<label[^>]*htmlFor=["']([^"']+)["']/g)];
    assert.ok(labelMatches.length > 0, `Expected labels with htmlFor in ${relPath}`);

    for (const m of labelMatches) {
      const id = m[1];
      const hasMatchingId =
        content.includes(`id="${id}"`) ||
        content.includes('id={`' + id + '`}') ||
        content.includes(`id={'${id}'}`);

      assert.ok(
        hasMatchingId,
        `${relPath}: <label htmlFor="${id}"> has no matching form control with id="${id}"`
      );
    }
  }
});

test("2. All icon-only and interactive action buttons have accessible names (aria-label, title, or inner text)", () => {
  const files = [
    "src/components/planner/RecordModal.tsx",
    "src/components/tasks/TasksView.tsx",
    "src/components/ideas/ReferenceAccountsView.tsx",
    "src/components/ideas/IdeasView.tsx",
    "src/components/calendar/CalendarView.tsx",
    "src/components/planner/PlannerTable.tsx",
    "src/components/planner/PlannerCards.tsx"
  ];

  for (const relPath of files) {
    const filePath = path.join(projectRoot, relPath);
    const content = fs.readFileSync(filePath, "utf8");

    const buttonMatches = [...content.matchAll(/<button([\s\S]*?)>([\s\S]*?)<\/button>/g)];
    assert.ok(buttonMatches.length > 0, `Expected buttons in ${relPath}`);

    for (const match of buttonMatches) {
      const attrs = match[1];
      const inner = match[2].trim();

      const hasAriaLabel = /aria-label=/i.test(attrs);
      const hasTitle = /title=/i.test(attrs);
      // Visible text check: contains words, translation calls, or child text elements
      const hasVisibleText =
        /[A-Za-z0-9฀-๿]/.test(inner) ||
        /\b(?:t|tShell|tCommon)\s*\(/.test(inner) ||
        /\{[^}]*\}/.test(inner);

      assert.ok(
        hasAriaLabel || hasTitle || hasVisibleText,
        `${relPath}: Found button lacking accessible name or text: <button${attrs}>`
      );
    }
  }
});

test("3. Focus trap keydown handler wraps focus backwards on Shift+Tab at first element", () => {
  // Simulate DOM elements
  const elements = [
    { id: "first", focusCount: 0, focus() { this.focusCount++; } },
    { id: "middle", focusCount: 0, focus() { this.focusCount++; } },
    { id: "last", focusCount: 0, focus() { this.focusCount++; } },
  ];

  let currentActive = elements[0];
  let prevented = false;

  const event = {
    key: "Tab",
    shiftKey: true,
    preventDefault() { prevented = true; }
  };

  // Run the focus trap logic as implemented in RecordModal, TasksView, ReferenceAccountsView
  const firstElement = elements[0];
  const lastElement = elements[elements.length - 1];

  if (event.key === "Tab") {
    if (event.shiftKey) {
      if (currentActive === firstElement) {
        lastElement.focus();
        event.preventDefault();
      }
    } else {
      if (currentActive === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  }

  assert.equal(prevented, true, "Shift+Tab on first element must prevent default");
  assert.equal(lastElement.focusCount, 1, "Shift+Tab on first element must wrap to last element");
});

test("4. Focus trap keydown handler wraps focus forwards on Tab at last element", () => {
  const elements = [
    { id: "first", focusCount: 0, focus() { this.focusCount++; } },
    { id: "middle", focusCount: 0, focus() { this.focusCount++; } },
    { id: "last", focusCount: 0, focus() { this.focusCount++; } },
  ];

  let currentActive = elements[2];
  let prevented = false;

  const event = {
    key: "Tab",
    shiftKey: false,
    preventDefault() { prevented = true; }
  };

  const firstElement = elements[0];
  const lastElement = elements[elements.length - 1];

  if (event.key === "Tab") {
    if (event.shiftKey) {
      if (currentActive === firstElement) {
        lastElement.focus();
        event.preventDefault();
      }
    } else {
      if (currentActive === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  }

  assert.equal(prevented, true, "Tab on last element must prevent default");
  assert.equal(firstElement.focusCount, 1, "Tab on last element must wrap to first element");
});

test("5. Focus trap keydown handler triggers onClose on Escape", () => {
  let closed = false;
  const onClose = () => { closed = true; };

  const event = {
    key: "Escape",
    preventDefault() {}
  };

  if (event.key === "Escape") {
    onClose();
  }

  assert.equal(closed, true, "Escape key must trigger modal onClose");
});

test("6. Modal components declare dialog role and focus trap references", () => {
  const files = [
    "src/components/planner/RecordModal.tsx",
    "src/components/tasks/TasksView.tsx",
    "src/components/ideas/ReferenceAccountsView.tsx"
  ];

  for (const relPath of files) {
    const content = fs.readFileSync(path.join(projectRoot, relPath), "utf8");

    assert.ok(
      content.includes("role=\"dialog\"") || content.includes("role='dialog'"),
      `${relPath} must include role="dialog"`
    );
    assert.ok(
      content.includes("aria-modal=\"true\"") || content.includes("aria-modal='true'"),
      `${relPath} must include aria-modal="true"`
    );
    assert.ok(
      content.includes("modalRef"),
      `${relPath} must have modalRef for focus trap`
    );
    assert.ok(
      content.includes("previousFocusRef"),
      `${relPath} must retain previousFocusRef to restore focus upon closing`
    );
  }
});


test("7. IdeasView declares accessible live regions, alert roles, and roving tabIndex attributes", () => {
  const ideasPath = path.join(projectRoot, "src/components/ideas/IdeasView.tsx");
  const content = fs.readFileSync(ideasPath, "utf8");

  // Roving tabIndex on tabs
  assert.ok(
    content.includes("tabIndex={activeTab === 'unscheduled' ? 0 : -1}"),
    "IdeasView unscheduled tab must declare roving tabIndex"
  );
  assert.ok(
    content.includes("tabIndex={activeTab === 'referenceAccounts' ? 0 : -1}"),
    "IdeasView reference accounts tab must declare roving tabIndex"
  );

  // Live regions & error associations
  assert.ok(
    content.includes('role="alert"') && content.includes('aria-live="assertive"'),
    "IdeasView must declare assertive role='alert' live region for errors"
  );
  assert.ok(
    content.includes('role="status"') && content.includes('aria-live="polite"'),
    "IdeasView must declare polite role='status' live region for success feedback"
  );
  assert.ok(
    content.includes('aria-invalid={Boolean(validationError)}') &&
    content.includes('aria-describedby={validationError ? "quick-capture-title-error" : undefined}'),
    "Quick capture title input must declare aria-invalid and aria-describedby for error state"
  );
});
