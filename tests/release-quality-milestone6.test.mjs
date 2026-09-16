import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatBangkokDateTime,
  formatBangkokTime,
  formatBangkokDateShort,
} from "../src/utils/date.ts";
import {
  bangkokToUtc,
  utcToBangkokParts,
  formatBangkokDate,
  BANGKOK_TIMEZONE,
} from "../src/utils/timezone.ts";
import { getLocalizedErrorMessage } from "../src/utils/errors.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

test("1. Thai typography and word break rules in globals.css", () => {
  const cssPath = path.join(projectRoot, "src/app/globals.css");
  const css = fs.readFileSync(cssPath, "utf8");

  assert.ok(
    css.includes("overflow-wrap: break-word"),
    "globals.css must declare overflow-wrap: break-word"
  );
  assert.ok(
    css.includes("word-break: break-word"),
    "globals.css must declare word-break: break-word"
  );
  assert.ok(
    css.includes("Sarabun") && css.includes("Thonburi"),
    "globals.css must include Thai-friendly font family definitions"
  );
});

test("2. Dead sample code and unresolved placeholders are removed", () => {
  const samplePath = path.join(projectRoot, "src/data/sampleContent.ts");
  assert.equal(
    fs.existsSync(samplePath),
    false,
    "src/data/sampleContent.ts must be completely removed as dead sample code"
  );

  const en = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/messages/en.json"), "utf8"));
  const th = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/messages/th.json"), "utf8"));

  const removedKeys = [
    "calendar.inDevelopment",
    "calendar.backToPlanner",
    "ideas.inDevelopment",
    "ideas.backToPlanner",
    "recordModal.errors.saveFailed",
    "tasks.errors.saveFailed",
    "referenceAccounts.errors.saveFailed",
    "pillars.educational",
    "pillars.behindTheScenes",
    "table.viewAction",
    "card.targetDate",
    "nav.collapseNav",
    "summary.allCount",
    "filters.filterResults",
    "loading.pleaseWait",
    "tasks.createSuccess",
    "common.localeTh",
    "common.tomorrow",
  ];

  function getVal(obj, keyPath) {
    return keyPath.split(".").reduce((acc, k) => acc?.[k], obj);
  }

  for (const k of removedKeys) {
    assert.equal(getVal(en, k), undefined, `Dead key ${k} must not exist in en.json`);
    assert.equal(getVal(th, k), undefined, `Dead key ${k} must not exist in th.json`);
  }
});

test("3. 100% Dictionary parity, healthy key count, and placeholder matching", () => {
  const en = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/messages/en.json"), "utf8"));
  const th = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/messages/th.json"), "utf8"));

  function flatten(obj, prefix = "") {
    let result = {};
    for (const [k, v] of Object.entries(obj)) {
      const full = prefix ? `${prefix}.${k}` : k;
      if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        Object.assign(result, flatten(v, full));
      } else {
        result[full] = v;
      }
    }
    return result;
  }

  const enFlat = flatten(en);
  const thFlat = flatten(th);

  const enKeys = Object.keys(enFlat).sort();
  const thKeys = Object.keys(thFlat).sort();

  assert.deepEqual(enKeys, thKeys, "EN and TH dictionaries must have exact key parity");
  assert.ok(enKeys.length >= 350, `Expected at least 350 keys, got ${enKeys.length}`);

  // Verify placeholder tokens match 1:1
  for (const k of enKeys) {
    const enVal = String(enFlat[k]);
    const thVal = String(thFlat[k]);

    const enTokens = (enVal.match(/\{[a-zA-Z0-9_]+\}/g) || []).sort();
    const thTokens = (thVal.match(/\{[a-zA-Z0-9_]+\}/g) || []).sort();

    assert.deepEqual(
      enTokens,
      thTokens,
      `Placeholder mismatch for key ${k}: EN has ${enTokens.join(", ")} while TH has ${thTokens.join(", ")}`
    );
  }
});

test("4. Form submit buttons provide accessible, localized saving state", () => {
  const files = [
    {
      file: "src/components/planner/RecordModal.tsx",
      expected: "isPending ? t('common.saving') : t('recordModal.save')",
    },
    {
      file: "src/components/tasks/TasksView.tsx",
      expected: "isPending ? t('common.saving') : t('tasks.save')",
    },
    {
      file: "src/components/ideas/ReferenceAccountsView.tsx",
      expected: 'isPending ? t("common.saving") : t("recordModal.save")',
    },
  ];

  for (const { file, expected } of files) {
    const content = fs.readFileSync(path.join(projectRoot, file), "utf8");
    assert.ok(
      content.includes(expected),
      `${file} submit button must use common.saving during isPending`
    );
    assert.ok(
      !content.includes("isPending ? '...'") && !content.includes('isPending ? "..."'),
      `${file} must not contain unlocalized ... for submit loading state`
    );
  }
});

test("5. Responsive layout and cards visibility", () => {
  const cardsFile = path.join(projectRoot, "src/components/planner/PlannerCards.tsx");
  const cardsContent = fs.readFileSync(cardsFile, "utf8");

  assert.ok(
    !cardsContent.includes("md:hidden"),
    "PlannerCards.tsx must not contain md:hidden on its container so tablet viewports (768px - 1023px) remain visible"
  );

  const navFile = path.join(projectRoot, "src/components/shell/MobileNav.tsx");
  const navContent = fs.readFileSync(navFile, "utf8");

  assert.ok(
    navContent.includes("max-w-[68px]"),
    "MobileNav.tsx must allocate adequate max-width for Thai navigation labels"
  );
});

test("6. Localized settings page metadata and full application routes coverage", () => {
  const settingsLayoutFile = path.join(projectRoot, "src/app/[locale]/settings/layout.tsx");
  assert.ok(
    fs.existsSync(settingsLayoutFile),
    "src/app/[locale]/settings/layout.tsx must exist"
  );

  const settingsContent = fs.readFileSync(settingsLayoutFile, "utf8");
  assert.ok(
    settingsContent.includes("generateMetadata"),
    "settings/layout.tsx must export generateMetadata"
  );
  assert.ok(
    settingsContent.includes("ตั้งค่า — Content Planner") &&
    settingsContent.includes("Settings — Content Planner"),
    "settings/layout.tsx must provide localized titles for Thai and English"
  );

  const pagesWithMetadata = [
    "src/app/[locale]/planner/page.tsx",
    "src/app/[locale]/tasks/page.tsx",
    "src/app/[locale]/calendar/page.tsx",
    "src/app/[locale]/ideas/page.tsx",
    "src/app/[locale]/settings/layout.tsx",
    "src/app/[locale]/login/page.tsx",
  ];

  for (const p of pagesWithMetadata) {
    const content = fs.readFileSync(path.join(projectRoot, p), "utf8");
    assert.ok(
      content.includes("generateMetadata"),
      `${p} must export generateMetadata for localized browser tab title and description`
    );
  }
});

test("7. Asia/Bangkok date and time formatting with Thai suffix", () => {
  const testUtc = "2026-09-16T08:30:00.000Z"; // 15:30 in Bangkok (UTC+7)

  const thDateTime = formatBangkokDateTime(testUtc, "th", true);
  const enDateTime = formatBangkokDateTime(testUtc, "en", true);

  assert.ok(
    thDateTime.endsWith(" น."),
    `Thai datetime should end with " น.", got: ${thDateTime}`
  );
  assert.ok(
    !enDateTime.endsWith(" น."),
    `English datetime should not end with " น.", got: ${enDateTime}`
  );

  const thTime = formatBangkokTime(testUtc, "th");
  const enTime = formatBangkokTime(testUtc, "en");

  assert.ok(thTime.endsWith(" น."), `Thai time should end with " น.", got: ${thTime}`);
  assert.ok(!enTime.endsWith(" น."), `English time should not end with " น.", got: ${enTime}`);

  // Verify Bangkok parts extraction
  const parts = utcToBangkokParts(testUtc);
  assert.equal(parts.date, "2026-09-16");
  assert.equal(parts.time, "15:30");

  // Verify short date and date-only formatting
  const shortDate = formatBangkokDateShort(testUtc, "th");
  assert.ok(shortDate.length > 0);

  const dateOnlyStr = formatBangkokDate(testUtc, false, "th");
  assert.ok(dateOnlyStr.length > 0);
  assert.equal(BANGKOK_TIMEZONE, "Asia/Bangkok");

  // Verify roundtrip
  const roundtripUtc = bangkokToUtc(parts.date, parts.time);
  assert.equal(roundtripUtc, testUtc);
});

test("8. Comprehensive error code translation coverage", () => {
  const en = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/messages/en.json"), "utf8"));
  const th = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/messages/th.json"), "utf8"));

  const tEn = (key) => {
    return key.split(".").reduce((o, k) => o?.[k], en) || key;
  };

  const tTh = (key) => {
    return key.split(".").reduce((o, k) => o?.[k], th) || key;
  };

  const errorCodes = [
    "unauthorized",
    "invalid_id",
    "not_found",
    "service_error",
    "validation_failed",
    "db_error",
    "failed_to_load",
    "save_failed",
    "delete_failed",
    "duplicate_failed",
    "archive_failed",
  ];

  for (const code of errorCodes) {
    const enMsg = getLocalizedErrorMessage(tEn, code);
    const thMsg = getLocalizedErrorMessage(tTh, code);

    assert.ok(enMsg && !enMsg.startsWith("errors."), `Missing EN error translation for: ${code}`);
    assert.ok(thMsg && !thMsg.startsWith("errors."), `Missing TH error translation for: ${code}`);
    assert.notEqual(enMsg, thMsg, `EN and TH must produce distinct localized messages for: ${code}`);
  }
});

test("9. Static translation call scanner and regression guard for missing keys", () => {
  const en = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/messages/en.json"), "utf8"));
  const th = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/messages/th.json"), "utf8"));

  function getVal(obj, keyPath) {
    return keyPath.split(".").reduce((acc, k) => acc?.[k], obj);
  }

  function walk(dir) {
    let files = [];
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        if (f !== "node_modules" && f !== ".next" && f !== ".git") {
          files = files.concat(walk(full));
        }
      } else if (/\.(ts|tsx)$/.test(f)) {
        files.push(full);
      }
    }
    return files;
  }

  const prodFiles = walk(path.join(projectRoot, "src"));
  assert.ok(prodFiles.length >= 20, `Expected at least 20 production files, got ${prodFiles.length}`);

  // Static call pattern: t('key.path') or t("key.path"), followed by , or )
  const staticRegex = /\bt\s*\(\s*["']([a-zA-Z0-9_.-]+)["']\s*[,)]/g;
  const missingKeys = [];
  const scannedKeys = new Set();

  for (const file of prodFiles) {
    const content = fs.readFileSync(file, "utf8");
    let match;
    while ((match = staticRegex.exec(content)) !== null) {
      const key = match[1];
      scannedKeys.add(key);
      const enVal = getVal(en, key);
      const thVal = getVal(th, key);
      if (enVal === undefined || thVal === undefined) {
        missingKeys.push({ file: path.relative(projectRoot, file), key, enVal, thVal });
      }
    }
  }

  assert.ok(scannedKeys.size >= 100, `Expected at least 100 unique static translation keys, got ${scannedKeys.size}`);
  assert.deepEqual(
    missingKeys,
    [],
    `Found ${missingKeys.length} static translation call(s) missing from dictionaries: ${JSON.stringify(missingKeys, null, 2)}`
  );

  // Dynamic template and concat calls: verify their namespace prefixes exist in en.json and th.json
  const dynamicTemplateRegex = /\bt\s*\(\s*`([^`$]+)\${/g;
  const dynamicConcatRegex = /\bt\s*\(\s*["']([a-zA-Z0-9_.-]+)["']\s*\+/g;

  const dynamicPrefixes = new Set();
  for (const file of prodFiles) {
    const content = fs.readFileSync(file, "utf8");
    let match;
    while ((match = dynamicTemplateRegex.exec(content)) !== null) {
      dynamicPrefixes.add(match[1]);
    }
    while ((match = dynamicConcatRegex.exec(content)) !== null) {
      dynamicPrefixes.add(match[1]);
    }
  }

  for (const prefix of dynamicPrefixes) {
    const cleanPrefix = prefix.endsWith(".") ? prefix.slice(0, -1) : prefix;
    const enParent = getVal(en, cleanPrefix);
    const thParent = getVal(th, cleanPrefix);
    assert.ok(
      enParent && typeof enParent === "object",
      `Dynamic key prefix "${prefix}" namespace missing from en.json`
    );
    assert.ok(
      thParent && typeof thParent === "object",
      `Dynamic key prefix "${prefix}" namespace missing from th.json`
    );
  }

  // Explicit regression assertion: The four defective keys must fail if reintroduced
  const recordModalContent = fs.readFileSync(
    path.join(projectRoot, "src/components/planner/RecordModal.tsx"),
    "utf8"
  );
  assert.ok(
    !recordModalContent.includes("recordModal.newTitle"),
    "RecordModal must not use unlocalized recordModal.newTitle (must use recordModal.createTitle)"
  );
  assert.ok(
    !recordModalContent.includes("recordModal.closeAria"),
    "RecordModal must not use unlocalized recordModal.closeAria (must use recordModal.close)"
  );
  assert.ok(
    !recordModalContent.includes("recordModal.titleField"),
    "RecordModal must not use unlocalized recordModal.titleField (must use recordModal.title)"
  );

  const refAccountsContent = fs.readFileSync(
    path.join(projectRoot, "src/components/ideas/ReferenceAccountsView.tsx"),
    "utf8"
  );
  assert.ok(
    !refAccountsContent.includes('t("tasks.edit")') && !refAccountsContent.includes("t('tasks.edit')"),
    "ReferenceAccountsView must not use non-existent tasks.edit (must use referenceAccounts.editAccount)"
  );
});
