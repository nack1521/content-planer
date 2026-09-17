import type { ProductionTask, TaskStatus, TaskPriority, TaskType, Locale } from '@/types/planner';

export const TASK_PAGE_SIZE = 25;

export type TaskSortKey =
  | 'title'
  | 'status'
  | 'priority'
  | 'type'
  | 'dueDate'
  | 'content';

export type TaskSort = { key: TaskSortKey; direction: 'asc' | 'desc' };

const STATUS_ORDER: TaskStatus[] = ['not_started', 'in_progress', 'done'];
const PRIORITY_ORDER: TaskPriority[] = ['low', 'medium', 'high'];
const TYPE_ORDER: TaskType[] = ['video', 'photo', 'post', 'other'];

function sortValue(task: ProductionTask, key: TaskSortKey): string | number | null {
  switch (key) {
    case 'title':
      return task.title;
    case 'status':
      return STATUS_ORDER.indexOf(task.status);
    case 'priority':
      return task.priority ? PRIORITY_ORDER.indexOf(task.priority) : null;
    case 'type':
      return task.task_type ? TYPE_ORDER.indexOf(task.task_type) : null;
    case 'dueDate':
      return task.due_date ? Date.parse(task.due_date) : null;
    case 'content':
      return task.content_item?.title ?? null;
  }
}

export function sortTasks(tasks: ProductionTask[], sort: TaskSort | null, locale: Locale): ProductionTask[] {
  if (!sort) return tasks;

  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
  return tasks
    .map((task, index) => ({ task, index, value: sortValue(task, sort.key) }))
    .sort((a, b) => {
      // Missing values stay at the end in both directions.
      if (a.value == null) return b.value == null ? a.index - b.index : 1;
      if (b.value == null) return -1;

      const comparison = typeof a.value === 'number' && typeof b.value === 'number'
        ? a.value - b.value
        : collator.compare(String(a.value), String(b.value));
      return comparison === 0 ? a.index - b.index : comparison * (sort.direction === 'asc' ? 1 : -1);
    })
    .map(({ task }) => task);
}

export function getTaskPage(tasks: ProductionTask[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(tasks.length / TASK_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.trunc(requestedPage) || 1), totalPages);
  const start = (page - 1) * TASK_PAGE_SIZE;
  return {
    tasks: tasks.slice(start, start + TASK_PAGE_SIZE),
    page,
    totalPages,
    start: tasks.length ? start + 1 : 0,
    end: Math.min(start + TASK_PAGE_SIZE, tasks.length),
  };
}

export function toggleTaskSort(current: TaskSort | null, key: TaskSortKey): TaskSort {
  return {
    key,
    direction: current?.key === key && current.direction === "asc" ? "desc" : "asc",
  };
}

export function resolveMobileTaskSort(value: string): TaskSort | null {
  if (value === "default") return null;
  return { key: value as TaskSortKey, direction: "asc" };
}
