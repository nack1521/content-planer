import { Locale } from '@/types/planner';

export const TIMEZONE = 'Asia/Bangkok';

/**
 * Returns a localized formatted date-time string in Asia/Bangkok timezone.
 */
export function formatBangkokDateTime(
  dateString: string | null | undefined,
  locale: Locale,
  includeTime = true
): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const intlLocale = locale === 'th' ? 'th-TH' : 'en-US';

  const options: Intl.DateTimeFormatOptions = {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(includeTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }
      : {}),
  };

  const formatted = new Intl.DateTimeFormat(intlLocale, options).format(date);
  return locale === 'th' && includeTime ? `${formatted} น.` : formatted;
}

/**
 * Returns localized short date (e.g., "13 ก.ย." or "13 Sep") in Asia/Bangkok.
 */
export function formatBangkokDateShort(
  dateString: string | null | undefined,
  locale: Locale
): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const intlLocale = locale === 'th' ? 'th-TH' : 'en-US';
  return new Intl.DateTimeFormat(intlLocale, {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'short',
  }).format(date);
}

/**
 * Returns localized time (e.g., "18:00" or "18:00 น.") in Asia/Bangkok.
 */
export function formatBangkokTime(
  dateString: string | null | undefined,
  locale: Locale
): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const intlLocale = locale === 'th' ? 'th-TH' : 'en-US';
  const timeStr = new Intl.DateTimeFormat(intlLocale, {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return locale === 'th' ? `${timeStr} น.` : timeStr;
}

/**
 * Check if the date falls on "today" in Asia/Bangkok timezone.
 */
export function isTodayBangkok(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  const target = new Date(dateString);
  if (isNaN(target.getTime())) return false;

  const now = new Date();
  const getBkkDateParts = (d: Date) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    return formatter.format(d);
  };

  return getBkkDateParts(target) === getBkkDateParts(now);
}

/**
 * Check if the date falls in the current month in Asia/Bangkok timezone.
 */
export function isThisMonthBangkok(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  const target = new Date(dateString);
  if (isNaN(target.getTime())) return false;

  const now = new Date();
  const getBkkMonthYear = (d: Date) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: 'numeric',
    });
    return formatter.format(d);
  };

  return getBkkMonthYear(target) === getBkkMonthYear(now);
}
