import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { initialTasks, initialProjects, initialReviews, initialDevices, initialSettings } from '../data/legacyDemoData.ts';
import { initialTasks as freshTasks, initialProjects as freshProjects, initialReviews as freshReviews, initialDevices as freshDevices } from '../data/initialData.ts';
import { migrateStorageData } from './migration.ts';
import { withoutLegacyDemo, cleanLegacyDemoData } from './demoCleanup.ts';
import { transaction } from './notesRepository.ts';
import { openDB } from './storage.ts';
const seed = () => migrateStorageData(structuredClone({ schemaVersion: 2, tasks: initialTasks, projects: initialProjects, reviews: initialReviews, devices: initialDevices, settings: initialSettings }));

test('production starts empty and unchanged legacy examples are removed idempotently', () => {
  assert.equal([freshTasks, freshProjects, freshReviews, freshDevices].flat().length, 0);
  const cleaned = withoutLegacyDemo(seed());
  for (const key of ['tasks', 'projects', 'reviews', 'devices', 'notes'] as const) assert.deepEqual(cleaned[key], [], key);
  assert.deepEqual(withoutLegacyDemo(cleaned), cleaned);
});
test('customized examples, new content and their project associations survive cleanup', () => {
  const data = seed();
  data.tasks[0].title = '我自己的任务';
  data.notes![0].pinned = true;
  data.notes![0].projectId = 'proj-2';
  data.tasks.push({ ...data.tasks[1], id: 'my-task', title: '真正的任务', projectId: 'proj-3' });
  const cleaned = withoutLegacyDemo(data);
  assert.equal(cleaned.tasks.length, 2);
  assert.equal(cleaned.notes!.length, 1);
  assert.deepEqual(cleaned.projects.map(p => p.id), ['proj-1', 'proj-2', 'proj-3']);
});
test('changed scheduling and edited timestamps prevent accidental cleanup', () => {
  const data = seed();
  data.tasks[0].dueAt = new Date(Date.parse(data.tasks[0].dueAt!) + 86400000).toISOString();
  data.tasks[1].updatedAt = new Date(Date.parse(data.tasks[1].updatedAt) + 1).toISOString();
  assert.deepEqual(withoutLegacyDemo(data).tasks.map(t => t.id), [data.tasks[0].id, data.tasks[1].id]);
});
test('dates generated on a previous launch day still match untouched fixtures', () => {
  const older = JSON.parse(JSON.stringify(seed()), (_, value) => typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) ? new Date(Date.parse(value) - 7 * 86400000).toISOString() : value);
  const cleaned = withoutLegacyDemo(older);
  assert.equal(cleaned.tasks.length + cleaned.projects.length + cleaned.notes!.length, 0);
});
test('cleanup commits backup and tombstones together and runs only once', async () => {
  const data = seed();
  await transaction<void>(['tasks', 'projects', 'reviews', 'devices', 'notes', 'meta', 'syncMeta'], 'readwrite', tx => {
    for (const entity of ['tasks', 'projects', 'reviews', 'devices', 'notes'] as const) {
      tx.objectStore(entity).clear();
      for (const row of data[entity] || []) tx.objectStore(entity).put(row);
    }
    tx.objectStore('meta').delete('demo-cleanup-1.2.3');
    tx.objectStore('meta').put({ key: 'snapshot', schemaVersion: 3 });
  });
  const [cleaned, repeated] = await Promise.all([cleanLegacyDemoData(data), cleanLegacyDemoData(data)]);
  assert.equal(cleaned.tasks.length, 0);
  assert.equal(repeated.tasks.length, 0);
  const result = await transaction<any>(['meta', 'tasks', 'syncMeta'], 'readonly', (tx, done) => {
    const output: any = {};
    tx.objectStore('meta').get('before-demo-cleanup-1.2.3').onsuccess = e => { output.backup = (e.target as IDBRequest).result.value; };
    tx.objectStore('tasks').getAll().onsuccess = e => { output.tasks = (e.target as IDBRequest).result; };
    tx.objectStore('syncMeta').get('tasks:task-today-1').onsuccess = e => { output.change = (e.target as IDBRequest).result; done(output); };
  });
  assert.equal(result.backup.tasks.length, initialTasks.length);
  assert.deepEqual(result.tasks, []);
  assert.equal(result.change.deleted, true);
  await transaction<void>(['tasks'], 'readwrite', tx => { tx.objectStore('tasks').put(data.tasks[0]); });
  assert.equal((await cleanLegacyDemoData(data)).tasks.length, 1); // later explicit imports stay
});
test('aborted cleanup leaves original rows and can be retried', async () => {
  const data = seed();
  await transaction<void>(['tasks', 'projects', 'reviews', 'devices', 'notes', 'meta'], 'readwrite', tx => {
    tx.objectStore('meta').delete('demo-cleanup-1.2.3');
    for (const entity of ['tasks', 'projects', 'reviews', 'devices', 'notes'] as const) {
      tx.objectStore(entity).clear();
      for (const row of data[entity] || []) tx.objectStore(entity).put(row);
    }
  });
  const db = await openDB(), original = db.transaction.bind(db);
  db.transaction = ((names: string | string[], mode?: IDBTransactionMode, options?: IDBTransactionOptions) => {
    const tx = original(names, mode, options);
    if (mode === 'readwrite' && Array.from(tx.objectStoreNames).includes('syncMeta')) queueMicrotask(() => tx.abort());
    return tx;
  }) as typeof db.transaction;
  try { await assert.rejects(cleanLegacyDemoData(data)); }
  finally { db.transaction = original; }
  const rows = await transaction<any[]>(['tasks'], 'readonly', (tx, done) => { tx.objectStore('tasks').getAll().onsuccess = event => done((event.target as IDBRequest).result); });
  assert.equal(rows.length, initialTasks.length);
  assert.equal((await cleanLegacyDemoData(data)).tasks.length, 0);
});
