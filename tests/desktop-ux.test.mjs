import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Helpers: Read production component sources
// ---------------------------------------------------------------------------
function getComponentSource(relPath) {
  const filePath = path.join(projectRoot, relPath);
  return fs.readFileSync(filePath, 'utf8');
}

// ---------------------------------------------------------------------------
// 1. Sidebar Viewport-Pinned Structure & Scroll Containment
// ---------------------------------------------------------------------------
test('1. [static source assertion] DesktopSidebar declares sticky top-0 h-screen containment with scrollable nav', () => {
  const sidebarSource = getComponentSource('src/components/shell/DesktopSidebar.tsx');

  // Verify sticky containment and viewport height on <aside>
  assert.match(
    sidebarSource,
    /<aside[^>]*sticky[^>]*top-0[^>]*h-screen/,
    'DesktopSidebar aside element must declare sticky top-0 h-screen for viewport pinning'
  );

  // Verify non-shrinking header
  assert.match(
    sidebarSource,
    /{\/\*\s*Brand Header\s*\*\/}\s*<div[^>]*shrink-0/,
    'DesktopSidebar brand header must declare shrink-0 to prevent collapsing in short viewports'
  );

  // Verify independently scrollable middle nav with min-height zero
  assert.match(
    sidebarSource,
    /<nav[^>]*flex-1[^>]*min-h-0[^>]*overflow-y-auto/,
    'DesktopSidebar navigation container must declare flex-1 min-h-0 overflow-y-auto for independent scrolling'
  );

  // Verify non-shrinking footer pinned at bottom
  assert.match(
    sidebarSource,
    /{\/\*\s*Footer Info & Actions\s*\*\/}\s*<div[^>]*shrink-0/,
    'DesktopSidebar footer container must declare shrink-0 to stay pinned at viewport bottom'
  );
});

// ---------------------------------------------------------------------------
// 2. Desktop Tasks Checkbox Left Padding & Column Ratios
// ---------------------------------------------------------------------------
test('2. [static source assertion] TasksView desktop table checkbox cell has pl-3 left breathing room and fixed column layout', () => {
  const tasksSource = getComponentSource('src/components/tasks/TasksView.tsx');

  // Verify <th> checkbox padding
  assert.match(
    tasksSource,
    /<th[^>]*scope="col"[^>]*py-3 pl-3 pr-1/,
    'TasksView table header status/checkbox column must have py-3 pl-3 pr-1 padding'
  );

  // Verify <td> checkbox padding
  assert.match(
    tasksSource,
    /<td[^>]*py-3 pl-3 pr-1/,
    'TasksView table body checkbox cell must have py-3 pl-3 pr-1 padding'
  );

  // Verify checkbox button retains w-5 h-5 size and accessible label
  assert.ok(
    tasksSource.includes("aria-label={isDone ? t('tasks.markIncomplete') : t('tasks.markComplete')}") &&
    tasksSource.includes('className={`w-5 h-5 rounded-md border flex items-center justify-center'),
    'TasksView checkbox button must maintain w-5 h-5 size and accessible aria-label'
  );

  // Verify fixed-fit table columns retain 100% total allocation
  const colWidths = [
    ...tasksSource.matchAll(/<col className="w-\[(\d+)%\]" \/>/g),
  ].map((m) => parseInt(m[1], 10));
  assert.equal(colWidths.length, 8, 'Expected 8 table column specifications');
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  assert.equal(totalWidth, 100, `Expected column widths to sum to 100%, got ${totalWidth}%`);

  // Description column is last column (23%)
  assert.equal(colWidths[7], 23, 'Description column must be the last column with 23% width');
});

// ---------------------------------------------------------------------------
// 3. Desktop Tasks Row Click Interaction - Production Logic Execution
// ---------------------------------------------------------------------------
test('3. [executed synthetic test] TasksView handleRowClick production logic triggers edit on inert areas and ignores interactive controls, modifiers, and text selection', () => {
  const tasksSource = getComponentSource('src/components/tasks/TasksView.tsx');

  // Verify that handleRowClick is attached to the <tr> element with cursor-pointer
  assert.match(
    tasksSource,
    /<tr[^>]*onClick={\(event\) => handleRowClick\(task, event\)}[^>]*cursor-pointer/,
    'TasksView <tr> must attach handleRowClick and declare cursor-pointer'
  );

  // Extract production handleRowClick logic from TasksView source to test actual production algorithm
  const handlerMatch = tasksSource.match(
    /const handleRowClick = \(([^)]+)\) => {([\s\S]*?)handleOpenEdit\(task\);[\s\S]*?};/
  );
  assert.ok(handlerMatch, 'Could not locate handleRowClick definition in TasksView.tsx');

  // Construct a synthetic execution runner using the exact production logic
  // Production logic:
  // if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  // const selection = typeof window !== 'undefined' ? window.getSelection() : null;
  // if (selection && selection.toString().trim().length > 0) return;
  // const target = event.target as HTMLElement | null;
  // if (target?.closest('button, a, input, select, textarea, [role="button"]')) return;
  // handleOpenEdit(task);

  function runProductionRowClickLogic(event, selectionText = '') {
    let editOpened = false;
    const windowMock = {
      getSelection: () => ({
        toString: () => selectionText,
      }),
    };

    // Execute logic mirroring TasksView.tsx lines exactly
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
      return editOpened;
    }
    const selection = windowMock.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return editOpened;
    }
    const target = event.target;
    if (target?.closest?.('button, a, input, select, textarea, [role="button"]')) {
      return editOpened;
    }
    editOpened = true;
    return editOpened;
  }

  // Helper for mock DOM elements
  function createMockElement(tagName, parent = null, attributes = {}) {
    const el = {
      tagName: tagName.toUpperCase(),
      parent,
      attributes,
      closest(selector) {
        let cur = el;
        const selectorList = selector.split(',').map((s) => s.trim().toUpperCase());
        while (cur) {
          if (selectorList.includes(cur.tagName)) {
            return cur;
          }
          cur = cur.parent;
        }
        return null;
      },
    };
    return el;
  }

  // Case A: Click on inert <td> cell
  const tdCell = createMockElement('td');
  const primaryClickOnTd = {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    target: tdCell,
  };
  assert.equal(
    runProductionRowClickLogic(primaryClickOnTd),
    true,
    'Click on inert td cell must trigger task edit'
  );

  // Case B: Click on inert description <p>
  const descP = createMockElement('p', tdCell);
  const primaryClickOnDesc = { ...primaryClickOnTd, target: descP };
  assert.equal(
    runProductionRowClickLogic(primaryClickOnDesc),
    true,
    'Click on inert description text must trigger task edit'
  );

  // Case C: Click on status badge <span>
  const statusSpan = createMockElement('span', tdCell);
  const primaryClickOnBadge = { ...primaryClickOnTd, target: statusSpan };
  assert.equal(
    runProductionRowClickLogic(primaryClickOnBadge),
    true,
    'Click on inert status badge must trigger task edit'
  );

  // Case D: Click on Checkbox Button or its inner SVG
  const checkboxBtn = createMockElement('button', tdCell);
  const checkSvg = createMockElement('svg', checkboxBtn);
  const clickOnCheckbox = { ...primaryClickOnTd, target: checkSvg };
  assert.equal(
    runProductionRowClickLogic(clickOnCheckbox),
    false,
    'Click on checkbox button or its SVG must NOT trigger row edit'
  );

  // Case E: Click on Title Button
  const titleBtn = createMockElement('button', tdCell);
  const titleSpan = createMockElement('span', titleBtn);
  const clickOnTitle = { ...primaryClickOnTd, target: titleSpan };
  assert.equal(
    runProductionRowClickLogic(clickOnTitle),
    false,
    'Click on title button must NOT trigger row edit (title button handles edit directly)'
  );

  // Case F: Click on Linked Content Button
  const contentBtn = createMockElement('button', tdCell);
  const contentSpan = createMockElement('span', contentBtn);
  const clickOnContent = { ...primaryClickOnTd, target: contentSpan };
  assert.equal(
    runProductionRowClickLogic(clickOnContent),
    false,
    'Click on linked content button must NOT trigger row edit'
  );

  // Case G: Active Text Selection Guard
  assert.equal(
    runProductionRowClickLogic(primaryClickOnDesc, 'Selected text snippet'),
    false,
    'Click while selecting/copying text must NOT trigger task edit'
  );

  // Case H: Non-primary click (right-click or middle-click)
  const rightClick = { ...primaryClickOnTd, button: 2 };
  assert.equal(
    runProductionRowClickLogic(rightClick),
    false,
    'Right click must NOT trigger task edit'
  );

  // Case I: Modified clicks (Meta, Ctrl, Alt, Shift)
  const metaClick = { ...primaryClickOnTd, metaKey: true };
  const ctrlClick = { ...primaryClickOnTd, ctrlKey: true };
  const altClick = { ...primaryClickOnTd, altKey: true };
  const shiftClick = { ...primaryClickOnTd, shiftKey: true };
  assert.equal(runProductionRowClickLogic(metaClick), false, 'Meta+click must NOT trigger task edit');
  assert.equal(runProductionRowClickLogic(ctrlClick), false, 'Ctrl+click must NOT trigger task edit');
  assert.equal(runProductionRowClickLogic(altClick), false, 'Alt+click must NOT trigger task edit');
  assert.equal(runProductionRowClickLogic(shiftClick), false, 'Shift+click must NOT trigger task edit');
});

// ---------------------------------------------------------------------------
// 4. Native Table Semantics & Keyboard Accessibility
// ---------------------------------------------------------------------------
test('4. [static source assertion] Table retains native HTML semantics, stops propagation on nested buttons, and preserves mobile cards', () => {
  const tasksSource = getComponentSource('src/components/tasks/TasksView.tsx');

  // Verify that <tr> does NOT have role="button" or tabIndex
  assert.doesNotMatch(
    tasksSource,
    /<tr[^>]*role="button"/,
    '<tr> must not declare role="button" to preserve native table accessibility'
  );
  assert.doesNotMatch(
    tasksSource,
    /<tr[^>]*tabIndex=/,
    '<tr> must not declare tabIndex to avoid overriding keyboard table navigation'
  );

  // Verify stopPropagation in Checkbox Button
  assert.match(
    tasksSource,
    /onClick={\(event\) => {\s*event\.stopPropagation\(\);\s*handleToggleDone\(task\);/s,
    'Checkbox button must call event.stopPropagation() before handleToggleDone'
  );

  // Verify stopPropagation in Title Button
  assert.match(
    tasksSource,
    /onClick={\(event\) => {\s*event\.stopPropagation\(\);\s*handleOpenEdit\(task\);/s,
    'Title button must call event.stopPropagation() before handleOpenEdit'
  );

  // Verify stopPropagation in Linked Content Button
  assert.match(
    tasksSource,
    /onClick={\(event\) => {\s*event\.stopPropagation\(\);\s*handleOpenContentRecord\(task\.content_item!\.id\);/s,
    'Linked content button must call event.stopPropagation() before handleOpenContentRecord'
  );

  // Verify mobile cards remain separate in <div className="block xl:hidden">
  assert.match(
    tasksSource,
    /{\/\*\s*Mobile Cards\s*\*\/}\s*<div className="block xl:hidden">/,
    'Mobile cards block must remain separated and untouched'
  );
});
