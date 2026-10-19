import type { Task } from '../types/index.ts';
import { buildDueAt } from './taskEdit.ts';
import { parseCalendarDate } from './calendar.ts';
import { wrapTasks, taskTime } from './taskPresentation.ts';

const fields = ['dueAt', 'dueTime', 'reminderAt', 'dueCategory', 'dueLabel'] as const;
export interface ScheduleUndo { id: string; before: Pick<Task, typeof fields[number]>; after: Task }
export function arrangeTasks(tasks: Task[], ids: string[], date: string, now = new Date()) {
  if (date && !parseCalendarDate(date)) throw new Error('请选择有效日期');
  const eligible = new Set(wrapTasks(tasks, now).map(task => task.id));
  const selected = new Set(ids);
  const undo: ScheduleUndo[] = [];
  const updated = tasks.map(task => {
    if (!selected.has(task.id) || !eligible.has(task.id)) return task;
    const before = Object.fromEntries(fields.map(field => [field, task[field]])) as ScheduleUndo['before'];
    const time = taskTime(task);
    const dueAt = date ? buildDueAt(date, time) : undefined;
    const offset = Date.parse(task.reminderAt || '') - Date.parse(task.dueAt || '');
    const reminder = dueAt && Number.isFinite(offset) ? Date.parse(dueAt) + offset : NaN;
    const after: Task = { ...task, dueAt, dueTime: date ? time || undefined : undefined,
      reminderAt: reminder > now.getTime() ? new Date(reminder).toISOString() : undefined,
      dueCategory: undefined, dueLabel: undefined, updatedAt: now.toISOString() };
    undo.push({ id: task.id, before, after });
    return after;
  });
  return { tasks: updated, undo, count: undo.length, skipped: selected.size - undo.length };
}
export function undoArrangement(tasks: Task[], undo: ScheduleUndo[], now = new Date()) {
  let count = 0;
  const records = new Map(undo.map(record => [record.id, record]));
  const updated = tasks.map(task => {
    const record = records.get(task.id);
    // Any intervening edit makes this task ineligible, including completing it.
    if (!record || JSON.stringify(task) !== JSON.stringify(record.after)) return task;
    count++;
    return { ...task, ...record.before, updatedAt: now.toISOString() };
  });
  return { tasks: updated, count, skipped: undo.length - count };
}
