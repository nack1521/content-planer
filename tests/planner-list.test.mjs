import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlannerPage, PLANNER_PAGE_SIZE, sortPlannerItems } from '../src/utils/plannerList.ts';

const item = (id, overrides = {}) => ({
  id,
  title: id,
  platforms: ['tiktok'],
  pillar: undefined,
  format: null,
  goal: null,
  status: 'idea',
  progress: 0,
  publish_at: null,
  ...overrides,
});

test('planner sorting toggles numeric-aware title order without mutating the fetched order', () => {
  const original = [item('a', { title: 'Content 10' }), item('b', { title: 'Content 2' }), item('c', { title: 'Content 1' })];
  assert.deepEqual(sortPlannerItems(original, null, 'en').map(x => x.id), ['a', 'b', 'c']);
  assert.deepEqual(sortPlannerItems(original, { key: 'title', direction: 'asc' }, 'en').map(x => x.id), ['c', 'b', 'a']);
  assert.deepEqual(sortPlannerItems(original, { key: 'title', direction: 'desc' }, 'en').map(x => x.id), ['a', 'b', 'c']);
  assert.deepEqual(original.map(x => x.id), ['a', 'b', 'c']);
});

test('planner columns sort by their displayed field, with missing values last', () => {
  const records = [
    item('later', { platforms: ['youtube'], pillar: { name_en: 'Zebra', name_th: 'กอ' }, format: 'story', goal: 'growth', status: 'published', progress: 80, publish_at: '2026-09-20T10:00:00Z' }),
    item('earlier', { platforms: ['instagram'], pillar: { name_en: 'Apple', name_th: 'ขอ' }, format: 'photo', goal: 'awareness', status: 'researching', progress: 20, publish_at: '2026-09-10T10:00:00Z' }),
    item('missing', { platforms: ['tiktok'], status: 'idea', progress: 0 }),
  ];
  const ids = (key, direction = 'asc', locale = 'en') => sortPlannerItems(records, { key, direction }, locale).map(x => x.id);
  assert.deepEqual(ids('platform'), ['earlier', 'missing', 'later']);
  assert.deepEqual(ids('pillar'), ['earlier', 'later', 'missing']);
  assert.deepEqual(ids('pillar', 'asc', 'th'), ['later', 'earlier', 'missing']);
  assert.deepEqual(ids('formatGoal'), ['earlier', 'later', 'missing']);
  assert.deepEqual(ids('schedule'), ['earlier', 'later', 'missing']);
  assert.deepEqual(ids('schedule', 'desc'), ['later', 'earlier', 'missing']);
  assert.deepEqual(ids('status'), ['missing', 'earlier', 'later']);
  assert.deepEqual(ids('progress', 'desc'), ['later', 'earlier', 'missing']);
});

test('equal sort values retain fetched order', () => {
  const records = [item('first', { progress: 50 }), item('second', { progress: 50 }), item('third', { progress: 10 })];
  assert.deepEqual(sortPlannerItems(records, { key: 'progress', direction: 'asc' }, 'en').map(x => x.id), ['third', 'first', 'second']);
});

test('planner pages contain 25 items and clamp after records shrink', () => {
  const records = Array.from({ length: 159 }, (_, index) => item(String(index + 1)));
  assert.equal(PLANNER_PAGE_SIZE, 25);
  const first = getPlannerPage(records, 1);
  assert.deepEqual([first.items.length, first.start, first.end, first.totalPages], [25, 1, 25, 7]);
  const second = getPlannerPage(records, 2);
  assert.deepEqual([second.items.length, second.start, second.end], [25, 26, 50]);
  const last = getPlannerPage(records, 7);
  assert.deepEqual([last.items.length, last.start, last.end], [9, 151, 159]);
  assert.equal(getPlannerPage(records.slice(0, 3), 7).page, 1);
  assert.equal(getPlannerPage([], 1).start, 0);
});
