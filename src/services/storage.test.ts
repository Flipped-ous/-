import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadStorageData, saveStorageData } from './storage.ts';
import { migrateStorageData, type StoredData } from './migration.ts';

class MemoryStorage {
  rows = new Map<string, string>();
  getItem(key: string) {
    return this.rows.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.rows.set(key, String(value));
  }
  removeItem(key: string) {
    this.rows.delete(key);
  }
}
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: new MemoryStorage(),
});
const stamp = new Date(2026, 9, 17, 12).toISOString();
const empty: StoredData = {
  schemaVersion: 2,
  tasks: [],
  projects: [],
  reviews: [],
  devices: [],
  settings: {
    theme: 'light',
    motion: 'standard',
    motionEnabled: true,
    notification: 'gentle',
  },
};

test('first run differs from an intentionally empty saved database', async () => {
  assert.equal(await loadStorageData(), null);
  await saveStorageData(empty);
  const restored = await loadStorageData();
  assert.deepEqual(restored?.tasks, []);
  assert.deepEqual(restored?.projects, []);
  assert.equal(restored?.schemaVersion, 2);
});
test('serial atomic snapshots persist the final edit, settings and mock devices', async () => {
  const task = {
    id: 'a',
    title: '���',
    status: 'pending' as const,
    priority: 'normal' as const,
    project: '',
    createdAt: stamp,
    updatedAt: stamp,
  };
  await Promise.all([
    saveStorageData({ ...empty, tasks: [task] }),
    saveStorageData({
      ...empty,
      tasks: [{ ...task, title: '����޸�' }],
      settings: { ...empty.settings!, theme: 'dark' },
      devices: [
        {
          id: 'd',
          name: '�����豸',
          os: 'Android',
          status: 'connected',
          quality: '����',
          pingMs: 1,
          lastSync: '�ո�',
        },
      ],
    }),
  ]);
  const loaded = await loadStorageData();
  assert.equal(loaded?.tasks[0].title, '����޸�');
  assert.equal(loaded?.settings?.theme, 'dark');
  assert.equal(loaded?.devices[0].id, 'd');
});
test('empty snapshot does not resurrect deleted seed tasks', async () => {
  await saveStorageData(empty);
  const loaded = await loadStorageData();
  assert.deepEqual(loaded?.tasks, []);
  assert.deepEqual(loaded?.devices, []);
});
test('a failed IndexedDB transaction falls back to a complete recoverable snapshot', async () => {
  const transaction = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function () {
    throw new DOMException('quota', 'QuotaExceededError');
  } as typeof transaction;
  try {
    await saveStorageData({
      ...empty,
      settings: { ...empty.settings!, theme: 'dark' },
    });
  } finally {
    IDBDatabase.prototype.transaction = transaction;
  }
  assert.equal((await loadStorageData())?.settings?.theme, 'dark');
  await saveStorageData(empty);
  assert.equal(localStorage.getItem('jy_snapshot_v2'), null);
});
test('storage failures are reported instead of silently losing edits', async () => {
  const transaction = IDBDatabase.prototype.transaction;
  const setItem = localStorage.setItem;
  IDBDatabase.prototype.transaction = function () {
    throw new DOMException('quota', 'QuotaExceededError');
  } as typeof transaction;
  localStorage.setItem = () => {
    throw new DOMException('quota', 'QuotaExceededError');
  };
  try {
    await assert.rejects(saveStorageData(empty), /���ر���ʧ��/);
  } finally {
    IDBDatabase.prototype.transaction = transaction;
    localStorage.setItem = setItem;
  }
  await saveStorageData(empty);
});
test('migration unions old task arrays and converts project innerTasks exactly once', () => {
  const legacy = {
    todayTasks: [
      { id: 'a', title: '������', project: '��Ŀ', dueCategory: 'today' },
    ],
    allTasks: [
      { id: 'a', title: '������', project: '��Ŀ', dueCategory: 'today' },
    ],
    projects: [
      {
        id: 'p',
        name: '��Ŀ',
        status: 'active',
        innerTasks: [{ id: 'inner', title: '����Ŀ����', completed: true }],
      },
    ],
  };
  const migrated = migrateStorageData(legacy, new Date(stamp));
  assert.equal(migrated.tasks.length, 2);
  assert.equal(migrated.tasks[0].projectId, 'p');
  assert.ok(migrated.tasks[0].dueAt);
  assert.deepEqual(migrateStorageData(migrated, new Date(stamp)), migrated);
  assert.equal('innerTasks' in migrated.projects[0], false);
  assert.throws(() => migrateStorageData({ schemaVersion: 999 }), /����/);
});
