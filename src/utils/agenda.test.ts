import test from 'node:test';
import assert from 'node:assert/strict';
import { monthDays, parseCalendarDate } from './calendar.ts';
import { localDateValue, quickDate, buildDueAt } from './taskEdit.ts';
import { orderAgenda, priorityTasks, taskDate, wrapTasks } from './taskPresentation.ts';
import { arrangeTasks, undoArrangement } from './wrapUp.ts';
import { filterTasks, validateBackupData } from './taskLogic.ts';
import type { Task } from '../types/index.ts';
const now = new Date(2026, 9, 18, 21);
const task = (id: string, date = '2026-10-18', time = '', priority: Task['priority'] = 'normal'): Task => ({ id, title: id, status: 'pending', priority, project: '项目', dueAt: buildDueAt(date, time), dueTime: time || undefined, createdAt: now.toISOString(), updatedAt: now.toISOString() });

test('month grids are complete Monday-first weeks across leap years and year boundaries', () => {
 for (const input of ['2024-02-01', '2026-12-31', '2027-01-01']) {
  const date = parseCalendarDate(input)!; const days = monthDays(date);
  assert.equal(days.length % 7, 0);
  assert.equal(parseCalendarDate(days[0].value)!.getDay(), 1);
  assert.equal(days.filter(d => d.inMonth).length, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate());
  assert.equal(new Set(days.map(d => d.value)).size, days.length);
 }
 assert.equal(parseCalendarDate('2026-02-29'), null);
 assert.equal(parseCalendarDate('2024-02-29')?.getDate(), 29);
});
test('weekend shortcut stays in the current weekend including Sunday', () => {
 assert.equal(quickDate('weekend', new Date(2026, 9, 17)), '2026-10-17');
 assert.equal(quickDate('weekend', now), '2026-10-18');
 assert.equal(quickDate('tomorrow', new Date(2026, 11, 31, 23, 59)), '2027-01-01');
});
test('calendar dates and midnight round-trip locally; undated tasks remain undated', () => {
 assert.equal(taskDate(task('midnight', '2026-10-18', '00:00')), '2026-10-18');
 assert.equal(taskDate(task('none', '')), '');
 assert.equal(localDateValue(new Date(buildDueAt('2026-10-18')!)), '2026-10-18');
});
test('agenda ordering preserves manual order within each time group', () => {
 const tasks = [task('none'), { ...task('b', undefined, '08:00'), order: 2 }, { ...task('a', undefined, '08:00'), order: 1 }, task('late', undefined, '18:00'), { ...task('done', undefined, '07:00'), status: 'completed' as const }];
 assert.deepEqual(orderAgenda(tasks).map(t => t.id), ['a', 'b', 'late', 'none', 'done']);
});
test('priority and completion filters compose without dropping any priority values', () => {
 const tasks = [task('urgent', undefined, '', 'urgent'), task('important', undefined, '', 'important'), task('normal'), { ...task('later', undefined, '', 'later'), status: 'completed' as const }];
 assert.deepEqual(filterTasks(priorityTasks(tasks, 'later'), 'completed').map(t => t.id), ['later']);
 assert.equal(filterTasks(priorityTasks(tasks, 'later'), 'pending').length, 0);
 assert.equal(priorityTasks(tasks, 'all').length, 4);
});
test('wrap includes overdue and today, including tonight, excludes completed, future and undated', () => {
 const tasks = [task('old', '2026-10-16'), task('tonight', undefined, '21:30'), task('future', '2026-10-19'), task('none', ''), { ...task('done'), status: 'completed' as const }];
 assert.deepEqual(wrapTasks(tasks, now).map(t => t.id), ['old', 'tonight']);
});
test('batch keeps one of four tasks, preserves fields and offsets, and undo restores schedules', () => {
 const tasks = [task('old', '2026-10-16', '08:00'), task('old2', '2026-10-17'), task('today', undefined, '20:00'), task('tonight', undefined, '21:30')];
 tasks[0].reminderAt = new Date(Date.parse(tasks[0].dueAt!) - 15 * 60000).toISOString();
 const result = arrangeTasks(tasks, ['old', 'old2', 'today'], '2026-10-19', now);
 assert.equal(result.count, 3);
 assert.deepEqual(wrapTasks(result.tasks, now).map(t => t.id), ['tonight']);
 assert.equal(result.tasks[0].project, '项目');
 assert.equal(result.tasks[0].dueTime, '08:00');
 assert.equal(Date.parse(result.tasks[0].dueAt!) - Date.parse(result.tasks[0].reminderAt!), 15 * 60000);
 const undone = undoArrangement(result.tasks, result.undo, new Date(now.getTime() + 1000));
 assert.equal(undone.count, 3);
 assert.equal(undone.tasks[0].dueAt, tasks[0].dueAt);
 assert.equal(undone.tasks[0].reminderAt, tasks[0].reminderAt);
});
test('unscheduling clears reminders and undo never resurrects deleted tasks or overwrites later edits', () => {
 const tasks = [task('a'), task('b'), task('c')];
 const result = arrangeTasks(tasks, ['a', 'b', 'c'], '', now);
 assert.equal(result.tasks[0].dueAt, undefined);
 assert.equal(result.tasks[0].dueTime, undefined);
 assert.equal(result.tasks[0].reminderAt, undefined);
 const changed = result.tasks.filter(t => t.id !== 'a').map(t => t.id === 'b' ? { ...t, title: '新标题' } : t);
 const undone = undoArrangement(changed, result.undo);
 assert.equal(undone.count, 1); assert.equal(undone.skipped, 2);
 assert.equal(undone.tasks.find(t => t.id === 'b')!.title, '新标题');
});
test('batch skips tasks already completed and does not schedule past reminders', () => {
 const t = task('a', '2026-10-17', '08:00');
 t.reminderAt = new Date(Date.parse(t.dueAt!) - 60000).toISOString();
 const result = arrangeTasks([t, { ...task('b'), status: 'completed' }], ['a', 'b'], '2026-10-18', now);
 assert.equal(result.count, 1); assert.equal(result.skipped, 1); assert.equal(result.tasks[0].reminderAt, undefined);
 assert.throws(() => arrangeTasks([t], ['a'], '2026-02-30', now));
});
test('new reminder preferences validate alongside old v3 backups', () => {
 const backup = { schemaVersion: 3, exportedAt: now.toISOString(), tasks: [], projects: [], reviews: [], notes: [] };
 assert.equal(validateBackupData(backup).valid, true);
 assert.equal(validateBackupData({ ...backup, settings: { wrapReminderEnabled: true, wrapReminderTime: '21:00' } }).valid, true);
 assert.equal(validateBackupData({ ...backup, settings: { wrapReminderTime: '25:00' } }).valid, false);
});
