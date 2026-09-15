import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient, clearTestCookies } from "../src/utils/supabase/server.ts";
import {
  getCurrentBangkokYearMonth,
  getCurrentBangkokDate,
  getPreviousMonth,
  getNextMonth,
  isLeapYear,
  getDaysInMonth,
  getFirstDayOfWeek,
  getMonthGrid,
  filterAndGroupCalendarContent,
} from "../src/utils/calendar.ts";
import {
  getContentItemsAction,
  updateContentItemAction,
  quickCaptureIdeaAction,
  deleteContentItemAction,
} from "../src/app/actions/content.ts";
import { updateDefaultPlatformsAction } from "../src/app/actions/preferences.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const enMessages = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/messages/en.json"), "utf8"));
const thMessages = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/messages/th.json"), "utf8"));

// ==============================================================================
// 1. Bangkok Calendar Math & Leap-Year Boundaries
// ==============================================================================
test("Calendar Math: Leap-year calculation adheres to Gregorian rules", () => {
  assert.equal(isLeapYear(2024), true, "2024 is a leap year (divisible by 4, not 100)");
  assert.equal(isLeapYear(2026), false, "2026 is not a leap year");
  assert.equal(isLeapYear(2000), true, "2000 is a leap year (divisible by 400)");
  assert.equal(isLeapYear(1900), false, "1900 is not a leap year (divisible by 100, not 400)");
  assert.equal(isLeapYear(2400), true, "2400 is a leap year");
});

test("Calendar Math: Days in month handles February leap years and 30/31-day months", () => {
  assert.equal(getDaysInMonth(2024, 2), 29, "February 2024 must have 29 days");
  assert.equal(getDaysInMonth(2026, 2), 28, "February 2026 must have 28 days");
  assert.equal(getDaysInMonth(2000, 2), 29, "February 2000 must have 29 days");
  assert.equal(getDaysInMonth(1900, 2), 28, "February 1900 must have 28 days");

  // 30-day months: Apr, Jun, Sep, Nov
  assert.equal(getDaysInMonth(2026, 4), 30);
  assert.equal(getDaysInMonth(2026, 6), 30);
  assert.equal(getDaysInMonth(2026, 9), 30);
  assert.equal(getDaysInMonth(2026, 11), 30);

  // 31-day months: Jan, Mar, May, Jul, Aug, Oct, Dec
  assert.equal(getDaysInMonth(2026, 1), 31);
  assert.equal(getDaysInMonth(2026, 3), 31);
  assert.equal(getDaysInMonth(2026, 5), 31);
  assert.equal(getDaysInMonth(2026, 7), 31);
  assert.equal(getDaysInMonth(2026, 8), 31);
  assert.equal(getDaysInMonth(2026, 10), 31);
  assert.equal(getDaysInMonth(2026, 12), 31);

  assert.throws(() => getDaysInMonth(2026, 0), /Invalid month/);
  assert.throws(() => getDaysInMonth(2026, 13), /Invalid month/);
});

test("Calendar Navigation: Month and year boundary transitions", () => {
  assert.deepEqual(getPreviousMonth(2026, 1), { year: 2025, month: 12 }, "Jan 2026 -> Dec 2025");
  assert.deepEqual(getPreviousMonth(2026, 5), { year: 2026, month: 4 }, "May 2026 -> Apr 2026");
  assert.deepEqual(getNextMonth(2026, 12), { year: 2027, month: 1 }, "Dec 2026 -> Jan 2027");
  assert.deepEqual(getNextMonth(2026, 8), { year: 2026, month: 9 }, "Aug 2026 -> Sep 2026");
});

test("Calendar Math: getFirstDayOfWeek returns correct weekday for 1st of month", () => {
  // 2026-09-01 is a Tuesday (2)
  assert.equal(getFirstDayOfWeek(2026, 9), 2, "2026-09-01 is Tuesday (2)");
  // 2026-01-01 is a Thursday (4)
  assert.equal(getFirstDayOfWeek(2026, 1), 4, "2026-01-01 is Thursday (4)");
  // 2026-02-01 is a Sunday (0)
  assert.equal(getFirstDayOfWeek(2026, 2), 0, "2026-02-01 is Sunday (0)");
});

test("Calendar Grid: getMonthGrid generates complete 7-column matrix with correct padding", () => {
  // February 2026 starts on Sunday (0) and has 28 days -> exactly 28 cells (4 full weeks)
  const febGrid = getMonthGrid(2026, 2);
  assert.equal(febGrid.length % 7, 0, "Grid length must be a multiple of 7");
  assert.equal(febGrid.length, 28, "February 2026 grid has exactly 28 cells");
  assert.equal(febGrid[0].dayNumber, 1);
  assert.equal(febGrid[0].isCurrentMonth, true);
  assert.equal(febGrid[27].dayNumber, 28);
  assert.equal(febGrid[27].isCurrentMonth, true);

  // September 2026 starts on Tuesday (2), 30 days -> 2 padding from Aug + 30 days + 3 padding from Oct = 35 cells
  const sepGrid = getMonthGrid(2026, 9);
  assert.equal(sepGrid.length, 35, "September 2026 grid has 35 cells");
  assert.equal(sepGrid[0].isCurrentMonth, false, "First cell is August padding");
  assert.equal(sepGrid[0].month, 8, "First cell belongs to month 8");
  assert.equal(sepGrid[0].dayNumber, 30, "Sunday cell is August 30");
  assert.equal(sepGrid[1].dayNumber, 31, "Monday cell is August 31");
  assert.equal(sepGrid[2].dayNumber, 1, "Tuesday cell is September 1");
  assert.equal(sepGrid[2].isCurrentMonth, true);
  assert.equal(sepGrid[31].dayNumber, 30, "September 30");
  assert.equal(sepGrid[31].isCurrentMonth, true);
  assert.equal(sepGrid[32].dayNumber, 1, "October 1 padding");
  assert.equal(sepGrid[32].isCurrentMonth, false);
});

// ==============================================================================
// 2. Bangkok Date Grouping & Timezone Boundaries
// ==============================================================================
test("Bangkok Timezone: getCurrentBangkokYearMonth and Date adhere to Asia/Bangkok time", () => {
  // UTC 2026-04-30 18:30 is 2026-05-01 01:30 in Bangkok (UTC+7)
  const boundaryTime = new Date("2026-04-30T18:30:00Z");
  const bkk = getCurrentBangkokYearMonth(boundaryTime);
  assert.equal(bkk.year, 2026);
  assert.equal(bkk.month, 5, "UTC 18:30 on Apr 30 belongs to May 1 in Bangkok");

  const bkkDate = getCurrentBangkokDate(boundaryTime);
  assert.equal(bkkDate, "2026-05-01");

  // UTC 2025-12-31 17:00 is 2026-01-01 00:00 in Bangkok (New Year transition)
  const newYearTime = new Date("2025-12-31T17:00:00Z");
  const bkkNy = getCurrentBangkokYearMonth(newYearTime);
  assert.equal(bkkNy.year, 2026, "Year advances to 2026 at 17:00 UTC Dec 31");
  assert.equal(bkkNy.month, 1, "Month advances to Jan");
  assert.equal(getCurrentBangkokDate(newYearTime), "2026-01-01");
});

test("Calendar Grouping: Groups strictly by Bangkok date and excludes unscheduled/archived", () => {
  const items = [
    {
      id: "item-apr-30-utc",
      title: "Late UTC April Post",
      publish_at: "2026-04-30T18:00:00Z", // Bangkok: 2026-05-01 01:00
      publish_time_known: true,
      status: "scheduled",
      platforms: ["tiktok"],
      archived_at: null,
    },
    {
      id: "item-may-1-midday",
      title: "May 1 Midday Post",
      publish_at: "2026-05-01T07:00:00Z", // Bangkok: 2026-05-01 14:00
      publish_time_known: true,
      status: "scheduled",
      platforms: ["instagram"],
      archived_at: null,
    },
    {
      id: "item-may-1-dateonly",
      title: "May 1 Date-Only Post",
      publish_at: "2026-04-30T17:00:00Z", // Bangkok: 2026-05-01 00:00
      publish_time_known: false,
      status: "scheduled",
      platforms: ["youtube"],
      archived_at: null,
    },
    {
      id: "item-unscheduled-idea",
      title: "Idea with no date",
      publish_at: null,
      publish_time_known: false,
      status: "idea",
      platforms: ["tiktok"],
      archived_at: null,
    },
    {
      id: "item-archived-may",
      title: "Archived May Post",
      publish_at: "2026-05-05T10:00:00Z",
      publish_time_known: true,
      status: "scheduled",
      platforms: ["tiktok"],
      archived_at: "2026-05-05T11:00:00Z",
    },
  ];

  // Group for April 2026
  const aprilGrouped = filterAndGroupCalendarContent(items, 2026, 4);
  assert.equal(aprilGrouped.size, 0, "April 2026 must have 0 items (late Apr UTC item crossed into May in Bangkok)");

  // Group for May 2026
  const mayGrouped = filterAndGroupCalendarContent(items, 2026, 5);
  assert.equal(mayGrouped.size, 1, "May 2026 has exactly 1 date group (2026-05-01)");

  const may1Items = mayGrouped.get("2026-05-01");
  assert.equal(may1Items.length, 3, "May 1st has 3 items (unscheduled and archived excluded)");

  // Verify sorting order: date-only item comes first, then ordered by time
  assert.equal(may1Items[0].id, "item-may-1-dateonly", "Date-only item sorted first");
  assert.equal(may1Items[1].id, "item-apr-30-utc", "01:00 Bangkok time item comes next");
  assert.equal(may1Items[2].id, "item-may-1-midday", "14:00 Bangkok time item comes last");
});

// ==============================================================================
// 3. Exact Unscheduled-Idea Filter Definition
// ==============================================================================
test("Idea Bank Definition: Identifies unscheduled ideas exactly without duplicate data", () => {
  const isUnscheduledIdea = (item) => !item.archived_at && item.status === "idea" && !item.publish_at;

  // 1. Valid unscheduled idea
  assert.equal(
    isUnscheduledIdea({ status: "idea", publish_at: null, archived_at: null }),
    true,
    "Non-archived item with status idea and null publish_at is an unscheduled idea"
  );

  // 2. Scheduled idea (has publish_at) -> excluded
  assert.equal(
    isUnscheduledIdea({ status: "idea", publish_at: "2026-09-20T10:00:00Z", archived_at: null }),
    false,
    "Idea with scheduled date is NOT an unscheduled idea"
  );

  // 3. Status moved to researching/scripting -> excluded
  assert.equal(
    isUnscheduledIdea({ status: "scripting", publish_at: null, archived_at: null }),
    false,
    "Non-idea status with null publish_at is NOT an unscheduled idea"
  );

  // 4. Archived idea -> excluded
  assert.equal(
    isUnscheduledIdea({ status: "idea", publish_at: null, archived_at: "2026-09-15T00:00:00Z" }),
    false,
    "Archived idea is excluded"
  );
});

// ==============================================================================
// 4. Translation Key Parity for Milestone 5
// ==============================================================================
test("Localization Parity: All Milestone 5 Calendar and Ideas keys match between EN and TH", () => {
  const en = enMessages;
  const th = thMessages;

  const requiredCalendarKeys = [
    "title",
    "subtitle",
    "previousMonth",
    "nextMonth",
    "today",
    "loading",
    "fetchError",
    "retry",
    "noScheduledContent",
    "noScheduledContentDesc",
    "dateOnly",
    "scheduledBadge",
    "agendaView",
    "monthView",
    "morePosts",
    "viewPost",
    "createPost",
  ];

  for (const key of requiredCalendarKeys) {
    assert.ok(
      en.calendar && typeof en.calendar[key] === "string" && en.calendar[key].length > 0,
      `Missing or empty EN translation for calendar.${key}`
    );
    assert.ok(
      th.calendar && typeof th.calendar[key] === "string" && th.calendar[key].length > 0,
      `Missing or empty TH translation for calendar.${key}`
    );
    assert.notEqual(
      en.calendar[key],
      th.calendar[key],
      `Expected distinct EN and TH translations for calendar.${key}`
    );
  }

  const requiredIdeasKeys = [
    "title",
    "subtitle",
    "loading",
    "loadError",
    "retry",
    "quickCaptureTitle",
    "quickCapturePlaceholder",
    "notesPlaceholder",
    "addNotes",
    "hideNotes",
    "captureButton",
    "capturing",
    "captureSuccess",
    "validationTitleRequired",
    "searchPlaceholder",
    "planIdea",
    "planIdeaAria",
    "editIdea",
    "emptyUnscheduled",
    "emptyUnscheduledDesc",
    "noSearchResults",
    "clearSearch",
    "totalCount",
  ];

  for (const key of requiredIdeasKeys) {
    assert.ok(
      en.ideas && typeof en.ideas[key] === "string" && en.ideas[key].length > 0,
      `Missing or empty EN translation for ideas.${key}`
    );
    assert.ok(
      th.ideas && typeof th.ideas[key] === "string" && th.ideas[key].length > 0,
      `Missing or empty TH translation for ideas.${key}`
    );
    assert.notEqual(
      en.ideas[key],
      th.ideas[key],
      `Expected distinct EN and TH translations for ideas.${key}`
    );
  }
});

// ==============================================================================
// 5. Authenticated Production Actions: Quick Capture, Default Platform Fallback & In-Place Planning
// ==============================================================================
const TEST_OWNER_EMAIL = "milestone5-owner@example.com";
const TEST_OWNER_PW = "milestone5pass123";

const TEST_OTHER_EMAIL = "milestone5-other@example.com";
const TEST_OTHER_PW = "milestone5pass456";

test("Authenticated Actions: Quick Capture validation and persistence with platform fallback", async () => {
  // Ensure local Supabase environment variables
  const statusProc = spawnSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" });
  assert.equal(statusProc.status, 0, "Supabase status query failed");
  const statusJson = JSON.parse(statusProc.stdout);

  process.env.NEXT_PUBLIC_SUPABASE_URL = statusJson.API_URL || "http://127.0.0.1:54321";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = statusJson.PUBLISHABLE_KEY || statusJson.ANON_KEY;

  const adminClient = createAdminClient("http://127.0.0.1:54321", statusJson.SERVICE_ROLE_KEY);

  // Setup test owner account
  await adminClient.auth.admin.createUser({
    email: TEST_OWNER_EMAIL,
    password: TEST_OWNER_PW,
    email_confirm: true,
  });

  clearTestCookies();
  const client = await createClient();
  const { error: signInErr } = await client.auth.signInWithPassword({
    email: TEST_OWNER_EMAIL,
    password: TEST_OWNER_PW,
  });
  assert.equal(signInErr, null, "Sign in failed for test owner");

  // 1. Validation test: empty title rejected
  const emptyRes = await quickCaptureIdeaAction({ title: "   " });
  assert.equal(emptyRes.success, false);
  assert.equal(emptyRes.error, "validation_failed");

  // 2. Quick capture with title and notes, no platforms passed -> uses documented fallback ['tiktok']
  const captureRes = await quickCaptureIdeaAction({
    title: "10 AI productivity tools for solo creators",
    notes: "Focus on tools that save at least 2 hours a day.",
  });
  assert.equal(captureRes.success, true, "Quick capture must succeed");
  assert.ok(captureRes.id, "Returned record ID");

  // 3. Verify record in database
  const { items } = await getContentItemsAction();
  const captured = items.find((i) => i.id === captureRes.id);
  assert.ok(captured, "Captured record must be returned in getContentItemsAction");
  assert.equal(captured.title, "10 AI productivity tools for solo creators");
  assert.equal(captured.notes, "Focus on tools that save at least 2 hours a day.");
  assert.equal(captured.status, "idea");
  assert.equal(captured.publish_at, null);
  assert.deepEqual(captured.platforms, ["tiktok"], "Fell back reversibly to ['tiktok'] when no default set");

  // 4. Update owner preferences default_platforms to ['youtube', 'x']
  await updateDefaultPlatformsAction(["youtube", "x"]);

  // 5. Second quick capture -> should now use owner's configured default platforms
  const capture2Res = await quickCaptureIdeaAction({
    title: "Deep dive: Building autonomous coding agents",
    notes: "Break down architecture, sandbox, and verification.",
  });
  assert.equal(capture2Res.success, true);
  const { items: itemsAfterPref } = await getContentItemsAction();
  const captured2 = itemsAfterPref.find((i) => i.id === capture2Res.id);
  assert.ok(captured2);
  assert.deepEqual(captured2.platforms.sort(), ["x", "youtube"].sort(), "Used owner's saved default platforms");

  // ============================================================================
  // Planning the Idea: Updates the exact same record in place without duplicating
  // ============================================================================
  const planUpdateRes = await updateContentItemAction(captured.id, {
    status: "scripting",
    publish_at: "2026-09-25T14:00:00+07:00",
    publish_time_known: true,
  });
  assert.equal(planUpdateRes.success, true, "Updating idea record in place must succeed");

  const { items: itemsAfterPlan } = await getContentItemsAction();
  const plannedItem = itemsAfterPlan.find((i) => i.id === captured.id);
  assert.ok(plannedItem);
  assert.equal(plannedItem.id, captured.id, "ID must remain identical (updated in place)");
  assert.equal(plannedItem.status, "scripting", "Status advanced beyond idea");
  assert.ok(plannedItem.publish_at, "Received scheduled timestamp");

  // Assert it no longer appears in unscheduled ideas
  const isUnscheduled = !plannedItem.archived_at && plannedItem.status === "idea" && !plannedItem.publish_at;
  assert.equal(isUnscheduled, false, "Planned idea must leave the unscheduled ideas bank");

  // Clean up test records
  await deleteContentItemAction(captured.id);
  await deleteContentItemAction(captured2.id);
});

// ==============================================================================
// 6. Owner Isolation and RLS Behavior
// ==============================================================================
test("Security & RLS: Unscheduled ideas and calendar content are owner-isolated", async () => {
  const statusProc = spawnSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" });
  const statusJson = JSON.parse(statusProc.stdout);
  const adminClient = createAdminClient("http://127.0.0.1:54321", statusJson.SERVICE_ROLE_KEY);

  // Setup user B
  await adminClient.auth.admin.createUser({
    email: TEST_OTHER_EMAIL,
    password: TEST_OTHER_PW,
    email_confirm: true,
  });

  // User A signs in and creates an idea
  clearTestCookies();
  const clientA = await createClient();
  await clientA.auth.signInWithPassword({ email: TEST_OWNER_EMAIL, password: TEST_OWNER_PW });

  const ideaA = await quickCaptureIdeaAction({
    title: "User A Confidential Content Strategy",
    notes: "Strictly private notes.",
  });
  assert.equal(ideaA.success, true);

  // User B signs in
  clearTestCookies();
  const clientB = await createClient();
  await clientB.auth.signInWithPassword({ email: TEST_OTHER_EMAIL, password: TEST_OTHER_PW });

  // User B reads content items
  const { items: itemsB } = await getContentItemsAction();
  const userAItemVisibleToB = itemsB.find((i) => i.id === ideaA.id);
  assert.equal(userAItemVisibleToB, undefined, "RLS must prevent User B from seeing User A's idea");

  // User B attempts to delete User A's idea -> must fail with not_found under RLS
  const deleteAttempt = await deleteContentItemAction(ideaA.id);
  assert.equal(deleteAttempt.success, false);
  assert.equal(deleteAttempt.error, "not_found", "Cannot modify or delete another user's content");

  // Cleanup
  clearTestCookies();
  await clientA.auth.signInWithPassword({ email: TEST_OWNER_EMAIL, password: TEST_OWNER_PW });
  await deleteContentItemAction(ideaA.id);
});

// ==============================================================================
// 7. Accessibility, ARIA & Static UI Contracts
// ==============================================================================
test("Static Markup & ARIA Contracts: Calendar and Ideas declare accessible semantics", () => {
  const calendarCode = fs.readFileSync(path.join(projectRoot, "src/components/calendar/CalendarView.tsx"), "utf8");
  const ideasCode = fs.readFileSync(path.join(projectRoot, "src/components/ideas/IdeasView.tsx"), "utf8");

  // Calendar accessibility
  assert.ok(
    calendarCode.includes("aria-label={t('calendar.previousMonth')}") &&
    calendarCode.includes("aria-label={t('calendar.nextMonth')}"),
    "CalendarView navigation buttons must declare accessible aria-labels"
  );
  assert.ok(
    calendarCode.includes("aria-label={t('calendar.viewPost',"),
    "CalendarView item chips must declare accessible aria-labels with title"
  );
  assert.ok(
    calendarCode.includes("hidden md:block") && calendarCode.includes("block md:hidden"),
    "CalendarView must declare responsive desktop 7-column grid and mobile agenda contracts"
  );

  // Ideas tab navigation accessibility
  assert.ok(
    ideasCode.includes('role="tablist"') &&
    ideasCode.includes('role="tab"') &&
    ideasCode.includes('role="tabpanel"'),
    "IdeasView must declare complete ARIA tab semantics"
  );
  assert.ok(
    ideasCode.includes("aria-selected=") &&
    ideasCode.includes("aria-controls="),
    "IdeasView tabs must declare aria-selected and aria-controls"
  );
  assert.ok(
    ideasCode.includes("aria-label={t('ideas.planIdeaAria',"),
    "Plan this idea button must declare accessible aria-label with idea title"
  );
  assert.ok(
    ideasCode.includes('id="quick-capture-submit-btn"'),
    "Quick capture submit button must have stable id"
  );
  assert.ok(
    ideasCode.includes("disabled={isCapturing"),
    "Quick capture must disable submit controls during submission to prevent duplicates"
  );
});
