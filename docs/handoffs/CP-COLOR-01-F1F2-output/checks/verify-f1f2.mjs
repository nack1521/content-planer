/**
 * verify-f1f2.mjs
 * Bounded source and contrast verification script for CP-COLOR-01-F1F2.
 * Uses only Node.js built-in modules (fs, path, crypto).
 *
 * Scope: Source/contrast proof only; not mounted/browser testing.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✔ PASS: ${message}`);
    passed++;
  } else {
    console.error(`✖ FAIL: ${message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// WCAG 2.1 Relative Luminance Contrast Calculator
// ---------------------------------------------------------------------------
function getLuminance(hex) {
  const rgb = hex.replace('#', '').match(/.{2}/g).map((x) => parseInt(x, 16) / 255);
  const a = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function getContrast(h1, h2) {
  const l1 = getLuminance(h1);
  const l2 = getLuminance(h2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

console.log('--- CP-COLOR-01-F1F2 Source and Contrast Verification ---');

// ---------------------------------------------------------------------------
// 1. Verify F1: LoginForm utilities
// ---------------------------------------------------------------------------
const loginFormPath = 'src/components/auth/LoginForm.tsx';
const loginFormContent = fs.readFileSync(loginFormPath, 'utf8');

// Brand mark shadow-md restored
assert(
  loginFormContent.includes('shadow-md shadow-[#A13F5B]/30') &&
  !loginFormContent.includes('shadow-xs shadow-[#A13F5B]/30'),
  'F1.1 LoginForm brand mark restored shadow-md (not shadow-xs)'
);

// Card shadow-xl and backdrop-blur-md restored
assert(
  loginFormContent.includes('shadow-xl backdrop-blur-md') &&
  !loginFormContent.includes('shadow-sm space-y-6'),
  'F1.2 LoginForm main card restored shadow-xl and backdrop-blur-md (not shadow-sm)'
);

// ---------------------------------------------------------------------------
// 2. Verify F1: DesktopSidebar utilities
// ---------------------------------------------------------------------------
const sidebarPath = 'src/components/shell/DesktopSidebar.tsx';
const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

// Brand mark shadow-md restored
assert(
  sidebarContent.includes('shadow-md shadow-[#A13F5B]/30') &&
  !sidebarContent.includes('shadow-xs shadow-[#A13F5B]/30'),
  'F1.3 DesktopSidebar brand mark restored shadow-md (not shadow-xs)'
);

// Active navigation item font-semibold removed (retains inherited font-medium)
assert(
  sidebarContent.includes("? 'bg-[#F5E4E8] text-[#A13F5B] border border-[#E8CCD2]'") &&
  !sidebarContent.includes('border border-[#E8CCD2] font-semibold'),
  'F1.4 DesktopSidebar active item font-semibold removed, retaining inherited font-medium'
);

// ---------------------------------------------------------------------------
// 3. Verify F1: Settings Link bare border removed
// ---------------------------------------------------------------------------
const settingsPath = 'src/app/[locale]/settings/page.tsx';
const settingsContent = fs.readFileSync(settingsPath, 'utf8');

assert(
  settingsContent.includes('hover:bg-[#F5E4E8] border-[#E8CCD2] rounded-lg transition-colors cursor-pointer') &&
  !settingsContent.includes('hover:bg-[#F5E4E8] border border-[#E8CCD2] rounded-lg transition-colors cursor-pointer'),
  'F1.5 Settings back-to-Planner Link removed bare border width utility'
);

// ---------------------------------------------------------------------------
// 4. Verify F1: DiscardConfirmDialog button bare border removed
// ---------------------------------------------------------------------------
const dialogPath = 'src/components/planner/DiscardConfirmDialog.tsx';
const dialogContent = fs.readFileSync(dialogPath, 'utf8');

assert(
  dialogContent.includes('hover:bg-[#F5E4E8] border-[#E8CCD2] rounded-lg transition-colors cursor-pointer') &&
  !dialogContent.includes('hover:bg-[#F5E4E8] border border-[#E8CCD2] rounded-lg transition-colors cursor-pointer'),
  'F1.6 DiscardConfirmDialog keep-editing button removed bare border width utility'
);

// ---------------------------------------------------------------------------
// 5. Verify F2: LoginForm Email & Password Input Contrast and Styling
// ---------------------------------------------------------------------------
// Email input placeholder and resting border
assert(
  loginFormContent.includes('placeholder:text-[#746365]') &&
  !loginFormContent.includes('placeholder:text-[#9C8B8E]'),
  'F2.1 LoginForm email input uses placeholder:text-[#746365]'
);

assert(
  loginFormContent.includes('border-[#9C8B8E]') &&
  !loginFormContent.includes('border border-[#E8CCD2] text-[#2D2526]'),
  'F2.2 LoginForm inputs use resting border-[#9C8B8E]'
);

// Fill, text color, and focus styling preservation
assert(
  loginFormContent.includes('bg-white border border-[#9C8B8E] text-[#2D2526] placeholder:text-[#746365] text-base focus:outline-none focus:ring-2 focus:ring-[#A13F5B] focus:border-[#A13F5B]'),
  'F2.3 LoginForm email input preserves bg-white, text-[#2D2526], and rose focus ring/border'
);

assert(
  loginFormContent.includes('bg-white border border-[#9C8B8E] text-[#2D2526] text-base focus:outline-none focus:ring-2 focus:ring-[#A13F5B] focus:border-[#A13F5B]'),
  'F2.4 LoginForm password input preserves bg-white, text-[#2D2526], and rose focus ring/border'
);

// ---------------------------------------------------------------------------
// 6. Contrast Calculations on Actual Color Pairs
// ---------------------------------------------------------------------------
const placeholderContrast = getContrast('#746365', '#FFFFFF');
const restingBorderContrast = getContrast('#9C8B8E', '#FFFFFF');

console.log(`Measured email placeholder contrast (#746365 on #FFFFFF): ${placeholderContrast.toFixed(5)}:1`);
console.log(`Measured resting border contrast (#9C8B8E on #FFFFFF): ${restingBorderContrast.toFixed(5)}:1`);

assert(
  placeholderContrast >= 4.5,
  `F2.5 Email placeholder contrast (${placeholderContrast.toFixed(5)}:1) meets WCAG AA normal text threshold (>= 4.5:1)`
);

assert(
  restingBorderContrast >= 3.0,
  `F2.6 Resting input border contrast (${restingBorderContrast.toFixed(5)}:1) meets WCAG AA UI control boundary threshold (>= 3.0:1)`
);

// ---------------------------------------------------------------------------
// 7. Verify Differences Against .before Baseline Copies
// ---------------------------------------------------------------------------
const baselineDir = '/Users/nack/.hermes/workspaces/content-planer/CP-COLOR-01-F1F2/baseline/received-source';

const expectedDiffLines = {
  [loginFormPath]: [
    { line: 67, before: 'shadow-xs shadow-[#A13F5B]/30', current: 'shadow-md shadow-[#A13F5B]/30' },
    { line: 79, before: 'shadow-sm space-y-6', current: 'shadow-xl backdrop-blur-md space-y-6' },
    { line: 199, before: 'border border-[#E8CCD2] text-[#2D2526] placeholder:text-[#9C8B8E]', current: 'border border-[#9C8B8E] text-[#2D2526] placeholder:text-[#746365]' },
    { line: 215, before: 'border border-[#E8CCD2] text-[#2D2526]', current: 'border border-[#9C8B8E] text-[#2D2526]' },
  ],
  [sidebarPath]: [
    { line: 74, before: 'shadow-xs shadow-[#A13F5B]/30', current: 'shadow-md shadow-[#A13F5B]/30' },
    { line: 99, before: "border border-[#E8CCD2] font-semibold'", current: "border border-[#E8CCD2]'" },
  ],
  [settingsPath]: [
    { line: 203, before: 'border border-[#E8CCD2]', current: 'border-[#E8CCD2]' },
  ],
  [dialogPath]: [
    { line: 101, before: 'border border-[#E8CCD2]', current: 'border-[#E8CCD2]' },
  ],
};

let unexpectedDiffFound = false;

for (const [filePath, expectedList] of Object.entries(expectedDiffLines)) {
  const beforeFile = path.join(baselineDir, filePath + '.before');
  if (!fs.existsSync(beforeFile)) {
    console.error(`Missing baseline .before file: ${beforeFile}`);
    unexpectedDiffFound = true;
    continue;
  }
  const beforeLines = fs.readFileSync(beforeFile, 'utf8').split('\n');
  const currentLines = fs.readFileSync(filePath, 'utf8').split('\n');

  let actualDiffCount = 0;
  for (let i = 0; i < Math.max(beforeLines.length, currentLines.length); i++) {
    if (beforeLines[i] !== currentLines[i]) {
      actualDiffCount++;
      const expected = expectedList.find((e) => e.line === i + 1);
      if (!expected || !beforeLines[i].includes(expected.before) || !currentLines[i].includes(expected.current)) {
        console.error(`Unexpected diff at ${filePath}:${i + 1}\n  Before:  ${beforeLines[i]}\n  Current: ${currentLines[i]}`);
        unexpectedDiffFound = true;
      }
    }
  }
  if (actualDiffCount !== expectedList.length) {
    console.error(`Diff count mismatch in ${filePath}: expected ${expectedList.length}, got ${actualDiffCount}`);
    unexpectedDiffFound = true;
  }
}

assert(
  !unexpectedDiffFound,
  'F1F2.1 All diffs against .before baseline copies match exact approved changes with 0 extraneous changes'
);

// ---------------------------------------------------------------------------
// 8. Baseline Manifest Integrity Verification
// ---------------------------------------------------------------------------
const manifestPath = '/Users/nack/.hermes/workspaces/content-planer/CP-COLOR-01-F1F2/baseline/manifest.json';
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const files = manifest.files || manifest;
  const allowedChanged = new Set([
    loginFormPath,
    sidebarPath,
    settingsPath,
    dialogPath,
    'TASKS.md',
    'HANDOFF.md',
  ]);

  let baselineMismatch = 0;
  for (const [file, info] of Object.entries(files)) {
    if (allowedChanged.has(file)) continue;
    if (!fs.existsSync(file)) {
      baselineMismatch++;
      continue;
    }
    const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    const expected = info.sha256 || info.hash || info;
    if (hash !== expected) {
      console.error(`Baseline mismatch on protected file: ${file}`);
      baselineMismatch++;
    }
  }

  assert(
    baselineMismatch === 0,
    `F1F2.2 All other ${Object.keys(files).length - allowedChanged.size} files in baseline manifest remain 100% byte-identical`
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('---------------------------------------------------------');
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
