'use client';

import React, { useState, useTransition, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ProductionTask,
  TaskStatus,
  TaskPriority,
  TaskType,
  ContentItem,
  ContentPillar,
} from '@/types/planner';
import {
  getTasksAction,
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
  TaskInput,
} from '@/app/actions/tasks';
import {
  getContentItemsAction,
  getContentPillarsAction,
  updateContentItemAction,
  deleteContentItemAction,
  duplicateContentItemAction,
  archiveContentItemAction,
  ContentItemInput,
} from '@/app/actions/content';
import { useLocale } from '@/context/LocaleContext';
import { getLocalizedErrorMessage } from '@/utils/errors';
import { RecordModal } from '@/components/planner/RecordModal';
import {
  IconPlus,
  IconCheck,
  IconSearch,
  IconSparkles,
} from '@/components/common/Icons';
import { getTaskPage, sortTasks, toggleTaskSort, resolveMobileTaskSort, type TaskSort, type TaskSortKey } from '@/utils/taskList';

const ALL_STATUSES: TaskStatus[] = ['not_started', 'in_progress', 'done'];
const ALL_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];
const ALL_TYPES: TaskType[] = ['video', 'photo', 'post', 'other'];

interface TasksViewProps {
  initialTasks?: ProductionTask[];
  initialContentItems?: ContentItem[];
  initialPillars?: ContentPillar[];
  initialError?: string | null;
}

export function TasksView({
  initialTasks,
  initialContentItems,
  initialPillars,
  initialError,
}: TasksViewProps) {
  const { t, locale } = useLocale();

  const [tasks, setTasks] = useState<ProductionTask[]>(initialTasks ?? []);
  const [contentItems, setContentItems] = useState<ContentItem[]>(initialContentItems ?? []);
  const [pillars, setPillars] = useState<ContentPillar[]>(initialPillars ?? []);
  const [fetchError, setFetchError] = useState<string | null>(initialError ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialTasks && !initialError);

  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tasksRes, itemsRes, pillarsRes] = await Promise.all([
        getTasksAction(),
        getContentItemsAction(),
        getContentPillarsAction(),
      ]);
      if (tasksRes.error || itemsRes.error) {
        setFetchError(tasksRes.error || itemsRes.error || 'failed_to_load');
      } else {
        setTasks(tasksRes.tasks);
        setContentItems(itemsRes.items);
        setPillars(pillarsRes.pillars);
        setFetchError(null);
      }
    } catch {
      setFetchError('service_error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (initialTasks === undefined && !initialError) {
      Promise.all([
        getTasksAction(),
        getContentItemsAction(),
        getContentPillarsAction(),
      ]).then(([tasksRes, itemsRes, pillarsRes]) => {
        if (!isMounted) return;
        if (tasksRes.error || itemsRes.error) {
          setFetchError(tasksRes.error || itemsRes.error || 'failed_to_load');
        } else {
          setTasks(tasksRes.tasks);
          setContentItems(itemsRes.items);
          setPillars(pillarsRes.pillars);
          setFetchError(null);
        }
        setIsLoading(false);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [initialTasks, initialError]);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dueDateFilter, setDueDateFilter] = useState<string>("all");

  const [sort, setSort] = useState<TaskSort | null>(null);
  const [requestedPage, setRequestedPage] = useState(1);
  const resultsRef = useRef<HTMLDivElement>(null);


  // Task Dialog State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProductionTask | null>(null);

  // Content Record Modal State (for opening related content)
  const [selectedContentItem, setSelectedContentItem] = useState<ContentItem | null>(null);

  // Focus management & containment for task modal
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const taskTitleInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formStatus, setFormStatus] = useState<TaskStatus>('not_started');
  const [formPriority, setFormPriority] = useState<TaskPriority>('medium');
  const [formType, setFormType] = useState<TaskType>('video');
  const [formDueDate, setFormDueDate] = useState('');
  const [formContentId, setFormContentId] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Focus trap & Escape key handling
  useEffect(() => {
    if (!modalOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    taskTitleInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalOpen(false);
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [modalOpen]);

  const handleOpenCreate = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormStatus('not_started');
    setFormPriority('medium');
    setFormType('video');
    setFormDueDate('');
    setFormContentId('');
    setFormDesc('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (task: ProductionTask) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormStatus(task.status);
    setFormPriority(task.priority || 'medium');
    setFormType(task.task_type || 'video');
    setFormDueDate(task.due_date || '');
    setFormContentId(task.content_item_id || '');
    setFormDesc(task.description || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTask(null);
    setFormError(null);
  };

  const handleOpenContentRecord = (contentItemId: string) => {
    const found = contentItems.find((c) => c.id === contentItemId);
    if (found) {
      setSelectedContentItem(found);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError(t('tasks.errors.titleRequired'));
      return;
    }

    startTransition(async () => {
      const payload: TaskInput = {
        title: formTitle.trim(),
        status: formStatus,
        priority: formPriority,
        task_type: formType,
        due_date: formDueDate ? formDueDate : null,
        description: formDesc.trim() || null,
        content_item_id: formContentId ? formContentId : null,
      };

      if (editingTask) {
        const res = await updateTaskAction(editingTask.id, payload);
        if (!res.success) {
          setFormError(getLocalizedErrorMessage(t, res.error));
          return;
        }
      } else {
        const res = await createTaskAction(payload);
        if (!res.success) {
          setFormError(getLocalizedErrorMessage(t, res.error));
          return;
        }
      }

      handleCloseModal();
      await loadData();
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('tasks.confirmDelete'))) return;
    startTransition(async () => {
      const res = await deleteTaskAction(id);
      if (res.success) {
        handleCloseModal();
        await loadData();
      } else {
        setFormError(getLocalizedErrorMessage(t, res.error));
      }
    });
  };

  const handleToggleDone = async (task: ProductionTask) => {
    const nextStatus: TaskStatus = task.status === 'done' ? 'not_started' : 'done';
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );
    const res = await updateTaskAction(task.id, { status: nextStatus });
    if (!res.success) {
      await loadData();
    }
  };

  // Content Record Handlers (when opened from Tasks)
  const handleSaveContentItem = async (data: ContentItemInput) => {
    if (selectedContentItem) {
      const res = await updateContentItemAction(selectedContentItem.id, data);
      if (!res.success) throw new Error(res.error || "save_failed");
    }
    await loadData();
  };

  const handleDeleteContentItem = async (id: string) => {
    const res = await deleteContentItemAction(id);
    if (!res.success) throw new Error(res.error || "save_failed");
    await loadData();
  };

  const handleDuplicateContentItem = async (id: string) => {
    const res = await duplicateContentItemAction(id, locale);
    if (!res.success) throw new Error(res.error || "save_failed");
    await loadData();
  };

  const handleToggleArchiveContentItem = async (id: string, archive: boolean) => {
    const res = await archiveContentItemAction(id, archive);
    if (!res.success) throw new Error(res.error || "save_failed");
    await loadData();
  };

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    // Current Bangkok date YYYY-MM-DD
    const todayBkk = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());

    // End of week (Sunday) in Bangkok
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday
    const daysUntilEndOfWeek = (7 - dayOfWeek) % 7;
    const endOfWeekDate = new Date(now.getTime() + daysUntilEndOfWeek * 24 * 60 * 60 * 1000);
    const endOfWeekBkk = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(endOfWeekDate);

    return tasks.filter((task) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = task.description?.toLowerCase().includes(q) || false;
        const matchItem = task.content_item?.title.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchDesc && !matchItem) return false;
      }

      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (typeFilter !== 'all' && task.task_type !== typeFilter) return false;

      // Due date filtering
      if (dueDateFilter === 'overdue') {
        if (!task.due_date || task.due_date >= todayBkk || task.status === 'done') {
          return false;
        }
      } else if (dueDateFilter === 'today') {
        if (task.due_date !== todayBkk) return false;
      } else if (dueDateFilter === 'this_week') {
        if (!task.due_date || task.due_date < todayBkk || task.due_date > endOfWeekBkk) {
          return false;
        }
      } else if (dueDateFilter === 'no_due_date') {
        if (task.due_date) return false;
      }

      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter, typeFilter, dueDateFilter]);

  const sortedTasks = useMemo(() => sortTasks(filteredTasks, sort, locale), [filteredTasks, sort, locale]);
  const pageData = getTaskPage(sortedTasks, requestedPage);


  const handleSort = (key: TaskSortKey) => {
    setSort((current) => toggleTaskSort(current, key));
    setRequestedPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setRequestedPage(newPage);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const sortButton = (key: TaskSortKey, label: string) => {
    const active = sort?.key === key;
    const nextDirection = active && sort.direction === "asc" ? "desc" : "asc";
    return (
      <button
        type="button"
        onClick={() => handleSort(key)}
        aria-label={t("table.sortBy", {
          column: label,
          direction: nextDirection === "asc" ? t("table.sortAscending") : t("table.sortDescending"),
        })}
        className="inline-flex min-h-9 items-center gap-1.5 text-left hover:text-purple-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 cursor-pointer"
      >
        <span>{label}</span>
        <span aria-hidden="true" className={active ? "text-purple-700" : "text-slate-400"}>
          {active ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    );
  };

  const ariaSort = (key: TaskSortKey): "ascending" | "descending" | undefined =>
    sort?.key === key ? (sort.direction === "asc" ? "ascending" : "descending") : undefined;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t('tasks.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {t('tasks.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" size={16} />
          <span>{t('tasks.newTask')}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <IconSearch className="w-4 h-4" size={16} />
            </div>
            <label htmlFor="task-search-input" className="sr-only">
              {t('filters.searchPlaceholder')}
            </label>
            <input
              id="task-search-input"
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setRequestedPage(1); }}
              placeholder={t('filters.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <label htmlFor="task-status-filter" className="sr-only">
              {t('tasks.allStatuses')}
            </label>
            <select
              id="task-status-filter"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setRequestedPage(1); }}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">{t('tasks.allStatuses')}</option>
              {ALL_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {t(`tasks.status.${st}`)}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <label htmlFor="task-priority-filter" className="sr-only">
              {t('tasks.allPriorities')}
            </label>
            <select
              id="task-priority-filter"
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setRequestedPage(1); }}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">{t('tasks.allPriorities')}</option>
              {ALL_PRIORITIES.map((pr) => (
                <option key={pr} value={pr}>
                  {t(`tasks.priority.${pr}`)}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <label htmlFor="task-type-filter" className="sr-only">
              {t('tasks.allTypes')}
            </label>
            <select
              id="task-type-filter"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setRequestedPage(1); }}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">{t('tasks.allTypes')}</option>
              {ALL_TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {t(`tasks.type.${tp}`)}
                </option>
              ))}
            </select>

            {/* Due Date Filter */}
            <label htmlFor="task-due-date-filter" className="sr-only">
              {t('tasks.filterDue.label')}
            </label>
            <select
              id="task-due-date-filter"
              value={dueDateFilter}
              onChange={(e) => { setDueDateFilter(e.target.value); setRequestedPage(1); }}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">{t('tasks.filterDue.all')}</option>
              <option value="overdue">{t('tasks.filterDue.overdue')}</option>
              <option value="today">{t('tasks.filterDue.today')}</option>
              <option value="this_week">{t('tasks.filterDue.thisWeek')}</option>
              <option value="no_due_date">{t('tasks.filterDue.noDueDate')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
          {t('tasks.loading')}
        </div>
      ) : fetchError ? (
        <div className="py-12 px-6 text-center bg-white rounded-xl border border-rose-200 shadow-sm max-w-lg mx-auto my-8 space-y-3">
          <p className="text-sm font-semibold text-rose-600">
            {getLocalizedErrorMessage(t, fetchError)}
          </p>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
          >
            {t('tasks.retry')}
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-16 px-6 text-center bg-white rounded-xl border border-slate-200 shadow-sm max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-4 border border-slate-200">
            <IconSparkles className="w-6 h-6" size={24} />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            {t('tasks.empty')}
          </h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            {t('tasks.emptyDescription')}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            {t('tasks.newTask')}
          </button>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 px-6 text-center bg-white rounded-xl border border-slate-200 shadow-sm max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4 border border-purple-100">
            <IconSearch className="w-6 h-6" size={24} />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            {t('empty.filteredTitle')}
          </h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            {t('empty.filteredDescription')}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setPriorityFilter('all');
              setTypeFilter('all');
              setDueDateFilter('all');
            }}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors cursor-pointer"
          >
            {t('empty.resetFilterBtn')}
          </button>
        </div>
      ) : (
        <div ref={resultsRef} className="space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-600 px-1">
            <span>
              {t('tasks.pageRange', { start: pageData.start, end: pageData.end, total: filteredTasks.length })}
            </span>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th scope="col" className="py-3 px-4 w-10">
                      <span className="sr-only">{t('tasks.fields.status')}</span>
                    </th>
                    <th scope="col" aria-sort={ariaSort('title')} className="py-3 px-4">
                      {sortButton('title', t('tasks.fields.title'))}
                    </th>
                    <th scope="col" aria-sort={ariaSort('status')} className="py-3 px-4">
                      {sortButton('status', t('tasks.fields.status'))}
                    </th>
                    <th scope="col" aria-sort={ariaSort('priority')} className="py-3 px-4">
                      {sortButton('priority', t('tasks.fields.priority'))}
                    </th>
                    <th scope="col" aria-sort={ariaSort('type')} className="py-3 px-4">
                      {sortButton('type', t('tasks.fields.taskType'))}
                    </th>
                    <th scope="col" aria-sort={ariaSort('dueDate')} className="py-3 px-4">
                      {sortButton('dueDate', t('tasks.fields.dueDate'))}
                    </th>
                    <th scope="col" aria-sort={ariaSort('content')} className="py-3 px-4">
                      {sortButton('content', t('tasks.fields.linkedContent'))}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageData.tasks.map((task) => {
                    const isDone = task.status === 'done';
                    return (
                      <tr
                        key={task.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isDone ? 'opacity-60 bg-slate-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleDone(task)}
                            aria-label={isDone ? t('tasks.markIncomplete') : t('tasks.markComplete')}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                              isDone
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 hover:border-slate-400 bg-white'
                            }`}
                          >
                            {isDone && <IconCheck className="w-3.5 h-3.5" size={14} />}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(task)}
                            className="text-left font-medium text-slate-900 hover:text-purple-600 transition-colors cursor-pointer"
                          >
                            <span className={isDone ? 'line-through text-slate-500' : ''}>
                              {task.title}
                            </span>
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              task.status === 'done'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : task.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {t(`tasks.status.${task.status}`)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {task.priority ? (
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                task.priority === 'high'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : task.priority === 'medium'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-50 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {t(`tasks.priority.${task.priority}`)}
                            </span>
                          ) : (
                            <span className="text-slate-400">&mdash;</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {task.task_type ? t(`tasks.type.${task.task_type}`) : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {task.due_date || '—'}
                        </td>
                        <td className="py-3 px-4">
                          {task.content_item ? (
                            <button
                              type="button"
                              onClick={() => handleOpenContentRecord(task.content_item!.id)}
                              title={t('tasks.openContent')}
                              className="inline-flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md border border-purple-200 transition-colors cursor-pointer max-w-[220px] truncate"
                            >
                              {task.content_item.source_number ? (
                                <span className="font-mono font-bold">
                                  #{task.content_item.source_number}
                                </span>
                              ) : null}
                              <span className="truncate">{task.content_item.title}</span>
                            </button>
                          ) : (
                            <span className="text-slate-400">{t('tasks.standalone')}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="block md:hidden">
            <div className="flex items-end gap-2 mb-3">
              <div className="flex-1">
                <label htmlFor="tasks-mobile-sort" className="block text-sm font-semibold text-slate-700 mb-1">
                  {t('table.sortLabel')}
                </label>
                <select
                  id="tasks-mobile-sort"
                  value={sort?.key ?? 'default'}
                  onChange={(event) => {
                    setSort(resolveMobileTaskSort(event.target.value));
                    setRequestedPage(1);
                  }}
                  className="w-full min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-purple-600"
                >
                  <option value="default">{t('table.defaultOrder')}</option>
                  <option value="title">{t('tasks.fields.title')}</option>
                  <option value="status">{t('tasks.fields.status')}</option>
                  <option value="priority">{t('tasks.fields.priority')}</option>
                  <option value="type">{t('tasks.fields.taskType')}</option>
                  <option value="dueDate">{t('tasks.fields.dueDate')}</option>
                  <option value="content">{t('tasks.fields.linkedContent')}</option>
                </select>
              </div>
              <button
                type="button"
                disabled={!sort}
                onClick={() => sort && handleSort(sort.key)}
                aria-label={t('table.reverseSort')}
                className="min-h-10 min-w-10 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-purple-600 cursor-pointer disabled:cursor-not-allowed"
              >
                <span aria-hidden="true">{sort?.direction === 'desc' ? '↓' : '↑'}</span>
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
              {pageData.tasks.map((task) => {
                const isDone = task.status === 'done';
                return (
                  <div
                    key={task.id}
                    className={`p-4 space-y-2.5 ${isDone ? 'opacity-60 bg-slate-50/40' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleDone(task)}
                        aria-label={isDone ? t('tasks.markIncomplete') : t('tasks.markComplete')}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isDone && <IconCheck className="w-3.5 h-3.5" size={14} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(task)}
                          className="text-left font-semibold text-sm text-slate-900 hover:text-purple-600 transition-colors cursor-pointer"
                        >
                          <span className={isDone ? 'line-through text-slate-500' : ''}>
                            {task.title}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pl-8 text-xs">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          task.status === 'done'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : task.status === 'in_progress'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {t(`tasks.status.${task.status}`)}
                      </span>

                      {task.priority && (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            task.priority === 'high'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : task.priority === 'medium'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {t(`tasks.priority.${task.priority}`)}
                        </span>
                      )}

                      {task.task_type && (
                        <span className="text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {t(`tasks.type.${task.task_type}`)}
                        </span>
                      )}

                      {task.due_date && (
                        <span className="text-[11px] font-mono text-slate-500">
                          {task.due_date}
                        </span>
                      )}
                    </div>

                    {task.content_item && (
                      <div className="pl-8 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenContentRecord(task.content_item!.id)}
                          className="inline-flex items-center gap-1 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded border border-purple-200 transition-colors cursor-pointer"
                        >
                          <span className="font-bold">
                            #{task.content_item.source_number || ''}
                          </span>
                          <span className="truncate max-w-[200px]">{task.content_item.title}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {pageData.totalPages > 1 && (
            <nav aria-label={t('tasks.pagination')} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <span aria-live="polite" className="text-sm text-slate-600">
                {t('tasks.pageOf', { page: pageData.page, totalPages: pageData.totalPages })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pageData.page === 1}
                  onClick={() => handlePageChange(pageData.page - 1)}
                  className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-purple-600 cursor-pointer disabled:cursor-not-allowed"
                >
                  {t('tasks.previousPage')}
                </button>
                <button
                  type="button"
                  disabled={pageData.page === pageData.totalPages}
                  onClick={() => handlePageChange(pageData.page + 1)}
                  className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-purple-600 cursor-pointer disabled:cursor-not-allowed"
                >
                  {t('tasks.nextPage')}
                </button>
              </div>
            </nav>
          )}
        </div>
      )}

      {/* Task Creation / Editing Dialog with real Tab/Shift+Tab focus trap */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
        >
          <div
            ref={modalRef}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h2 id="task-modal-title" className="text-base font-bold text-slate-900">
                {editingTask ? t('tasks.editTask') : t('tasks.newTask')}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                aria-label={t('recordModal.close')}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none p-1 cursor-pointer"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {formError}
                </div>
              )}

              {/* Title */}
              <div className="space-y-1">
                <label htmlFor="task-title-input" className="text-xs font-semibold text-slate-700">
                  {t('tasks.fields.title')} *
                </label>
                <input
                  id="task-title-input"
                  ref={taskTitleInputRef}
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={t('tasks.fields.titlePlaceholder')}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="task-status-select" className="text-xs font-semibold text-slate-700">
                    {t('tasks.fields.status')}
                  </label>
                  <select
                    id="task-status-select"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {ALL_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {t(`tasks.status.${st}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="task-priority-select" className="text-xs font-semibold text-slate-700">
                    {t('tasks.fields.priority')}
                  </label>
                  <select
                    id="task-priority-select"
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {ALL_PRIORITIES.map((pr) => (
                      <option key={pr} value={pr}>
                        {t(`tasks.priority.${pr}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fixed Task Type Selector & Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="task-type-select" className="text-xs font-semibold text-slate-700">
                    {t('tasks.fields.taskType')}
                  </label>
                  <select
                    id="task-type-select"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as TaskType)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {ALL_TYPES.map((tp) => (
                      <option key={tp} value={tp}>
                        {t(`tasks.type.${tp}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="task-due-date-input" className="text-xs font-semibold text-slate-700">
                    {t('tasks.fields.dueDate')}
                  </label>
                  <input
                    id="task-due-date-input"
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>

              {/* Linked Content Item */}
              <div className="space-y-1">
                <label htmlFor="task-content-select" className="text-xs font-semibold text-slate-700">
                  {t('tasks.fields.linkedContent')}
                </label>
                <select
                  id="task-content-select"
                  value={formContentId}
                  onChange={(e) => setFormContentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">{t('tasks.fields.none')}</option>
                  {contentItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.source_number ? `[#${item.source_number}] ` : ''}{item.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label htmlFor="task-desc-textarea" className="text-xs font-semibold text-slate-700">
                  {t('tasks.fields.description')}
                </label>
                <textarea
                  id="task-desc-textarea"
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder={t('tasks.fields.descPlaceholder')}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {editingTask ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(editingTask.id)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {t('tasks.deleteTask')}
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    {t('tasks.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? t('common.saving') : t('tasks.save')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RecordModal for opening linked content record */}
      <RecordModal
        isOpen={!!selectedContentItem}
        item={selectedContentItem}
        pillars={pillars}
        onClose={() => setSelectedContentItem(null)}
        onSave={handleSaveContentItem}
        onDelete={handleDeleteContentItem}
        onDuplicate={handleDuplicateContentItem}
        onToggleArchive={handleToggleArchiveContentItem}
      />
    </div>
  );
}
