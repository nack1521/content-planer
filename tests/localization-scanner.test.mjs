import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLocalizedErrorMessage } from "../src/utils/errors.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

test("1. Translation keys have 100% parity between en.json and th.json", () => {
  const en = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/messages/en.json"), "utf8"));
  const th = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/messages/th.json"), "utf8"));

  function getKeys(obj, prefix = "") {
    let keys = [];
    for (const k of Object.keys(obj)) {
      const full = prefix ? `${prefix}.${k}` : k;
      if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
        keys.push(...getKeys(obj[k], full));
      } else {
        keys.push(full);
      }
    }
    return keys;
  }

  const enKeys = new Set(getKeys(en));
  const thKeys = new Set(getKeys(th));

  const missingInTh = [...enKeys].filter((k) => !thKeys.has(k));
  const missingInEn = [...thKeys].filter((k) => !enKeys.has(k));

  assert.deepEqual(missingInTh, [], "th.json is missing keys present in en.json");
  assert.deepEqual(missingInEn, [], "en.json is missing keys present in th.json");
  assert.ok(enKeys.size >= 300, `Expected at least 300 translation keys, found ${enKeys.size}`);
});

test("2. Reusable components have no hardcoded English loading messages", () => {
  const componentDirs = [
    path.join(projectRoot, "src/components/planner"),
    path.join(projectRoot, "src/components/tasks"),
    path.join(projectRoot, "src/components/ideas"),
  ];

  const files = [];
  for (const dir of componentDirs) {
    if (fs.existsSync(dir)) {
      for (const file of fs.readdirSync(dir)) {
        if (file.endsWith(".tsx")) {
          files.push(path.join(dir, file));
        }
      }
    }
  }

  const hardcodedLoadingPatterns = [
    /Loading\s+creator\s+workspace/i,
    /Loading\s+production\s+tasks/i,
    /Loading\s+tasks/i,
    /Loading\s+ideas/i,
    /Loading\s+planner/i,
    />\s*Loading\.\.\.\s*</i,
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const pattern of hardcodedLoadingPatterns) {
      assert.ok(
        !pattern.test(content),
        `Found hardcoded loading string in ${path.relative(projectRoot, file)}: ${pattern}`
      );
    }
  }
});

test("3. Reusable components have no hardcoded literal placeholders", () => {
  const componentDirs = [
    path.join(projectRoot, "src/components/planner"),
    path.join(projectRoot, "src/components/tasks"),
    path.join(projectRoot, "src/components/ideas"),
  ];

  const files = [];
  for (const dir of componentDirs) {
    if (fs.existsSync(dir)) {
      for (const file of fs.readdirSync(dir)) {
        if (file.endsWith(".tsx")) {
          files.push(path.join(dir, file));
        }
      }
    }
  }

  const hardcodedPlaceholderPattern = /placeholder\s*=\s*["'](?!\s*$)((?:e\.g\.|เช่น|[A-Za-z]{4,})[^"']*)["']/i;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = hardcodedPlaceholderPattern.exec(line);
      assert.ok(
        !match,
        `Found hardcoded placeholder on line ${i + 1} of ${path.relative(projectRoot, file)}: "${match?.[0]}"`
      );
    }
  }
});

test("4. Reusable components do not contain hardcoded 'Copy of' prefix in JSX", () => {
  const componentDirs = [
    path.join(projectRoot, "src/components/planner"),
    path.join(projectRoot, "src/components/tasks"),
    path.join(projectRoot, "src/components/ideas"),
  ];

  for (const dir of componentDirs) {
    if (fs.existsSync(dir)) {
      for (const file of fs.readdirSync(dir)) {
        if (file.endsWith(".tsx")) {
          const content = fs.readFileSync(path.join(dir, file), "utf8");
          assert.ok(
            !content.includes('"Copy of "') && !content.includes("'Copy of '"),
            `Hardcoded "Copy of" found in ${file}`
          );
        }
      }
    }
  }
});

test("5. getLocalizedErrorMessage translates stable server error codes", () => {
  const enMessages = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/messages/en.json"), "utf8"));
  const thMessages = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/messages/th.json"), "utf8"));

  const tEn = (key) => {
    const parts = key.split(".");
    let val = enMessages;
    for (const p of parts) val = val?.[p];
    return val || key;
  };

  const tTh = (key) => {
    const parts = key.split(".");
    let val = thMessages;
    for (const p of parts) val = val?.[p];
    return val || key;
  };

  const knownCodes = [
    "unauthorized",
    "invalid_id",
    "not_found",
    "service_error",
    "validation_failed",
    "db_error",
    "failed_to_load",
  ];

  for (const code of knownCodes) {
    const enMsg = getLocalizedErrorMessage(tEn, code);
    const thMsg = getLocalizedErrorMessage(tTh, code);

    assert.ok(enMsg && !enMsg.startsWith("errors."), `Expected translated EN error for code: ${code}, got: ${enMsg}`);
    assert.ok(thMsg && !thMsg.startsWith("errors."), `Expected translated TH error for code: ${code}, got: ${thMsg}`);
    assert.notEqual(enMsg, thMsg, `Expected distinct EN and TH translations for code: ${code}`);
  }
});
