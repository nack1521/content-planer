/**
 * Shared pure functions for parsing and formatting hashtags.
 */

export function parseHashtags(hashtagsStr: string | null | undefined): string[] {
  if (!hashtagsStr) return [];
  return hashtagsStr
    .split(/[,\s]+/)
    .map((h) => h.trim().replace(/^#+/, ''))
    .filter((h) => h.length > 0)
    .map((h) => `#${h}`);
}

export function formatHashtags(hashtagsStr: string | null | undefined): string {
  return parseHashtags(hashtagsStr).join(' ');
}
