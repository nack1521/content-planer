import test from 'node:test';
import assert from 'node:assert/strict';
import { getTaskPage, TASK_PAGE_SIZE, sortTasks, toggleTaskSort, resolveMobileTaskSort } from '../src/utils/taskList.ts';

const makeTask = (id, overrides = {}) => ({
  id,
  title: id,
  status: 'not_started',
  priority: 'medium',
  task_type: 'video',
  due_date: '2026-09-20',
  description: null,
  import_key: null,
  content_item_id: null,
  created_at: '2026-09-15T00:00:00Z',
  updated_at: '2026-09-15T00:00:00Z',
  content_item: null,
  ...overrides,
});

test('task sorting toggles numeric-aware title order without mutating the fetched order', () => {
  const original = [makeTask('a', { title: 'Task 10' }), makeTask('b', { title: 'Task 2' }), makeTask('c', { title: 'Task 1' })];
  assert.deepEqual(sortTasks(original, null, 'en').map(x => x.id), ['a', 'b', 'c']);
  assert.deepEqual(sortTasks(original, { key: 'title', direction: 'asc' }, 'en').map(x => x.id), ['c', 'b', 'a']);
  assert.deepEqual(sortTasks(original, { key: 'title', direction: 'desc' }, 'en').map(x => x.id), ['a', 'b', 'c']);
  assert.deepEqual(original.map(x => x.id), ['a', 'b', 'c']);
});

test('task columns sort by their field, with missing values last in both directions', () => {
  const records = [
    makeTask('done_high', {
      title: 'Zebra',
      status: 'done',
      priority: 'high',
      task_type: 'other',
      due_date: '2026-09-25',
      content_item: { id: 'c1', title: 'Beta Content', source_number: 2 },
    }),
    makeTask('inprog_low', {
      title: 'Apple',
      status: 'in_progress',
      priority: 'low',
      task_type: 'photo',
      due_date: '2026-09-10',
      content_item: { id: 'c2', title: 'Alpha Content', source_number: 1 },
    }),
    makeTask('missing', {
      title: 'Middle',
      status: 'not_started',
      priority: null,
      task_type: null,
      due_date: null,
      content_item: null,
    }),
  ];

  const ids = (key, direction = 'asc', locale = 'en') => sortTasks(records, { key, direction }, locale).map(x => x.id);

  // Status: not_started (0), in_progress (1), done (2)
  assert.deepEqual(ids('status', 'asc'), ['missing', 'inprog_low', 'done_high']);
  assert.deepEqual(ids('status', 'desc'), ['done_high', 'inprog_low', 'missing']);

  // Priority: low (0), medium (1), high (2); missing last
  assert.deepEqual(ids('priority', 'asc'), ['inprog_low', 'done_high', 'missing']);
  assert.deepEqual(ids('priority', 'desc'), ['done_high', 'inprog_low', 'missing']);

  // Type: video (0), photo (1), post (2), other (3); missing last
  assert.deepEqual(ids('type', 'asc'), ['inprog_low', 'done_high', 'missing']);
  assert.deepEqual(ids('type', 'desc'), ['done_high', 'inprog_low', 'missing']);

  // Due date: date order; missing last
  assert.deepEqual(ids('dueDate', 'asc'), ['inprog_low', 'done_high', 'missing']);
  assert.deepEqual(ids('dueDate', 'desc'), ['done_high', 'inprog_low', 'missing']);

  // Content: title order; missing last
  assert.deepEqual(ids('content', 'asc'), ['inprog_low', 'done_high', 'missing']);
  assert.deepEqual(ids('content', 'desc'), ['done_high', 'inprog_low', 'missing']);
});

test('equal sort values retain original fetched order', () => {
  const records = [
    makeTask('first', { priority: 'high' }),
    makeTask('second', { priority: 'high' }),
    makeTask('third', { priority: 'low' }),
  ];
  assert.deepEqual(sortTasks(records, { key: 'priority', direction: 'asc' }, 'en').map(x => x.id), ['third', 'first', 'second']);
});

test('task pages contain 25 items and clamp after records shrink', () => {
  const records = Array.from({ length: 65 }, (_, index) => makeTask(String(index + 1)));
  assert.equal(TASK_PAGE_SIZE, 25);
  const first = getTaskPage(records, 1);
  assert.deepEqual([first.tasks.length, first.start, first.end, first.totalPages], [25, 1, 25, 3]);
  const second = getTaskPage(records, 2);
  assert.deepEqual([second.tasks.length, second.start, second.end], [25, 26, 50]);
  const last = getTaskPage(records, 3);
  assert.deepEqual([last.tasks.length, last.start, last.end], [15, 51, 65]);
  assert.equal(getTaskPage(records.slice(0, 3), 7).page, 1);
  assert.equal(getTaskPage([], 1).start, 0);
});

test("task sorting toggles between asc and desc on repeated clicks, matching planner", () => {
  // Initial click from null gives asc
  let sort = toggleTaskSort(null, "title");
  assert.deepEqual(sort, { key: "title", direction: "asc" });

  // Second click switches to desc
  sort = toggleTaskSort(sort, "title");
  assert.deepEqual(sort, { key: "title", direction: "desc" });

  // Third click switches back to asc (never clears to null)
  sort = toggleTaskSort(sort, "title");
  assert.deepEqual(sort, { key: "title", direction: "asc" });

  // Fourth click switches back to desc
  sort = toggleTaskSort(sort, "title");
  assert.deepEqual(sort, { key: "title", direction: "desc" });

  // Switching to a different column starts at asc
  sort = toggleTaskSort(sort, "dueDate");
  assert.deepEqual(sort, { key: "dueDate", direction: "asc" });

  // And repeated clicks on the new column toggle asc/desc
  sort = toggleTaskSort(sort, "dueDate");
  assert.deepEqual(sort, { key: "dueDate", direction: "desc" });
  sort = toggleTaskSort(sort, "dueDate");
  assert.deepEqual(sort, { key: "dueDate", direction: "asc" });
});

test("mobile direction button switches both ways and only default order clears sort", () => {
  // Mobile select picking a key initializes asc
  let sort = resolveMobileTaskSort("priority");
  assert.deepEqual(sort, { key: "priority", direction: "asc" });

  // Mobile direction button (handleSort) switches from asc to desc
  sort = toggleTaskSort(sort, sort.key);
  assert.deepEqual(sort, { key: "priority", direction: "desc" });

  // Mobile direction button switches from desc back to asc (never clears to null)
  sort = toggleTaskSort(sort, sort.key);
  assert.deepEqual(sort, { key: "priority", direction: "asc" });

  // Repeated clicks continue toggling
  sort = toggleTaskSort(sort, sort.key);
  assert.deepEqual(sort, { key: "priority", direction: "desc" });

  // Only selecting "default" order in dropdown clears the sort
  const cleared = resolveMobileTaskSort("default");
  assert.equal(cleared, null);
});
