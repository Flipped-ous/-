import { validateNote } from './notes.ts';
import type {
  Task,
  DueCategory,
  PriorityLevel,
  BackupData,
} from '../types/index.ts';

/**
 * Calculates due category dynamically based on dueAt ISO string and a reference date.
 */
export function getDueCategory(
  task: Task,
  referenceDate = new Date(),
): DueCategory {
  if (!task.dueAt) {
    return 'none';
  }

  const dueDate = new Date(task.dueAt);
  if (isNaN(dueDate.getTime())) {
    return 'none';
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

  const diffDays = Math.round(
    (startOfDueDay - startOfRefDay) / (1000 * 60 * 60 * 24),
  );

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
  referenceDate = new Date(),
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
export function groupTasksByDate(
  tasks: Task[],
  referenceDate = new Date(),
): DateGroupedTasks {
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
export function groupTasksByQuadrant(
  tasks: Task[],
  referenceDate = new Date(),
): QuadrantTasks {
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
  const pendingCount = projectTasks.filter(
    (t) => t.status === 'pending',
  ).length;
  const completedCount = projectTasks.filter(
    (t) => t.status === 'completed',
  ).length;
  const totalCount = projectTasks.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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
export function getPeriodRange(
  referenceDate = new Date(),
  period: 'day' | 'week' | 'month' = 'day',
) {
  const start = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  if (period === 'week')
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (period === 'month') start.setDate(1);
  const end = new Date(start);
  if (period === 'month') end.setMonth(end.getMonth() + 1);
  else end.setDate(end.getDate() + (period === 'week' ? 7 : 1));
  return { start: start.getTime(), end: end.getTime() };
}
export function calculateReviewStats(
  tasks: Task[],
  referenceDate = new Date(),
  period: 'day' | 'week' | 'month' = 'day',
) {
  const { start: startOfRefDay, end: endOfRefDay } = getPeriodRange(
    referenceDate,
    period,
  );

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
        if (
          !isNaN(completedTime) &&
          completedTime >= startOfRefDay &&
          completedTime < endOfRefDay
        ) {
          completedToday++;
        }
      }
    }

    // Delayed overdue pending tasks
    if (task.status === 'pending' && category === 'overdue') {
      delayedCount++;
    }

    // Added today
    if (task.createdAt) {
      const createdTime = new Date(task.createdAt).getTime();
      if (
        !isNaN(createdTime) &&
        createdTime >= startOfRefDay &&
        createdTime < endOfRefDay
      ) {
        addedToday++;
      }
    }

    // Project engagement
    const completedTime = Date.parse(task.completedAt || '');
    const createdTime = Date.parse(task.createdAt);
    const dueTime = Date.parse(task.dueAt || '');
    if (
      [completedTime, createdTime, dueTime].some(
        (time) => time >= startOfRefDay && time < endOfRefDay,
      )
    ) {
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
export function toggleTask(
  tasks: Task[],
  taskId: string,
  now = new Date(),
): Task[] {
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
  taskId: string,
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
export function restoreTask(
  tasks: Task[],
  taskToRestore: Task,
  originalIndex?: number,
): Task[] {
  // If task already exists, don't duplicate
  if (tasks.some((t) => t.id === taskToRestore.id)) {
    return tasks;
  }
  const next = [...tasks];
  const insertIdx =
    originalIndex !== undefined &&
    originalIndex >= 0 &&
    originalIndex <= next.length
      ? originalIndex
      : 0;
  next.splice(insertIdx, 0, taskToRestore);
  return next;
}

/**
 * Reorders tasks by moving an item from fromIndex to toIndex.
 */
export function moveTask(
  tasks: Task[],
  fromIndex: number,
  toIndex: number,
): Task[] {
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
  referenceDate = new Date(),
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
        dueCategory: undefined,
        dueAt: targetDueAt,
        dueLabel: undefined,
        dueTime: targetDueAt
          ? new Date(targetDueAt).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
          : undefined,
        updatedAt: nowIso,
      };
    }
    return t;
  });
}

/**
 * Merges two arrays of entities with id and updatedAt, resolving conflicts by newer timestamp.
 */
export function mergeEntities<
  T extends { id: string; updatedAt?: string; createdAt?: string },
>(existing: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();

  for (const item of existing) {
    map.set(item.id, item);
  }

  for (const item of incoming) {
    const prev = map.get(item.id);
    if (!prev) {
      map.set(item.id, item);
    } else {
      const prevTime = new Date(
        prev.updatedAt || prev.createdAt || 0,
      ).getTime();
      const nextTime = new Date(
        item.updatedAt || item.createdAt || 0,
      ).getTime();
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
  const fail = (error: string) => ({ valid: false, error });
  const object = (v: any) =>
    v !== null && typeof v === 'object' && !Array.isArray(v);
  const date = (v: any) =>
    typeof v === 'string' && Number.isFinite(Date.parse(v));
  const strings = (v: any) =>
    Array.isArray(v) && v.every((x) => typeof x === 'string');
  if (!object(data)) return fail('需为 JSON 对象');
  if (data.schemaVersion !== 1 && data.schemaVersion !== 2 && data.schemaVersion !== 3)
    return fail('不支持的备份版本');
  if (!date(data.exportedAt)) return fail('缺少有效的导出时间');
  for (const key of ['tasks', 'projects', 'reviews']) {
    if (!Array.isArray(data[key])) return fail(key + ' 必须为数组');
    const ids = new Set();
    for (let i = 0; i < data[key].length; i++) {
      const item = data[key][i];
      if (
        !object(item) ||
        typeof item.id !== 'string' ||
        !item.id.trim() ||
        ids.has(item.id)
      )
        return fail(key + ' 第 ' + (i + 1) + ' 项标识无效或重复');
      ids.add(item.id);
      if (!date(item.createdAt) || !date(item.updatedAt))
        return fail(key + ' 第 ' + (i + 1) + ' 项时间字段无效');
      if (key === 'tasks') {
        if (
          typeof item.title !== 'string' ||
          !['pending', 'completed'].includes(item.status) ||
          !['urgent', 'important', 'normal', 'later'].includes(item.priority) ||
          typeof item.project !== 'string'
        )
          return fail('任务字段不完整');
        for (const field of ['dueAt', 'reminderAt', 'completedAt'])
          if (item[field] !== undefined && !date(item[field]))
            return fail('任务时间字段无效');
        if (item.projectId !== undefined && typeof item.projectId !== 'string')
          return fail('任务项目关联无效');
        if (item.tags !== undefined && !strings(item.tags))
          return fail('任务标签格式无效');
        for (const field of ['note', 'dueTime', 'dueLabel', 'badgeLabel'])
          if (item[field] !== undefined && typeof item[field] !== 'string')
            return fail('任务文字字段格式无效');
      } else if (key === 'projects') {
        if (
          typeof item.name !== 'string' ||
          typeof item.description !== 'string' ||
          !['active', 'paused', 'archived'].includes(item.status) ||
          (item.docs !== undefined && !strings(item.docs))
        )
          return fail('项目字段不完整');
      } else {
        if (
          typeof item.title !== 'string' ||
          typeof item.content !== 'string' ||
          !['day', 'week', 'month'].includes(item.type) ||
          !strings(item.moods) ||
          !Number.isFinite(item.wordCount) ||
          item.wordCount < 0
        )
          return fail('复盘字段不完整');
        for (const field of ['date', 'subDate', 'time'])
          if (typeof item[field] !== 'string') return fail('复盘日期字段无效');
        if (
          item.imageUrl !== undefined &&
          (typeof item.imageUrl !== 'string' ||
            !/^https?:\/\//.test(item.imageUrl))
        )
          return fail('复盘图片地址无效');
      }
    }
  }
  if (data.schemaVersion === 3 && (!Array.isArray(data.notes) || !data.notes.every(validateNote) || new Set(data.notes.map((n:any)=>n.id)).size !== data.notes.length)) return fail('笔记数据格式无效');
  const projectIds = new Set(data.projects.map((p: any) => p.id));
  if (data.schemaVersion === 3 && data.notes.some((n:any)=>n.projectId&&!projectIds.has(n.projectId))) return fail('笔记包含不存在的项目关联');
  if (data.tasks.some((t: any) => t.projectId && !projectIds.has(t.projectId)))
    return fail('备份包含不存在的项目关联');
  if (data.settings !== undefined) {
    const s = data.settings;
    if (!object(s)) return fail('设置格式无效');
    if (
      (s.theme !== undefined && !['light', 'dark'].includes(s.theme)) ||
      (s.motion !== undefined &&
        !['simple', 'standard', 'rich'].includes(s.motion)) ||
      (s.motionEnabled !== undefined && typeof s.motionEnabled !== 'boolean') ||
      (s.notification !== undefined &&
        !['gentle', 'important', 'all', 'off'].includes(s.notification))
    )
      return fail('设置值无效');
    if(s.reminderLeadMinutes!==undefined&&![0,5,10,15,30,60].includes(s.reminderLeadMinutes))return fail('提前提醒设置无效');
    if (s.wrapReminderEnabled !== undefined && typeof s.wrapReminderEnabled !== 'boolean') return fail('收工提醒开关无效');
    if (s.wrapReminderTime !== undefined && (typeof s.wrapReminderTime !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s.wrapReminderTime))) return fail('收工提醒时间无效');
    if (s.syncPaused !== undefined && typeof s.syncPaused !== 'boolean')
      return fail('同步设置值无效');
    if (
      Object.keys(s).some(
        (key) =>
          ![
            'theme',
            'motion',
            'motionEnabled',
            'notification',
            'reminderLeadMinutes',
            'wrapReminderEnabled',
            'wrapReminderTime',
            'dataSizeMb',
            'syncPaused',
          ].includes(key),
      )
    )
      return fail('备份包含未知设置');
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

export function createBackup(
  tasks: Task[],
  projects: import('../types/index.ts').Project[],
  reviews: import('../types/index.ts').ReviewEntry[],
  settings: import('../types/index.ts').AppSettings,
  now = new Date(),
): BackupData {
  return {
    schemaVersion: 2,
    exportedAt: now.toISOString(),
    tasks,
    projects,
    reviews,
    settings,
  };
}

export function addTask(
  tasks: Task[],
  input: Partial<Task>,
  now = new Date(),
): Task[] {
  const stamp = now.toISOString();
  const task: Task = {
    ...input,
    id: input.id || crypto.randomUUID(),
    title: (input.title || '').trim(),
    status: 'pending',
    priority: input.priority || 'normal',
    project: input.project || '',
    createdAt: stamp,
    updatedAt: stamp,
  };
  if (!task.title || tasks.some((t) => t.id === task.id)) return tasks;
  return [task, ...tasks];
}
export function updateTask(
  tasks: Task[],
  id: string,
  patch: Partial<Task>,
  now = new Date(),
): Task[] {
  return tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          ...patch,
          id: task.id,
          createdAt: task.createdAt,
          updatedAt: now.toISOString(),
          dueCategory: undefined,
          dueLabel: undefined,
        }
      : task,
  );
}
export function changeTaskProject(
  tasks: Task[],
  id: string,
  project: { id: string; name: string },
  now = new Date(),
) {
  return updateTask(
    tasks,
    id,
    { projectId: project.id, project: project.name },
    now,
  );
}
export function moveTaskById(
  tasks: Task[],
  id: string,
  targetId: string,
): Task[] {
  return moveTask(
    tasks,
    tasks.findIndex((t) => t.id === id),
    tasks.findIndex((t) => t.id === targetId),
  );
}

/**
 * Helper to determine if swipe distance reached threshold.
 */
export function swipeThresholdHelper(
  distance: number,
  cardWidth: number,
  thresholdPercent = 0.45,
): { reached: boolean; ratio: number } {
  if (cardWidth <= 0) return { reached: false, ratio: 0 };
  const ratio = Math.abs(distance) / cardWidth;
  return {
    reached: ratio >= thresholdPercent,
    ratio: Math.min(1, ratio / thresholdPercent),
  };
}
