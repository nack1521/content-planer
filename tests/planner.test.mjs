import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// 1. Validate Canonical Message Dictionaries
test("Bilingual dictionary parity test (src/messages)", () => {
  const enPath = join(process.cwd(), "src/messages/en.json");
  const thPath = join(process.cwd(), "src/messages/th.json");

  assert.ok(existsSync(enPath), "src/messages/en.json must exist");
  assert.ok(existsSync(thPath), "src/messages/th.json must exist");

  const en = JSON.parse(readFileSync(enPath, "utf8"));
  const th = JSON.parse(readFileSync(thPath, "utf8"));

  function getAllKeys(obj, prefix = "") {
    let keys = [];
    for (const [k, v] of Object.entries(obj)) {
      const full = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        keys = keys.concat(getAllKeys(v, full));
      } else {
        keys.push(full);
      }
    }
    return keys.sort();
  }

  const enKeys = getAllKeys(en);
  const thKeys = getAllKeys(th);

  assert.deepEqual(enKeys, thKeys, "src/messages/en.json and th.json must have 100% identical keys");
  assert.ok(enKeys.length > 50, "Must have comprehensive message keys");
});

// 2. Validate Date Formatter in Asia/Bangkok
test("Asia/Bangkok Date formatter verification", () => {
  const d = new Date("2026-09-13T18:00:00+07:00");

  const bkkEn = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

  const bkkTh = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

  assert.match(bkkEn, /Sep 13, 2026/);
  assert.match(bkkTh, /13 ก\.ย\. 2569/);
});

// 3. Validate Built Pre-rendered Static Pages
test("Pre-rendered Thai settings HTML exists and contains localized content", () => {
  const thHtmlPath = join(process.cwd(), ".next/server/app/th/settings.html");
  assert.ok(
    existsSync(thHtmlPath),
    `Missing build artifact: ${thHtmlPath}. Run "npm run build" first.`
  );
  const html = readFileSync(thHtmlPath, "utf8");
  assert.ok(html.includes("<html lang=\"th\""), "HTML must set lang=\"th\" on Thai route");
  assert.ok(html.includes("Content Planner"), "HTML must contain App title");
  assert.ok(html.includes("การตั้งค่า"), "HTML must contain Thai navigation label");
});

test("Pre-rendered English settings HTML exists and contains localized content", () => {
  const enHtmlPath = join(process.cwd(), ".next/server/app/en/settings.html");
  assert.ok(
    existsSync(enHtmlPath),
    `Missing build artifact: ${enHtmlPath}. Run "npm run build" first.`
  );
  const html = readFileSync(enHtmlPath, "utf8");
  assert.ok(html.includes("<html lang=\"en\""), "HTML must set lang=\"en\" on English route");
  assert.ok(html.includes("Content Planner"), "HTML must contain App title");
  assert.ok(html.includes("Settings"), "HTML must contain English navigation label");
});

// 4. Validate live server if running
test("Live server responses and invalid locale rejection", async () => {
  const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
  const probe = await fetch(`${baseUrl}/`, { redirect: "manual" });
  assert.ok(probe.status < 500, `Local test server must be reachable on ${baseUrl}`);

  const rootRes = await fetch(`${baseUrl}/`, { redirect: "manual" });
  assert.equal(rootRes.status, 307);
  assert.equal(rootRes.headers.get("location"), "/th/planner");

  const invalidRes = await fetch(`${baseUrl}/fr/planner`);
  assert.equal(invalidRes.status, 404, "Unsupported locale /fr/planner must return 404");
});

test("Live server protected route redirection for dynamic planner and tasks", async () => {
  const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
  const thRes = await fetch(`${baseUrl}/th/planner`, { redirect: "manual" });
  assert.equal(thRes.status, 307);
  assert.equal(thRes.headers.get("location"), "/th/login");

  const enRes = await fetch(`${baseUrl}/en/planner`, { redirect: "manual" });
  assert.equal(enRes.status, 307);
  assert.equal(enRes.headers.get("location"), "/en/login");

  const thTasksRes = await fetch(`${baseUrl}/th/tasks`, { redirect: "manual" });
  assert.equal(thTasksRes.status, 307);
  assert.equal(thTasksRes.headers.get("location"), "/th/login");

  const enTasksRes = await fetch(`${baseUrl}/en/tasks`, { redirect: "manual" });
  assert.equal(enTasksRes.status, 307);
  assert.equal(enTasksRes.headers.get("location"), "/en/login");
});
