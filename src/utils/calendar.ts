/**
 * Pure Bangkok Calendar Utilities (Asia/Bangkok, UTC+7).
 * Asia/Bangkok does not observe Daylight Saving Time.
 */

import type { ContentItem } from "@/types/planner";
import { utcToBangkokParts, BANGKOK_TIMEZONE } from "@/utils/timezone";

export { BANGKOK_TIMEZONE };

export interface CalendarGridDay {
  dateString: string; // "YYYY-MM-DD"
  dayNumber: number; // 1-31
  isCurrentMonth: boolean;
  isToday: boolean;
  year: number;
  month: number; // 1-12
}

/**
 * Returns the current year and 1-based month in Asia/Bangkok.
 */
export function getCurrentBangkokYearMonth(now: Date = new Date()): { year: number; month: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  let year = 0;
  let month = 0;
  for (const part of parts) {
    if (part.type === "year") year = parseInt(part.value, 10);
    if (part.type === "month") month = parseInt(part.value, 10);
  }
  return { year, month };
}

/**
 * Returns current date string "YYYY-MM-DD" in Asia/Bangkok.
 */
export function getCurrentBangkokDate(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  let year = "";
  let month = "";
  let day = "";
  for (const part of parts) {
    if (part.type === "year") year = part.value;
    if (part.type === "month") month = part.value;
    if (part.type === "day") day = part.value;
  }
  return `${year}-${month}-${day}`;
}

/**
 * Returns previous month { year, month } with boundary wrap from January to December of previous year.
 */
export function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  if (month <= 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

/**
 * Returns next month { year, month } with boundary wrap from December to January of next year.
 */
export function getNextMonth(year: number, month: number): { year: number; month: number } {
  if (month >= 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

/**
 * Returns true if year is a Gregorian leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the exact number of days in the given month (1-12) for the given year.
 */
export function getDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Expected 1-12.`);
  }
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }
  return 31;
}

/**
 * Returns the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * for the 1st day of the given year and month.
 */
export function getFirstDayOfWeek(year: number, month: number): number {
  // Calendar date YYYY-MM-01 is identical across UTC calculations
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.getUTCDay();
}

/**
 * Builds a 7-column month grid starting on Sunday (0) with preceding padding days
 * from the previous month and following padding days from the next month.
 */
export function getMonthGrid(
  year: number,
  month: number,
  referenceDate: Date = new Date()
): CalendarGridDay[] {
  const daysInCurMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month); // 0 = Sunday
  const todayDateString = getCurrentBangkokDate(referenceDate);

  const prev = getPreviousMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(prev.year, prev.month);

  const grid: CalendarGridDay[] = [];

  // 1. Padding days from previous month (fill Sunday up to firstDay)
  for (let i = firstDay - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const dateStr = `${prev.year}-${String(prev.month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    grid.push({
      dateString: dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayDateString,
      year: prev.year,
      month: prev.month,
    });
  }

  // 2. Current month days
  for (let dayNum = 1; dayNum <= daysInCurMonth; dayNum++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    grid.push({
      dateString: dateStr,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: dateStr === todayDateString,
      year,
      month,
    });
  }

  // 3. Padding days from next month to complete the 7-day row(s)
  const next = getNextMonth(year, month);
  const remainder = grid.length % 7;
  const paddingNeeded = remainder === 0 ? 0 : 7 - remainder;

  for (let dayNum = 1; dayNum <= paddingNeeded; dayNum++) {
    const dateStr = `${next.year}-${String(next.month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    grid.push({
      dateString: dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayDateString,
      year: next.year,
      month: next.month,
    });
  }

  return grid;
}

/**
 * Filters items for non-archived, scheduled content falling strictly within the specified
 * Bangkok year and month. Groups matching items by Bangkok date string "YYYY-MM-DD".
 *
 * Rules:
 * - Excludes archived records (archived_at !== null)
 * - Excludes unscheduled records (publish_at === null or empty)
 * - Groups by Bangkok calendar date (using utcToBangkokParts), never UTC or browser local time
 * - Sorts items per day: date-only items first, then by time ascending, then title
 */
export function filterAndGroupCalendarContent(
  items: ContentItem[],
  year: number,
  month: number
): Map<string, ContentItem[]> {
  const grouped = new Map<string, ContentItem[]>();

  const targetPrefix = `${year}-${String(month).padStart(2, "0")}-`;

  for (const item of items) {
    // 1. Must not be archived
    if (item.archived_at) continue;

    // 2. Must have a scheduled publish_at
    if (!item.publish_at) continue;

    // 3. Group by Bangkok calendar date
    const { date } = utcToBangkokParts(item.publish_at);
    if (!date) continue;

    // 4. Must fall inside selected year and month
    if (!date.startsWith(targetPrefix)) continue;

    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(item);
  }

  // Sort items within each day
  for (const dayItems of grouped.values()) {
    dayItems.sort((a, b) => {
      // Date-only items (publish_time_known === false) come first
      if (!a.publish_time_known && b.publish_time_known) return -1;
      if (a.publish_time_known && !b.publish_time_known) return 1;

      // Both have time or both date-only: compare Bangkok time
      const timeA = utcToBangkokParts(a.publish_at).time || "";
      const timeB = utcToBangkokParts(b.publish_at).time || "";
      if (timeA !== timeB) return timeA.localeCompare(timeB);

      return a.title.localeCompare(b.title);
    });
  }

  return grouped;
}

/**
 * Formats a localized Month and Year header string in Asia/Bangkok.
 */
export function formatMonthYearHeader(year: number, month: number, locale: string = "th"): string {
  // Construct Date for mid-month to avoid any boundary edge
  const d = new Date(Date.UTC(year, month - 1, 15, 12, 0, 0));
  const intlLocale = locale === "th" ? "th-TH" : "en-US";
  return new Intl.DateTimeFormat(intlLocale, {
    timeZone: BANGKOK_TIMEZONE,
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * Weekday column labels starting on Sunday (0..6).
 */
export const WEEKDAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_LABELS_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export function getWeekdayLabels(locale: string = "th"): string[] {
  return locale === "th" ? WEEKDAY_LABELS_TH : WEEKDAY_LABELS_EN;
}
