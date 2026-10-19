import { initialTasks, initialProjects, initialReviews, initialDevices } from '../data/legacyDemoData.ts';
import type { StoredData } from './migration.ts';
import { transaction, withNotesWrite } from './notesRepository.ts';
import { loadStorageData } from './storage.ts';
import { reviewToNote } from '../utils/notes.ts';

const datePattern = /^\d{4}-\d\d-\d\dT/;
const day = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
function signature(value: unknown, anchor: number): unknown {
  if (typeof value === 'string' && datePattern.test(value) && Number.isFinite(Date.parse(value))) {
    const date = new Date(value);
    return [day(date) - anchor, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()];
  }
  if (Array.isArray(value)) return value.map(item => signature(item, anchor));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, signature(item, anchor)]));
  return value;
}
function unchanged<T extends { id: string; createdAt?: string }>(row: T, fixtures: T[]) {
  const original = fixtures.find(item => item.id === row.id);
  if (!original) return false;
  // Seed dates were relative to first launch; preserve all relative dates, times and fields.
  return JSON.stringify(signature(row, row.createdAt ? day(new Date(row.createdAt)) : 0)) === JSON.stringify(signature(original, original.createdAt ? day(new Date(original.createdAt)) : 0));
}

export function withoutLegacyDemo(data: StoredData): StoredData {
  const tasks = data.tasks.filter(row => !unchanged(row, initialTasks));
  const notes = (data.notes || []).filter(row => !unchanged(row, initialReviews.map(reviewToNote)));
  const projects = data.projects.filter(row => !unchanged(row, initialProjects) || tasks.some(task => task.projectId === row.id || (!task.projectId && task.project === row.name)) || notes.some(note => note.projectId === row.id));
  return { ...data, tasks, projects, notes, reviews: data.reviews.filter(row => !unchanged(row, initialReviews)), devices: data.devices.filter(row => !unchanged(row, initialDevices)) };
}

/** One-time upgrade cleanup; backup and deletions commit together, attachments stay intact. */
export async function cleanLegacyDemoData(data: StoredData): Promise<StoredData> {
  return withNotesWrite(async () => {
  // React may start two loaders. Re-read after the preceding cleanup commits.
  data = await loadStorageData() || data;
  return transaction<StoredData>(['tasks', 'projects', 'reviews', 'devices', 'notes', 'meta', 'syncMeta'], 'readwrite', (tx, result) => {
    const marker = tx.objectStore('meta').get('demo-cleanup-1.2.3');
    marker.onsuccess = () => {
      if (marker.result) { result(data); return; }
      const cleaned = withoutLegacyDemo(data), stamp = new Date().toISOString();
      const entities = ['tasks', 'projects', 'reviews', 'devices', 'notes'] as const;
      const changed = entities.some(entity => cleaned[entity]!.length !== (data[entity] || []).length);
      if (changed) {
        tx.objectStore('meta').put({ key: 'before-demo-cleanup-1.2.3', value: data, savedAt: stamp });
        for (const entity of entities) {
          tx.objectStore(entity).clear();
          for (const row of cleaned[entity] || []) tx.objectStore(entity).put(row);
          const ids = new Set(cleaned[entity]!.map(row => row.id));
          for (const row of data[entity] || []) if (!ids.has(row.id)) {
            tx.objectStore(entity).delete(row.id);
            if (entity === 'tasks' || entity === 'projects' || entity === 'notes') {
              const id = `${entity}:${row.id}`, request = tx.objectStore('syncMeta').get(id);
              request.onsuccess = () => tx.objectStore('syncMeta').put({ id, entity, entityId: row.id, revision: (request.result?.revision || 0) + 1, updatedAt: stamp, deleted: true });
            }
          }
        }
        tx.objectStore('meta').put({ key: 'snapshot', schemaVersion: 3, savedAt: stamp });
      }
      tx.objectStore('meta').put({ key: 'demo-cleanup-1.2.3', value: true, savedAt: stamp });
      result(cleaned);
    };
  });
  });
}
