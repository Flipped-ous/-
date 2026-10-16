import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterTasks,
  groupTasksByDate,
  groupTasksByQuadrant,
  calculateOverviewStats,
  toggleTask,
} from './taskLogic.ts';
import type { Task } from '../types/index.ts';

const mockTasks: Task[] = [
  {
    id: '1',
    title: '整理本周局域网同步排期',
    status: 'pending',
    priority: 'urgent',
    dueCategory: 'overdue',
    dueLabel: '逾期 昨天',
    project: 'Android',
    createdAt: '2026-10-23',
  },
  {
    id: '2',
    title: '确认 Redmi Note 9 屏幕字号适配与断行',
    status: 'pending',
    priority: 'important',
    dueCategory: 'today',
    dueTime: '15:00',
    dueLabel: '今天 15:00',
    project: '界面精调',
    createdAt: '2026-10-24',
  },
  {
    id: '3',
    title: '购买无酸素描本与墨水笔',
    status: 'completed',
    priority: 'normal',
    dueCategory: 'today',
    project: '生活琐事',
    completedAt: '09:20',
    createdAt: '2026-10-24',
  },
];

test('filterTasks correctly filters by status and search query', () => {
  const pending = filterTasks(mockTasks, 'pending');
  assert.equal(pending.length, 2);

  const completed = filterTasks(mockTasks, 'completed');
  assert.equal(completed.length, 1);
  assert.equal(completed[0].id, '3');

  const searched = filterTasks(mockTasks, 'all', 'Redmi');
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, '2');
});

test('groupTasksByDate separates tasks into overdue, today, future, none', () => {
  const grouped = groupTasksByDate(mockTasks);
  assert.equal(grouped.overdue.length, 1);
  assert.equal(grouped.today.length, 2);
  assert.equal(grouped.future.length, 0);
  assert.equal(grouped.none.length, 0);
});

test('groupTasksByQuadrant assigns quadrants accurately', () => {
  const quadrants = groupTasksByQuadrant(mockTasks);
  assert.equal(quadrants.urgentImportant.length, 1);
  assert.equal(quadrants.urgentImportant[0].id, '1');
  assert.equal(quadrants.importantNotUrgent.length, 1);
  assert.equal(quadrants.importantNotUrgent[0].id, '2');
});

test('calculateOverviewStats returns accurate metrics', () => {
  const stats = calculateOverviewStats(mockTasks);
  assert.equal(stats.completed, 1);
  assert.equal(stats.delayed, 1);
  assert.equal(stats.added, 3);
});

test('toggleTask switches pending to completed and vice versa', () => {
  const updated1 = toggleTask(mockTasks, '1');
  assert.equal(updated1[0].status, 'completed');
  assert.ok(updated1[0].completedAt);

  const updated2 = toggleTask(mockTasks, '3');
  assert.equal(updated2[2].status, 'pending');
  assert.equal(updated2[2].completedAt, undefined);
});
