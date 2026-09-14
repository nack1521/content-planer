import test from "node:test";
import assert from "node:assert/strict";
import { bangkokToUtc, utcToBangkokParts, formatBangkokDate } from "../src/utils/timezone.ts";
import {
  isValidUuid,
  validateUuid,
  sanitizeTitle,
  sanitizeOptionalText,
  validateProgress,
  validatePublishTimeKnown,
  isValidUrl,
  validateUrl,
  sanitizePlatforms,
  sanitizeHashtags,
  isValidIsoDate,
  validateIsoDate,
  isValidDateOnly,
  validateDateOnly,
  validateWorkflowStatus,
  validateTaskStatus,
  validateTaskPriority,
  validateTaskType,
  validateContentFormat,
  validateContentGoal,
  validateContentLink,
  validateLinksArray,
} from "../src/utils/validation.ts";

// 1. Explicit Asia/Bangkok <-> UTC Timezone Conversions
test("Timezone conversion: bangkokToUtc converts Bangkok local time to UTC", () => {
  // 14:30 Bangkok time (UTC+7) -> 07:30 UTC
  const utc = bangkokToUtc("2026-06-15", "14:30");
  assert.equal(utc, "2026-06-15T07:30:00.000Z");

  // 00:00 Bangkok time (UTC+7) -> 17:00 previous day UTC
  const midnightUtc = bangkokToUtc("2026-06-15", "00:00");
  assert.equal(midnightUtc, "2026-06-14T17:00:00.000Z");

  // Missing time defaults to 00:00 Bangkok time
  const defaultUtc = bangkokToUtc("2026-06-15", null);
  assert.equal(defaultUtc, "2026-06-14T17:00:00.000Z");

  // Invalid date throws
  assert.throws(() => bangkokToUtc("invalid-date", "12:00"));
});

test("Timezone conversion: utcToBangkokParts extracts Bangkok date and time", () => {
  const parts = utcToBangkokParts("2026-06-15T07:30:00.000Z");
  assert.equal(parts.date, "2026-06-15");
  assert.equal(parts.time, "14:30");

  const midnightParts = utcToBangkokParts("2026-06-14T17:00:00.000Z");
  assert.equal(midnightParts.date, "2026-06-15");
  assert.equal(midnightParts.time, "00:00");

  assert.deepEqual(utcToBangkokParts(null), { date: "", time: "" });
});

test("Timezone formatting: respects publish_time_known with date-only display", () => {
  const iso = "2026-06-15T07:30:00.000Z";

  // When time is unknown: display date-only without arbitrary hours/minutes
  const dateOnlyEn = formatBangkokDate(iso, false, "en");
  assert.equal(dateOnlyEn, "Jun 15, 2026");
  assert.ok(!dateOnlyEn.includes(":"), "Date-only format must not include time");

  // When time is known: display date and time
  const fullEn = formatBangkokDate(iso, true, "en");
  assert.equal(fullEn, "Jun 15, 2026, 14:30");

  // Thai locale
  const dateOnlyTh = formatBangkokDate(iso, false, "th");
  assert.match(dateOnlyTh, /15 มิ\.ย\. 2569/);
  assert.ok(!dateOnlyTh.includes(":"), "Thai date-only format must not include time");
});

// 2. Strict Runtime Validation
test("Validation: isValidUuid and validateUuid enforce 8-4-4-4-12 UUID format", () => {
  assert.equal(isValidUuid("a0000000-0000-0000-0000-000000000001"), true);
  assert.equal(validateUuid("a0000000-0000-0000-0000-000000000001"), "a0000000-0000-0000-0000-000000000001");
  assert.equal(isValidUuid("not-a-uuid"), false);
  assert.throws(() => validateUuid("not-a-uuid"), /must be a valid UUID/);
  assert.throws(() => validateUuid(null), /must be a valid UUID/);
});

test("Validation: sanitizeTitle strictly enforces non-empty string and max 500 chars", () => {
  assert.equal(sanitizeTitle("  My Clean Title  "), "My Clean Title");
  assert.throws(() => sanitizeTitle(""), /cannot be empty/);
  assert.throws(() => sanitizeTitle("   "), /cannot be empty/);
  assert.throws(() => sanitizeTitle(null), /must be a string/);
  assert.throws(() => sanitizeTitle(123), /must be a string/);
  assert.throws(() => sanitizeTitle("a".repeat(501)), /exceeds maximum allowed length/);
  assert.equal(sanitizeTitle("a".repeat(500)).length, 500);
});

test("Validation: sanitizeOptionalText rejects non-strings and oversized text without silent truncation", () => {
  assert.equal(sanitizeOptionalText("  Some description  "), "Some description");
  assert.equal(sanitizeOptionalText(null), null);
  assert.equal(sanitizeOptionalText(undefined), null);
  assert.equal(sanitizeOptionalText("   "), null);
  assert.throws(() => sanitizeOptionalText(123), /Invalid text type/);
  assert.throws(() => sanitizeOptionalText(true), /Invalid text type/);
  assert.throws(() => sanitizeOptionalText("a".repeat(5001)), /exceeds maximum allowed length/);
  assert.equal(sanitizeOptionalText("a".repeat(5000))?.length, 5000);
});

test("Validation: validateProgress strictly enforces integer 0 to 100", () => {
  assert.equal(validateProgress(0), 0);
  assert.equal(validateProgress(50), 50);
  assert.equal(validateProgress(100), 100);
  assert.equal(validateProgress(null), 0);
  assert.throws(() => validateProgress(-1), /between 0 and 100/);
  assert.throws(() => validateProgress(101), /between 0 and 100/);
  assert.throws(() => validateProgress("not a number"), /must be a finite number/);
  assert.throws(() => validateProgress(NaN), /must be a finite number/);
});

test("Validation: validatePublishTimeKnown strictly enforces boolean", () => {
  assert.equal(validatePublishTimeKnown(true), true);
  assert.equal(validatePublishTimeKnown(false), false);
  assert.throws(() => validatePublishTimeKnown("true"), /must be a boolean/);
  assert.throws(() => validatePublishTimeKnown(null), /must be a boolean/);
});

test("Validation: isValidDateOnly strictly verifies genuine calendar dates and rejects Feb 30", () => {
  assert.equal(isValidDateOnly("2026-06-15"), true);
  assert.equal(isValidDateOnly("2026-02-28"), true);
  assert.equal(isValidDateOnly("2026-02-29"), false, "2026 is not a leap year: Feb 29 must be rejected");
  assert.equal(isValidDateOnly("2024-02-29"), true, "2024 is a leap year: Feb 29 must be accepted");
  assert.equal(isValidDateOnly("2026-02-30"), false, "Feb 30 must be strictly rejected");
  assert.equal(isValidDateOnly("2026-04-31"), false, "April has only 30 days: Apr 31 must be rejected");
  assert.equal(isValidDateOnly("2026-13-01"), false, "Month 13 must be rejected");
  assert.equal(isValidDateOnly("invalid"), false);

  assert.equal(validateDateOnly("2026-06-15"), "2026-06-15");
  assert.throws(() => validateDateOnly("2026-02-30"), /must be a valid calendar date/);
});

test("Validation: isValidIsoDate strictly checks format and genuine calendar date", () => {
  assert.equal(isValidIsoDate("2026-06-15T07:30:00.000Z"), true);
  assert.equal(isValidIsoDate("2026-02-30T10:00:00.000Z"), false, "Feb 30 in ISO date must be rejected");
  assert.equal(isValidIsoDate("invalid-date"), false);

  assert.equal(validateIsoDate("2026-06-15T07:30:00.000Z"), "2026-06-15T07:30:00.000Z");
  assert.throws(() => validateIsoDate("2026-02-30T10:00:00.000Z"), /genuine calendar date/);
});

test("Validation: validateUrl validates http/https schemes and rejects malicious URLs", () => {
  assert.equal(isValidUrl("https://youtube.com/watch?v=123"), true);
  assert.equal(isValidUrl("http://example.com"), true);
  assert.equal(isValidUrl("javascript:alert(1)"), false);
  assert.equal(isValidUrl("ftp://example.com"), false);
  assert.equal(isValidUrl("data:text/plain;base64,AAA"), false);
  assert.equal(isValidUrl("not a url"), false);

  assert.equal(validateUrl("https://youtube.com"), "https://youtube.com");
  assert.throws(() => validateUrl("javascript:alert(1)"), /must be a valid http or https URL/);
});

test("Validation: sanitizePlatforms enforces non-empty array of valid platforms", () => {
  assert.deepEqual(sanitizePlatforms(["youtube", "tiktok"]), ["youtube", "tiktok"]);
  assert.deepEqual(sanitizePlatforms(["youtube", "youtube"]), ["youtube"]);
  assert.throws(() => sanitizePlatforms(["invalid_platform"]), /Invalid platform/);
  assert.throws(() => sanitizePlatforms([]), /At least one valid platform/);
  assert.throws(() => sanitizePlatforms("not-an-array"), /At least one valid platform/);
});

test("Validation: sanitizeHashtags cleans and bounds tags", () => {
  const cleaned = sanitizeHashtags(["#tech", "  education  ", ""]);
  assert.deepEqual(cleaned, ["#tech", "#education"]);
  assert.deepEqual(sanitizeHashtags(null), []);
  assert.throws(() => sanitizeHashtags("not-an-array"), /must be an array/);
  assert.throws(() => sanitizeHashtags(["a".repeat(101)]), /exceeds maximum length/);
});

test("Validation: Workflow and Task enums reject invalid values without silent fallback", () => {
  // Workflow status
  assert.equal(validateWorkflowStatus("idea"), "idea");
  assert.equal(validateWorkflowStatus("published"), "published");
  assert.throws(() => validateWorkflowStatus("invalid_status"), /Invalid status/);

  // Task status (reject archived)
  assert.equal(validateTaskStatus("not_started"), "not_started");
  assert.equal(validateTaskStatus("in_progress"), "in_progress");
  assert.equal(validateTaskStatus("done"), "done");
  assert.throws(() => validateTaskStatus("archived"), /Invalid task status/);
  assert.throws(() => validateTaskStatus("invalid"), /Invalid task status/);

  // Task priority (reject urgent)
  assert.equal(validateTaskPriority("low"), "low");
  assert.equal(validateTaskPriority("high"), "high");
  assert.equal(validateTaskPriority(null), null);
  assert.throws(() => validateTaskPriority("urgent"), /Invalid task priority/);

  // Task type
  assert.equal(validateTaskType("video"), "video");
  assert.equal(validateTaskType(null), null);
  assert.throws(() => validateTaskType("unknown"), /Invalid task type/);

  // Content format & goal
  assert.equal(validateContentFormat("photo"), "photo");
  assert.equal(validateContentFormat(null), null);
  assert.throws(() => validateContentFormat("unknown_format"), /Invalid format/);

  assert.equal(validateContentGoal("awareness"), "awareness");
  assert.equal(validateContentGoal(null), null);
  assert.throws(() => validateContentGoal("unknown_goal"), /Invalid goal/);
});

test("Validation: Content link validation validates link_type, url, and platform", () => {
  const validLink = validateContentLink({
    link_type: "idea_source",
    url: "https://tiktok.com/@ref",
    platform: "tiktok",
    label: "Reference clip",
  });
  assert.equal(validLink.link_type, "idea_source");
  assert.equal(validLink.url, "https://tiktok.com/@ref");
  assert.equal(validLink.platform, "tiktok");
  assert.equal(validLink.label, "Reference clip");

  assert.throws(
    () => validateContentLink({ link_type: "bad_type", url: "https://example.com" }),
    /Invalid link_type/
  );
  assert.throws(
    () => validateContentLink({ link_type: "asset", url: "invalid-url" }),
    /must be a valid http or https URL/
  );

  const array = validateLinksArray([
    { link_type: "asset", url: "https://drive.google.com/123" },
  ]);
  assert.equal(array.length, 1);
  assert.deepEqual(validateLinksArray(null), []);
});
