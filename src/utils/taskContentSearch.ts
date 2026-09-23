import type { ContentItem, Locale } from '@/types/planner';

export interface ContentSearchMatch {
  item: ContentItem;
  rank: number; // 1 = exact source_number, 2 = prefix source_number, 3 = exact title, 4 = prefix title, 5 = substring title, 6 = keyword
  originalIndex: number;
}

const STATUS_KEYWORDS: Record<string, { en: string; th: string }> = {
  idea: { en: 'idea', th: 'ไอเดีย' },
  researching: { en: 'researching', th: 'ค้นคว้า' },
  scripting: { en: 'scripting', th: 'เขียนสคริปต์' },
  recording: { en: 'recording', th: 'ถ่ายทำ' },
  editing: { en: 'editing', th: 'ตัดต่อ' },
  reviewing: { en: 'reviewing', th: 'ตรวจสอบ' },
  scheduled: { en: 'scheduled', th: 'จัดตารางแล้ว' },
  published: { en: 'published', th: 'เผยแพร่แล้ว' },
};

const FORMAT_KEYWORDS: Record<string, { en: string; th: string }> = {
  short: { en: 'short', th: 'วิดีโอสั้น' },
  carousel: { en: 'carousel', th: 'ภาพชุด' },
  long: { en: 'long', th: 'วิดีโอยาว' },
  infographic: { en: 'infographic', th: 'อินโฟกราฟิก' },
  story: { en: 'story', th: 'สตอรี่' },
  photo: { en: 'photo', th: 'รูปภาพ' },
};

/**
 * Filter and rank already-loaded content items client-side.
 *
 * Ranking hierarchy:
 * 1. Source-number exact match (e.g. query "12" or "#12" matches source_number === 12)
 * 2. Source-number prefix match (e.g. query "1" or "#1" matches source_number 10, 12, etc.)
 * 3. Title exact match (case-insensitive)
 * 4. Title prefix match (case-insensitive)
 * 5. Title substring match (case-insensitive)
 * 6. Keyword text match (hook, objective, caption, notes, production_detail, hashtags, status, format, platforms)
 *
 * If no search text is entered, the predictable original order of items is preserved.
 * Ties within the same ranking tier are preserved by original item index.
 */
export function filterAndRankContentItems(
  items: ContentItem[],
  query: string,
  locale?: Locale
): ContentItem[] {
  if (!query || !query.trim()) {
    return [...items];
  }

  const rawQuery = query.trim().toLowerCase();
  const numQueryStr = rawQuery.startsWith('#') ? rawQuery.slice(1).trim() : rawQuery;
  const isNumeric = numQueryStr.length > 0 && /^\d+$/.test(numQueryStr);
  const targetNum = isNumeric ? parseInt(numQueryStr, 10) : null;

  const matches: ContentSearchMatch[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const sourceNum = item.source_number;
    const sourceNumStr = sourceNum != null ? String(sourceNum) : null;
    const titleLower = (item.title || '').toLowerCase();

    // 1. Source-number exact match
    if (targetNum !== null && sourceNum === targetNum) {
      matches.push({ item, rank: 1, originalIndex: i });
      continue;
    }

    // 2. Source-number prefix match
    if (isNumeric && sourceNumStr !== null && sourceNumStr.startsWith(numQueryStr)) {
      matches.push({ item, rank: 2, originalIndex: i });
      continue;
    }

    // 3. Title exact match
    if (titleLower === rawQuery || (isNumeric && titleLower === numQueryStr)) {
      matches.push({ item, rank: 3, originalIndex: i });
      continue;
    }

    // 4. Title prefix match
    if (titleLower.startsWith(rawQuery) || (isNumeric && titleLower.startsWith(numQueryStr))) {
      matches.push({ item, rank: 4, originalIndex: i });
      continue;
    }

    // 5. Title substring match
    if (titleLower.includes(rawQuery) || (isNumeric && titleLower.includes(numQueryStr))) {
      matches.push({ item, rank: 5, originalIndex: i });
      continue;
    }

    // 6. Thai / English keyword text match
    const keywords: (string | null | undefined)[] = [
      item.hook,
      item.objective,
      item.caption,
      item.notes,
      item.production_detail,
      item.status,
      item.format,
      ...(item.hashtags || []),
      ...(item.platforms || []),
    ];

    if (item.pillar) {
      keywords.push(item.pillar.name_en);
      keywords.push(item.pillar.name_th);
      if (locale === 'th' && item.pillar.name_th) {
        keywords.push(item.pillar.name_th);
      }
    }

    if (item.status && STATUS_KEYWORDS[item.status]) {
      keywords.push(STATUS_KEYWORDS[item.status].en);
      keywords.push(STATUS_KEYWORDS[item.status].th);
    }

    if (item.format && FORMAT_KEYWORDS[item.format]) {
      keywords.push(FORMAT_KEYWORDS[item.format].en);
      keywords.push(FORMAT_KEYWORDS[item.format].th);
    }

    let hasKeywordMatch = false;
    for (const kw of keywords) {
      if (kw) {
        const kwLower = kw.toLowerCase();
        if (kwLower.includes(rawQuery) || (isNumeric && kwLower.includes(numQueryStr))) {
          hasKeywordMatch = true;
          break;
        }
      }
    }

    if (hasKeywordMatch) {
      matches.push({ item, rank: 6, originalIndex: i });
    }
  }

  // Sort by rank ascending, then by originalIndex ascending (stable sort)
  matches.sort((a, b) => {
    if (a.rank !== b.rank) {
      return a.rank - b.rank;
    }
    return a.originalIndex - b.originalIndex;
  });

  return matches.map((m) => m.item);
}

/**
 * Format a content item label for display in input or headers.
 */
export function formatContentItemLabel(item: ContentItem): string {
  if (item.source_number != null) {
    return `[#${item.source_number}] ${item.title}`;
  }
  return item.title;
}
