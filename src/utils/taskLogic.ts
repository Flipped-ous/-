import type { Task, DueCategory, PriorityLevel } from '../types/index.ts';

export function filterTasks(
  tasks: Task[],
  filter: 'all' | 'pending' | 'completed',
  searchQuery = ''
): Task[] {
  const query = searchQuery.trim().toLowerCase();
  return tasks.filter((task) => {
    // Filter by status
    if (filter === 'pending' && task.status !== 'pending') return false;
    if (filter === 'completed' && task.status !== 'completed') return false;

    // Filter by search query
    if (query) {
      const matchTitle = task.title.toLowerCase().includes(query);
      const matchProject = task.project.toLowerCase().includes(query);
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

export function groupTasksByDate(tasks: Task[]): DateGroupedTasks {
  const groups: DateGroupedTasks = {
    overdue: [],
    today: [],
    future: [],
    none: [],
  };

  for (const task of tasks) {
    if (task.dueCategory === 'overdue') {
      groups.overdue.push(task);
    } else if (task.dueCategory === 'today') {
      groups.today.push(task);
    } else if (task.dueCategory === 'future') {
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

export function groupTasksByQuadrant(tasks: Task[]): QuadrantTasks {
  const quadrants: QuadrantTasks = {
    urgentImportant: [],
    importantNotUrgent: [],
    urgentNotImportant: [],
    neither: [],
  };

  for (const task of tasks) {
    if (task.priority === 'urgent') {
      quadrants.urgentImportant.push(task);
    } else if (task.priority === 'important') {
      quadrants.importantNotUrgent.push(task);
    } else if (task.priority === 'normal') {
      if (task.dueCategory === 'today' || task.dueCategory === 'overdue') {
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

export function calculateOverviewStats(tasks: Task[]) {
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const delayed = tasks.filter((t) => t.status === 'pending' && t.dueCategory === 'overdue').length;
  const added = tasks.length;

  const projectCounts: Record<string, number> = {};
  for (const t of tasks) {
    if (t.project) {
      projectCounts[t.project] = (projectCounts[t.project] || 0) + 1;
    }
  }

  let topProject = '暂无主要项目';
  let maxCount = 0;
  for (const [proj, cnt] of Object.entries(projectCounts)) {
    if (cnt > maxCount) {
      maxCount = cnt;
      topProject = proj;
    }
  }

  return {
    completed,
    delayed,
    added,
    topProject,
  };
}

export function toggleTask(tasks: Task[], taskId: string): Task[] {
  return tasks.map((task) => {
    if (task.id === taskId) {
      const isCompleted = task.status === 'completed';
      return {
        ...task,
        status: isCompleted ? 'pending' : 'completed',
        completedAt: isCompleted ? undefined : new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      };
    }
    return task;
  });
}
