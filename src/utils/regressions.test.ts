import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDueAt, localDateValue, quickDate } from './taskEdit.ts';
import { gestureIntent, releaseAction } from './gesture.ts';
import {
  calculateReviewStats,
  createBackup,
  validateBackupData,
  addTask,
  updateTask,
  changeTaskProject,
  moveTaskById,
  getPeriodRange,
} from './taskLogic.ts';
import { taskReducer } from '../hooks/useTasks.ts';
import type { Task, Project, AppSettings } from '../types/index.ts';

const now = new Date(2026, 9, 17, 12);
const project: Project = {
  id: 'p',
  name: '��Ŀ',
  description: '',
  status: 'active',
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};
const settings: AppSettings = {
  theme: 'light',
  motion: 'standard',
  motionEnabled: true,
  notification: 'gentle',
};
const task: Task = {
  id: 'a',
  title: '����',
  projectId: 'p',
  project: '��Ŀ',
  status: 'pending',
  priority: 'normal',
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

test('gesture requires pointer movement; vertical movement retains scroll', () => {
  assert.equal(gestureIntent(4, 0), 'idle');
  assert.equal(gestureIntent(20, 2), 'horizontal');
  assert.equal(gestureIntent(1, 20), 'vertical');
});
test('release uses final position: crossed 60% then returned 20% cancels both directions', () => {
  assert.equal(releaseAction('horizontal', 216, 360), 'complete');
  assert.equal(releaseAction('horizontal', 72, 360), 'cancel');
  assert.equal(releaseAction('horizontal', -216, 360), 'delete');
  assert.equal(releaseAction('horizontal', -72, 360), 'cancel');
  assert.equal(releaseAction('horizontal', 216, 360, true), 'cancel');
  assert.equal(releaseAction('reorder', 216, 360), 'cancel');
});
test('midnight survives date input; Saturday quick date includes today', () => {
  const due = buildDueAt('2026-10-17', '00:00')!;
  assert.equal(new Date(due).getHours(), 0);
  assert.equal(localDateValue(new Date(due)), '2026-10-17');
  assert.equal(quickDate('weekend', now), '2026-10-17');
  assert.equal(buildDueAt(''), undefined);
  assert.throws(() => buildDueAt('2026-02-30', '10:00'));
});
test('CRUD never duplicates IDs or changes a task ID on update', () => {
  const tasks = addTask([], { ...task }, now);
  assert.equal(addTask(tasks, task, now).length, 1);
  const updated = updateTask(tasks, 'a', { title: '�޸�', id: 'evil' }, now);
  assert.equal(updated[0].id, 'a');
  assert.equal(updated[0].title, '�޸�');
  assert.equal(
    changeTaskProject(tasks, 'a', { id: 'b', name: '��һ����Ŀ' }, now)[0]
      .projectId,
    'b',
  );
});
test('editing only a title preserves the exact deadline, time and project', () => {
  const original = {
    ...task,
    dueAt: '2026-11-03T00:00:00+08:00',
    dueTime: '00:00',
  };
  const edited = updateTask(
    [original],
    original.id,
    { title: '�ı���' },
    now,
  )[0];
  assert.equal(edited.dueAt, original.dueAt);
  assert.equal(edited.dueTime, '00:00');
  assert.equal(edited.projectId, 'p');
});
test('ID-based reorder preserves the requested pending order with hidden completed items', () => {
  const rows = [
    { ...task, id: 'done', status: 'completed' as const },
    { ...task, id: 'pending-A' },
    { ...task, id: 'pending-B' },
  ];
  const result = moveTaskById(rows, 'pending-A', 'pending-B');
  assert.deepEqual(
    result.filter((t) => t.status === 'pending').map((t) => t.id),
    ['pending-B', 'pending-A'],
  );
});
test('undo restores exact task contents, position and project; latest deletion wins', () => {
  const original = [task, { ...task, id: 'b' }];
  let state = taskReducer(
    { tasks: original, deleted: null },
    { type: 'delete', id: 'a' },
  );
  assert.deepEqual(taskReducer(state, { type: 'undo' }).tasks, original);
  state = taskReducer(state, { type: 'delete', id: 'b' });
  assert.equal(state.deleted?.task.id, 'b');
  assert.equal(taskReducer(state, { type: 'dismiss' }).deleted, null);
});
test('a yesterday completion due today is not counted as completed today', () => {
  const completed = {
    ...task,
    status: 'completed' as const,
    dueAt: new Date(2026, 9, 17, 18).toISOString(),
    completedAt: new Date(2026, 9, 16, 10).toISOString(),
  };
  assert.equal(calculateReviewStats([completed], now).completed, 0);
  assert.equal(calculateReviewStats([completed], now, 'week').completed, 1);
});
test('review period follows calendar boundaries in local time', () => {
  const range = getPeriodRange(now, 'week');
  assert.equal(new Date(range.start).getDay(), 1);
  const month = getPeriodRange(now, 'month');
  assert.equal(new Date(month.start).getDate(), 1);
  assert.equal(new Date(month.end).getMonth(), 10);
});
test('backup round trip includes settings, schema version and all relational data', () => {
  const backup = createBackup([task], [project], [], settings, now);
  assert.equal(
    validateBackupData(JSON.parse(JSON.stringify(backup))).valid,
    true,
  );
  assert.equal(backup.schemaVersion, 2);
  assert.equal(backup.settings?.motion, 'standard');
});
test('backup validation checks every item, relationships, dates and settings', () => {
  const backup = createBackup([task], [project], [], settings, now);
  for (const corrupted of [
    {
      ...backup,
      tasks: [
        ...Array.from({ length: 10 }, (_, i) => ({ ...task, id: String(i) })),
        null,
      ],
    },
    { ...backup, projects: [null] },
    { ...backup, schemaVersion: 999 },
    { ...backup, tasks: [{ ...task, status: 'broken' }] },
    { ...backup, tasks: [{ ...task, updatedAt: 'bad' }] },
    { ...backup, projects: [] },
    { ...backup, settings: { motion: 'fast' } },
    { ...backup, tasks: [task, task] },
  ])
    assert.equal(validateBackupData(corrupted).valid, false);
});
