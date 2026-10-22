import type { Task } from '../types/index.ts';
import type { StoredData } from './migration.ts';
import { saveStorageData } from './storage.ts';

/** A caller must not publish the result until this complete snapshot commits. */
export async function commitTaskBatch<T extends { tasks: Task[]; count: number }>(
  snapshot: StoredData,
  transform: (tasks: Task[]) => T,
  persist: (value: StoredData) => Promise<void> = saveStorageData,
): Promise<T> {
  const result = transform(snapshot.tasks);
  if (result.count) await persist({ ...snapshot, tasks: result.tasks });
  return result;
}
