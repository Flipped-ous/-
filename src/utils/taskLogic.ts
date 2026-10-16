import type { Task, DueCategory, PriorityLevel, BackupData } from '../types/index.ts';

/**
 * Calculates due category dynamically based on dueAt ISO string and a reference date.
 */
export function getDueCategory(task: Task, referenceDate = new Date()): DueCategory {
  if (!task.dueAt) {
    return task.dueCategory || 'none';
  }

  const dueDate = new Date(task.dueAt);
  if (isNaN(dueDate.getTime())) {
    return task.dueCategory || 'none';
  }

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  const dueYear = dueDate.getFullYear();
  const dueMonth = dueDate.getMonth();
  const dueDay = dueDate.getDate();

  const startOfRefDay = new Date(refYear, refMonth, refDay).getTime();
  const startOfDueDay = new Date(dueYear, dueMonth, dueDay).getTime();

  if (startOfDueDay < startOfRefDay) {
    return 'overdue';
  } else if (startOfDueDay === startOfRefDay) {
    return 'today';
  } else {
    return 'future';
  }
}

/**
 * Formats due label cleanly into Chinese human text based on dueAt and reference date.
 */
export function formatDueLabel(task: Task, referenceDate = new Date()): string {
  if (!task.dueAt) {
    return task.dueLabel || '无日期';
  }

  const dueDate = new Date(task.dueAt);
  if (isNaN(dueDate.getTime())) {
    return task.dueLabel || '无日期';
  }

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  const dueYear = dueDate.getFullYear();
  const dueMonth = dueDate.getMonth();
  const dueDay = dueDate.getDate();

  const startOfRefDay = new Date(refYear, refMonth, refDay).getTime();
  const startOfDueDay = new Date(dueYear, dueMonth, dueDay).getTime();

  const diffDays = Math.round((startOfDueDay - startOfRefDay) / (1000 * 60 * 60 * 24));

  const hours = dueDate.getHours().toString().padStart(2, '0');
  const minutes = dueDate.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;
  const hasSpecificTime = task.dueTime || !(hours === '00' && minutes === '00');

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return overdueDays === 1 ? '逾期 1 天' : `已逾期 ${overdueDays} 天`;
  } else if (diffDays === 0) {
    return hasSpecificTime ? `今天 ${timeStr}` : '今天';
  } else if (diffDays === 1) {
    return hasSpecificTime ? `明天 ${timeStr}` : '明天';
  } else if (diffDays === 2) {
    return hasSpecificTime ? `后天 ${timeStr}` : '后天';
  } else if (refYear === dueYear) {
    return `${dueMonth + 1}月${dueDay}日`;
  } else {
    return `${dueYear}年${dueMonth + 1}月${dueDay}日`;
  }
}

/**
 * Filters tasks by status and search text.
 */
export function filterTasks(
  tasks: Task[],
  filter: 'all' | 'pending' | 'completed',
  searchQuery = '',
  referenceDate = new Date()
): Task[] {
  const query = searchQuery.trim().toLowerCase();
  return tasks.filter((task) => {
    // Filter by status
    if (filter === 'pending' && task.status !== 'pending') return false;
    if (filter === 'completed' && task.status !== 'completed') return false;

    // Filter by search query
    if (query) {
      const matchTitle = task.title.toLowerCase().includes(query);
      const matchProject = task.project?.toLowerCase().includes(query);
      const matchTags = task.tags?.some((t) => t.toLowerCase().includes(query));
      const matchNote = task.note?.toLowerCase().includes(query);
      return matchTitle || matchProject || matchTags || matchNote;
    }
    return true;
  });
}

export interface DateGroupedTasks {
  overdue: Task[];
  today: Task[];
  future: Task[];
  none: Task[];
}

/**
 * Groups tasks into overdue, today, future, and none categories using dynamic due date.
 */
export function groupTasksByDate(tasks: Task[], referenceDate = new Date()): DateGroupedTasks {
  const groups: DateGroupedTasks = {
    overdue: [],
    today: [],
    future: [],
    none: [],
  };

  for (const task of tasks) {
    const category = getDueCategory(task, referenceDate);
    if (category === 'overdue') {
      groups.overdue.push(task);
    } else if (category === 'today') {
      groups.today.push(task);
    } else if (category === 'future') {
      groups.future.push(task);
    } else {
      groups.none.push(task);
    }
  }

  return groups;
}

export interface QuadrantTasks {
  urgentImportant: Task[]; // 重要且紧急
  importantNotUrgent: Task[]; // 重要不紧急
  urgentNotImportant: Task[]; // 紧急不重要
  neither: Task[]; // 不重要不紧急
}

/**
 * Groups tasks into Eisenhower four quadrants based on priority and dueCategory.
 */
export function groupTasksByQuadrant(tasks: Task[], referenceDate = new Date()): QuadrantTasks {
  const quadrants: QuadrantTasks = {
    urgentImportant: [],
    importantNotUrgent: [],
    urgentNotImportant: [],
    neither: [],
  };

  for (const task of tasks) {
    const category = getDueCategory(task, referenceDate);
    if (task.priority === 'urgent') {
      quadrants.urgentImportant.push(task);
    } else if (task.priority === 'important') {
      quadrants.importantNotUrgent.push(task);
    } else if (task.priority === 'normal') {
      if (category === 'today' || category === 'overdue') {
        quadrants.urgentNotImportant.push(task);
      } else {
        quadrants.neither.push(task);
      }
    } else {
      quadrants.neither.push(task);
    }
  }

  return quadrants;
}

/**
 * Calculates project statistics dynamically from the single tasks list.
 */
export function calculateProjectStats(tasks: Task[], projectId: string) {
  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  const pendingCount = projectTasks.filter((t) => t.status === 'pending').length;
  const completedCount = projectTasks.filter((t) => t.status === 'completed').length;
  const totalCount = projectTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    pendingCount,
    completedCount,
    totalCount,
    progressPercent,
    tasks: projectTasks,
  };
}

/**
 * Calculates Review statistics purely from real tasks data (no mock +2 or fictional hours).
 */
export function calculateReviewStats(tasks: Task[], referenceDate = new Date()) {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();
  const startOfRefDay = new Date(refYear, refMonth, refDay).getTime();
  const endOfRefDay = startOfRefDay + 24 * 60 * 60 * 1000;

  let completedToday = 0;
  let delayedCount = 0;
  let addedToday = 0;
  const projectEngagement: Record<string, number> = {};

  for (const task of tasks) {
    const category = getDueCategory(task, referenceDate);

    // Completed today check
    if (task.status === 'completed') {
      if (task.completedAt) {
        const completedTime = new Date(task.completedAt).getTime();
        if (!isNaN(completedTime) && completedTime >= startOfRefDay && completedTime < endOfRefDay) {
          completedToday++;
        } else if (category === 'today') {
          completedToday++;
        }
      } else if (category === 'today') {
        completedToday++;
      }
    }

    // Delayed overdue pending tasks
    if (task.status === 'pending' && category === 'overdue') {
      delayedCount++;
    }

    // Added today
    if (task.createdAt) {
      const createdTime = new Date(task.createdAt).getTime();
      if (!isNaN(createdTime) && createdTime >= startOfRefDay && createdTime < endOfRefDay) {
        addedToday++;
      }
    }

    // Project engagement
    if (category === 'today' || task.status === 'completed') {
      const projName = task.project || '无项目';
      projectEngagement[projName] = (projectEngagement[projName] || 0) + 1;
    }
  }

  // Top project
  let topProject = '今日有序';
  let maxCount = 0;
  for (const [proj, cnt] of Object.entries(projectEngagement)) {
    if (cnt > maxCount) {
      maxCount = cnt;
      topProject = proj;
    }
  }

  return {
    completed: completedToday,
    delayed: delayedCount,
    added: addedToday,
    topProject,
  };
}

/**
 * Toggles a task between pending and completed.
 */
export function toggleTask(tasks: Task[], taskId: string, now = new Date()): Task[] {
  const nowIso = now.toISOString();
  return tasks.map((task) => {
    if (task.id === taskId) {
      const isCompleted = task.status === 'completed';
      return {
        ...task,
        status: isCompleted ? 'pending' : 'completed',
        completedAt: isCompleted ? undefined : nowIso,
        updatedAt: nowIso,
      };
    }
    return task;
  });
}

/**
 * Deletes a task from the list, returning the updated list, deleted task, and original index.
 */
export function deleteTask(
  tasks: Task[],
  taskId: string
): { updatedTasks: Task[]; deletedTask: Task | null; deletedIndex: number } {
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) {
    return { updatedTasks: tasks, deletedTask: null, deletedIndex: -1 };
  }
  const deletedTask = tasks[index];
  const updatedTasks = tasks.filter((t) => t.id !== taskId);
  return { updatedTasks, deletedTask, deletedIndex: index };
}

/**
 * Restores a deleted task at its original index if possible.
 */
export function restoreTask(tasks: Task[], taskToRestore: Task, originalIndex?: number): Task[] {
  // If task already exists, don't duplicate
  if (tasks.some((t) => t.id === taskToRestore.id)) {
    return tasks;
  }
  const next = [...tasks];
  const insertIdx =
    originalIndex !== undefined && originalIndex >= 0 && originalIndex <= next.length
      ? originalIndex
      : 0;
  next.splice(insertIdx, 0, taskToRestore);
  return next;
}

/**
 * Reorders tasks by moving an item from fromIndex to toIndex.
 */
export function moveTask(tasks: Task[], fromIndex: number, toIndex: number): Task[] {
  if (
    fromIndex < 0 ||
    fromIndex >= tasks.length ||
    toIndex < 0 ||
    toIndex >= tasks.length ||
    fromIndex === toIndex
  ) {
    return tasks;
  }
  const updated = [...tasks];
  const [moved] = updated.splice(fromIndex, 1);
  updated.splice(toIndex, 0, moved);
  return updated;
}

/**
 * Changes a task's due category and updates its dueAt accordingly.
 */
export function changeTaskCategory(
  tasks: Task[],
  taskId: string,
  newCategory: DueCategory,
  referenceDate = new Date()
): Task[] {
  const now = new Date(referenceDate);
  const nowIso = now.toISOString();

  let targetDueAt: string | undefined;
  let targetLabel: string | undefined;

  if (newCategory === 'today') {
    now.setHours(18, 0, 0, 0);
    targetDueAt = now.toISOString();
    targetLabel = '今天';
  } else if (newCategory === 'future') {
    now.setDate(now.getDate() + 2);
    now.setHours(10, 0, 0, 0);
    targetDueAt = now.toISOString();
    targetLabel = '后天';
  } else if (newCategory === 'overdue') {
    now.setDate(now.getDate() - 1);
    now.setHours(18, 0, 0, 0);
    targetDueAt = now.toISOString();
    targetLabel = '已逾期';
  } else {
    targetDueAt = undefined;
    targetLabel = '无日期';
  }

  return tasks.map((t) => {
    if (t.id === taskId) {
      return {
        ...t,
        dueCategory: newCategory,
        dueAt: targetDueAt,
        dueLabel: targetLabel,
        updatedAt: nowIso,
      };
    }
    return t;
  });
}

/**
 * Merges two arrays of entities with id and updatedAt, resolving conflicts by newer timestamp.
 */
export function mergeEntities<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  existing: T[],
  incoming: T[]
): T[] {
  const map = new Map<string, T>();

  for (const item of existing) {
    map.set(item.id, item);
  }

  for (const item of incoming) {
    const prev = map.get(item.id);
    if (!prev) {
      map.set(item.id, item);
    } else {
      const prevTime = new Date(prev.updatedAt || prev.createdAt || 0).getTime();
      const nextTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
      if (nextTime >= prevTime) {
        map.set(item.id, item);
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Validates JSON backup data against expected schema.
 */
export function validateBackupData(data: any): {
  valid: boolean;
  error?: string;
  counts?: { tasks: number; projects: number; reviews: number };
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: '无效的数据格式，需为 JSON 对象' };
  }

  if (typeof data.schemaVersion !== 'number') {
    return { valid: false, error: '缺少 schemaVersion 版本字段' };
  }

  if (!Array.isArray(data.tasks)) {
    return { valid: false, error: 'tasks 数据格式不正确，需为数组' };
  }

  if (!Array.isArray(data.projects)) {
    return { valid: false, error: 'projects 数据格式不正确，需为数组' };
  }

  if (!Array.isArray(data.reviews)) {
    return { valid: false, error: 'reviews 数据格式不正确，需为数组' };
  }

  // Validate basic task items
  for (let i = 0; i < Math.min(data.tasks.length, 10); i++) {
    const t = data.tasks[i];
    if (!t || typeof t.id !== 'string' || typeof t.title !== 'string') {
      return { valid: false, error: `任务列表中第 ${i + 1} 项数据格式异常` };
    }
  }

  return {
    valid: true,
    counts: {
      tasks: data.tasks.length,
      projects: data.projects.length,
      reviews: data.reviews.length,
    },
  };
}

/**
 * Helper to determine if swipe distance reached threshold.
 */
export function swipeThresholdHelper(
  distance: number,
  cardWidth: number,
  thresholdPercent = 0.45
): { reached: boolean; ratio: number } {
  if (cardWidth <= 0) return { reached: false, ratio: 0 };
  const ratio = Math.abs(distance) / cardWidth;
  return {
    reached: ratio >= thresholdPercent,
    ratio: Math.min(1, ratio / thresholdPercent),
  };
}
