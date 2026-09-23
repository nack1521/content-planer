import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterAndRankContentItems,
  formatContentItemLabel,
} from '../src/utils/taskContentSearch.ts';

const makeItem = (id, overrides = {}) => ({
  id,
  title: `Title of ${id}`,
  source_number: null,
  platforms: ['tiktok'],
  content_pillar_id: null,
  format: 'short',
  goal: 'awareness',
  status: 'idea',
  progress: 0,
  publish_at: null,
  hook: null,
  caption: null,
  cta: null,
  hashtags: [],
  notes: null,
  objective: null,
  production_detail: null,
  review_status: null,
  source_content_status: null,
  publish_time_known: true,
  archived_at: null,
  created_at: '2026-09-15T00:00:00Z',
  updated_at: '2026-09-15T00:00:00Z',
  ...overrides,
});

test('empty or whitespace query preserves exact predictable default order', () => {
  const original = [
    makeItem('item-1', { source_number: 10, title: 'Alpha' }),
    makeItem('item-2', { source_number: 5, title: 'Beta' }),
    makeItem('item-3', { source_number: 20, title: 'Gamma' }),
  ];

  const resEmpty = filterAndRankContentItems(original, '');
  assert.deepEqual(resEmpty.map((x) => x.id), ['item-1', 'item-2', 'item-3']);

  const resWhitespace = filterAndRankContentItems(original, '   ');
  assert.deepEqual(resWhitespace.map((x) => x.id), ['item-1', 'item-2', 'item-3']);

  // Ensure original array was not mutated
  assert.deepEqual(original.map((x) => x.id), ['item-1', 'item-2', 'item-3']);
});

test('source-number exact and prefix matches rank before title substring matches', () => {
  const items = [
    makeItem('title-match', { title: '12 Ways to Scale Social Reach', source_number: 99 }),
    makeItem('exact-source', { title: 'Acoustic Panel Setup', source_number: 12 }),
    makeItem('prefix-source', { title: 'Studio Lighting Breakdown', source_number: 120 }),
    makeItem('other', { title: 'Unrelated Content', source_number: 50 }),
  ];

  // Query "12":
  // 1. exact-source (#12) -> Rank 1
  // 2. prefix-source (#120) -> Rank 2
  // 3. title-match ("12 Ways...") -> Rank 4 (title starts with 12) or 5
  // other does not match
  const res = filterAndRankContentItems(items, '12');
  assert.deepEqual(res.map((x) => x.id), ['exact-source', 'prefix-source', 'title-match']);
});

test('source-number match supports leading hash (#)', () => {
  const items = [
    makeItem('item-42', { title: 'Episode 42 Story', source_number: 42 }),
    makeItem('item-420', { title: 'Behind the scenes', source_number: 420 }),
    makeItem('item-7', { title: 'Review 42 items', source_number: 7 }),
  ];

  const res = filterAndRankContentItems(items, '#42');
  assert.deepEqual(res.map((x) => x.id), ['item-42', 'item-420', 'item-7']);
});

test('title exact match ranks before title prefix, which ranks before title substring', () => {
  const items = [
    makeItem('substring', { title: 'Advanced Tips for Audio Editing' }),
    makeItem('exact', { title: 'Audio' }),
    makeItem('prefix', { title: 'Audio Workflow 2026' }),
    makeItem('unrelated', { title: 'Camera Settings' }),
  ];

  const res = filterAndRankContentItems(items, 'audio');
  assert.deepEqual(res.map((x) => x.id), ['exact', 'prefix', 'substring']);
});

test('Thai and English keyword matching against hook, objective, caption, notes, and hashtags', () => {
  const items = [
    makeItem('hook-match', { title: 'Post A', hook: 'ฮุกเด็ดหยุดนิ้วคนดู' }),
    makeItem('objective-match', { title: 'Post B', objective: 'เพิ่มยอด Follower' }),
    makeItem('notes-match', { title: 'Post C', notes: 'check audio levels with mic' }),
    makeItem('caption-match', { title: 'Post D', caption: 'รายละเอียดในแคปชัน' }),
    makeItem('hashtag-match', { title: 'Post E', hashtags: ['acoustic', 'soundproof'] }),
    makeItem('no-match', { title: 'Post F' }),
  ];

  // Thai hook match
  const resThai = filterAndRankContentItems(items, 'ฮุกเด็ด');
  assert.deepEqual(resThai.map((x) => x.id), ['hook-match']);

  // English notes match
  const resNotes = filterAndRankContentItems(items, 'audio levels');
  assert.deepEqual(resNotes.map((x) => x.id), ['notes-match']);

  // Hashtag match
  const resTag = filterAndRankContentItems(items, 'soundproof');
  assert.deepEqual(resTag.map((x) => x.id), ['hashtag-match']);
});

test('localized status and format keyword matching', () => {
  const items = [
    makeItem('item-editing', { title: 'Vlog Ep 1', status: 'editing' }),
    makeItem('item-scripting', { title: 'Podcast Ep 2', status: 'scripting' }),
    makeItem('item-photo', { title: 'Thumbnail Design', format: 'photo' }),
  ];

  // Match English status name
  assert.deepEqual(filterAndRankContentItems(items, 'editing').map((x) => x.id), ['item-editing']);

  // Match Thai status name: 'ตัดต่อ' matches editing
  assert.deepEqual(filterAndRankContentItems(items, 'ตัดต่อ').map((x) => x.id), ['item-editing']);

  // Match Thai format name: 'รูปภาพ' matches photo
  assert.deepEqual(filterAndRankContentItems(items, 'รูปภาพ').map((x) => x.id), ['item-photo']);
});

test('formatContentItemLabel formats source number and title correctly', () => {
  assert.equal(
    formatContentItemLabel(makeItem('1', { source_number: 144, title: 'Final Mix' })),
    '[#144] Final Mix'
  );
  assert.equal(
    formatContentItemLabel(makeItem('2', { source_number: null, title: 'Quick Idea' })),
    'Quick Idea'
  );
});

test('returns empty array when no content items match query', () => {
  const items = [
    makeItem('1', { title: 'Intro to Notion', source_number: 1 }),
    makeItem('2', { title: 'Studio Setup', source_number: 2 }),
  ];

  const res = filterAndRankContentItems(items, 'xyznonexistent123');
  assert.deepEqual(res, []);
});

test('selection and clear resolution behaves predictably for independent and linked tasks', () => {
  const items = [
    makeItem('c-100', { source_number: 100, title: 'Item 100' }),
    makeItem('c-101', { source_number: 101, title: 'Item 101' }),
  ];

  // Helper simulating combobox state transition
  const resolveSelection = (currentId, action) => {
    if (action.type === 'select') return action.id;
    if (action.type === 'clear') return '';
    return currentId;
  };

  // Initially independent task
  let currentId = '';
  assert.equal(currentId, '');

  // Select an item
  currentId = resolveSelection(currentId, { type: 'select', id: 'c-100' });
  assert.equal(currentId, 'c-100');
  const found = items.find((x) => x.id === currentId);
  assert.equal(found?.title, 'Item 100');

  // Change to another item
  currentId = resolveSelection(currentId, { type: 'select', id: 'c-101' });
  assert.equal(currentId, 'c-101');

  // Clear selection back to independent task
  currentId = resolveSelection(currentId, { type: 'clear' });
  assert.equal(currentId, '');
  assert.equal(items.find((x) => x.id === currentId), undefined);
});
