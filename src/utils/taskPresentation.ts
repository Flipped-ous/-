import type { Task, PriorityLevel } from '../types/index.ts';
import { localDateValue } from './taskEdit.ts';

export const priorities: { value: PriorityLevel; label: string }[] = [
  { value: 'urgent', label: '紧急且重要' }, { value: 'important', label: '重要不紧急' },
  { value: 'normal', label: '日常普通' }, { value: 'later', label: '稍后处理' },
];
export function taskDate(task: Task) {
  const date = new Date(task.dueAt || '');
  return Number.isFinite(date.getTime()) ? localDateValue(date) : '';
}
export function priorityTasks(tasks: Task[], priority: PriorityLevel | 'all') {
  return priority === 'all' ? tasks : tasks.filter(task => task.priority === priority);
}
export function taskTime(task: Task) {
  if (task.dueTime) return task.dueTime;
  const date = new Date(task.dueAt || '');
  if (!Number.isFinite(date.getTime()) || (!date.getHours() && !date.getMinutes())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
export function orderAgenda(tasks: Task[]) {
  return tasks.map((task, index) => ({ task, index })).sort((a, b) => {
    const status = Number(a.task.status === 'completed') - Number(b.task.status === 'completed');
    const time = (taskTime(a.task) || '99:99').localeCompare(taskTime(b.task) || '99:99');
    return status || time || ((a.task.order ?? a.index) - (b.task.order ?? b.index)) || a.index - b.index;
  }).map(row => row.task);
}
export function wrapTasks(tasks: Task[], now = new Date()) {
  const today = localDateValue(now);
  return tasks.filter(task => task.status === 'pending' && taskDate(task) && taskDate(task) <= today);
}
