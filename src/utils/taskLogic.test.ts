import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterTasks,
  getDueCategory,
  formatDueLabel,
  groupTasksByDate,
  groupTasksByQuadrant,
  calculateProjectStats,
  calculateReviewStats,
  toggleTask,
  deleteTask,
  restoreTask,
  moveTask,
  changeTaskCategory,
  mergeEntities,
  validateBackupData,
  swipeThresholdHelper,
} from './taskLogic.ts';
import type { Task, BackupData } from '../types/index.ts';

// Test reference date: 2026-05-24T12:00:00
const refDate = new Date('2026-05-24T12:00:00');

const sampleTasks: Task[] = [
  {
    id: 't-1',
    title: '整理本周局域网同步排期',
    status: 'pending',
    priority: 'urgent',
    dueAt: '2026-05-23T18:00:00', // Overdue
    projectId: 'proj-1',
    project: '基础设施',
    createdAt: '2026-05-22T08:00:00',
    updatedAt: '2026-05-22T08:00:00',
  },
  {
    id: 't-2',
    title: '确认 Redmi Note 9 屏幕字号适配与断行',
    status: 'pending',
    priority: 'important',
    dueAt: '2026-05-24T14:00:00', // Today
    projectId: 'proj-1',
    project: '基础设施',
    createdAt: '2026-05-24T09:00:00',
    updatedAt: '2026-05-24T09:00:00',
  },
  {
    id: 't-3',
    title: '购买无酸素描本与墨水笔',
    status: 'completed',
    priority: 'normal',
    dueAt: '2026-05-24T10:00:00', // Today completed
    projectId: 'proj-2',
    project: '生活琐事',
    createdAt: '2026-05-24T08:00:00',
    updatedAt: '2026-05-24T09:30:00',
    completedAt: '2026-05-24T09:30:00',
  },
  {
    id: 't-4',
    title: '准备下周一离线数据库快照版本更新',
    status: 'pending',
    priority: 'normal',
    dueAt: '2026-05-26T10:00:00', // Future
    projectId: 'proj-1',
    project: '基础设施',
    createdAt: '2026-05-24T10:00:00',
    updatedAt: '2026-05-24T10:00:00',
  },
  {
    id: 't-5',
    title: '未安排日期的灵感便签',
    status: 'pending',
    priority: 'later',
    createdAt: '2026-05-20T10:00:00',
    updatedAt: '2026-05-20T10:00:00',
    project: '灵感库',
  },
];

// 1. toggleTask test
test('1. toggleTask switches pending to completed and records completedAt & updatedAt', () => {
  const toggled = toggleTask(sampleTasks, 't-1', refDate);
  assert.equal(toggled[0].status, 'completed');
  assert.equal(toggled[0].completedAt, refDate.toISOString());

  const toggledBack = toggleTask(toggled, 't-1', refDate);
  assert.equal(toggledBack[0].status, 'pending');
  assert.equal(toggledBack[0].completedAt, undefined);
});

// 2. delete + restore test
test('2. deleteTask removes task and restoreTask puts it back at original position', () => {
  const { updatedTasks, deletedTask, deletedIndex } = deleteTask(
    sampleTasks,
    't-2',
  );
  assert.equal(updatedTasks.length, 4);
  assert.equal(deletedTask?.id, 't-2');
  assert.equal(deletedIndex, 1);

  const restored = restoreTask(updatedTasks, deletedTask!, deletedIndex);
  assert.equal(restored.length, 5);
  assert.equal(restored[1].id, 't-2');
});

// 3. dueCategory calculation test
test('3. getDueCategory accurately computes overdue, today, future, none based on ISO date', () => {
  assert.equal(getDueCategory(sampleTasks[0], refDate), 'overdue');
  assert.equal(getDueCategory(sampleTasks[1], refDate), 'today');
  assert.equal(getDueCategory(sampleTasks[3], refDate), 'future');
  assert.equal(getDueCategory(sampleTasks[4], refDate), 'none');
});

// 4. group tasks test
test('4. groupTasksByDate groups tasks dynamically into 4 date buckets', () => {
  const grouped = groupTasksByDate(sampleTasks, refDate);
  assert.equal(grouped.overdue.length, 1);
  assert.equal(grouped.today.length, 2);
  assert.equal(grouped.future.length, 1);
  assert.equal(grouped.none.length, 1);
});

// 5. project stats test
test('5. calculateProjectStats derives pending, completed, and progressPercent in real time', () => {
  const statsProj1 = calculateProjectStats(sampleTasks, 'proj-1');
  assert.equal(statsProj1.totalCount, 3);
  assert.equal(statsProj1.pendingCount, 3);
  assert.equal(statsProj1.completedCount, 0);
  assert.equal(statsProj1.progressPercent, 0);

  const statsProj2 = calculateProjectStats(sampleTasks, 'proj-2');
  assert.equal(statsProj2.totalCount, 1);
  assert.equal(statsProj2.completedCount, 1);
  assert.equal(statsProj2.progressPercent, 100);
});

// 6. calculateReviewStats test
test('6. calculateReviewStats computes real review metrics from tasks', () => {
  const reviewStats = calculateReviewStats(sampleTasks, refDate);
  assert.equal(reviewStats.completed, 1); // t-3 completed today
  assert.equal(reviewStats.delayed, 1); // t-1 overdue pending
  assert.equal(reviewStats.topProject, '基础设施');
});

// 7. backup import validation test
test('7. validateBackupData checks schemaVersion, arrays, and item structure', () => {
  const validData: BackupData = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    tasks: sampleTasks,
    projects: [
      {
        id: 'proj-1',
        name: '基础设施',
        description: '',
        status: 'active',
        createdAt: refDate.toISOString(),
        updatedAt: refDate.toISOString(),
      },
      {
        id: 'proj-2',
        name: '生活琐事',
        description: '',
        status: 'active',
        createdAt: refDate.toISOString(),
        updatedAt: refDate.toISOString(),
      },
    ],
    reviews: [],
  };
  const validRes = validateBackupData(validData);
  assert.equal(validRes.valid, true);
  assert.equal(validRes.counts?.tasks, 5);

  const invalidRes = validateBackupData({
    schemaVersion: 'one',
    tasks: 'not-array',
  });
  assert.equal(invalidRes.valid, false);
  assert.ok(invalidRes.error);
});

// 8. merge conflicts test
test('8. mergeEntities merges arrays by ID resolving conflicts with newer updatedAt', () => {
  const existing = [
    { id: '1', title: 'Old version', updatedAt: '2026-05-20T10:00:00Z' },
    { id: '2', title: 'Existing only', updatedAt: '2026-05-20T10:00:00Z' },
  ];
  const incoming = [
    { id: '1', title: 'Newer version', updatedAt: '2026-05-24T10:00:00Z' },
    { id: '3', title: 'Fresh incoming', updatedAt: '2026-05-24T10:00:00Z' },
  ];

  const merged = mergeEntities(existing, incoming);
  assert.equal(merged.length, 3);
  const item1 = merged.find((i) => i.id === '1');
  assert.equal(item1?.title, 'Newer version');
});

// 9. swipe threshold helper test
test('9. swipeThresholdHelper evaluates 45% card width release threshold', () => {
  const cardWidth = 360;
  // Below 45% threshold (100px / 360px = 27.7%)
  const sub = swipeThresholdHelper(100, cardWidth, 0.45);
  assert.equal(sub.reached, false);

  // Above 45% threshold (180px / 360px = 50%)
  const beyond = swipeThresholdHelper(180, cardWidth, 0.45);
  assert.equal(beyond.reached, true);
});

// 10. reorder / move task logic test
test('10. moveTask reorders tasks within list', () => {
  const moved = moveTask(sampleTasks, 0, 2);
  assert.equal(moved[2].id, 't-1');
  assert.equal(moved[0].id, 't-2');
});
