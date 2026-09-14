/**
 * Explicit timezone utilities for Asia/Bangkok (UTC+7).
 * Asia/Bangkok does not observe Daylight Saving Time.
 */

export const BANGKOK_TIMEZONE = "Asia/Bangkok";

/**
 * Converts a Bangkok date string (YYYY-MM-DD) and optional time string (HH:mm)
 * to an absolute UTC ISO string.
 */
export function bangkokToUtc(dateStr: string, timeStr?: string | null): string {
  if (!dateStr) return "";
  const cleanDate = dateStr.trim();
  const cleanTime = timeStr && timeStr.trim() ? timeStr.trim() : "00:00";
  // Bangkok is UTC+07:00
  const bangkokIso = `${cleanDate}T${cleanTime}:00+07:00`;
  const date = new Date(bangkokIso);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid Bangkok date/time format: ${dateStr} ${timeStr}`);
  }
  return date.toISOString();
}

/**
 * Extracts YYYY-MM-DD and HH:mm parts in Asia/Bangkok from a UTC ISO string.
 */
export function utcToBangkokParts(isoStr: string | null | undefined): { date: string; time: string } {
  if (!isoStr) return { date: "", time: "" };
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return { date: "", time: "" };

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  let year = "", month = "", day = "", hour = "00", minute = "00";
  for (const part of parts) {
    if (part.type === "year") year = part.value;
    if (part.type === "month") month = part.value;
    if (part.type === "day") day = part.value;
    if (part.type === "hour") hour = part.value;
    if (part.type === "minute") minute = part.value;
  }

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

/**
 * Formats a timestamp in Asia/Bangkok timezone.
 * When publishTimeKnown is false, displays date-only without arbitrary times.
 */
export function formatBangkokDate(
  isoStr: string | null | undefined,
  publishTimeKnown: boolean = true,
  locale: string = "th"
): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";

  const intlLocale = locale === "th" ? "th-TH" : "en-US";

  if (!publishTimeKnown) {
    return new Intl.DateTimeFormat(intlLocale, {
      timeZone: BANGKOK_TIMEZONE,
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  }

  return new Intl.DateTimeFormat(intlLocale, {
    timeZone: BANGKOK_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
