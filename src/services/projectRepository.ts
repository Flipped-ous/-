import { moveProject } from '../utils/projectOrder.ts';
import type { Note, Project, Task } from '../types/index.ts';
import { detachProject, restoreProject, type ProjectDeletion } from '../utils/projectRelations.ts';
import { transaction, withNotesWrite } from './notesRepository.ts';
import { flushStorageData } from './storage.ts';

type Rows = { projects: Project[]; tasks: Task[]; notes: Note[] };
function change<T extends Rows>(transform: (rows: Rows, stamp: string) => T): Promise<T> {
  return withNotesWrite(async () => {
    await flushStorageData();
    return transaction<T>(['projects', 'tasks', 'notes', 'syncMeta', 'meta'], 'readwrite', (tx, result) => {
      const rows = {} as Rows;
      let count = 0;
      for (const kind of ['projects', 'tasks', 'notes'] as const) {
        const request = tx.objectStore(kind).getAll();
        request.onsuccess = () => {
          (rows[kind] as unknown[]) = request.result;
          if (++count !== 3) return;
          const stamp = new Date().toISOString();
          let after: T;
          try { after = transform(rows, stamp); } catch (error) { tx.abort(); return; }
          for (const entity of ['projects', 'tasks', 'notes'] as const) {
            const before = new Map<string, Project | Task | Note>(rows[entity].map(row => [row.id, row]));
            const next = new Map<string, Project | Task | Note>(after[entity].map(row => [row.id, row]));
            for (const id of new Set([...before.keys(), ...next.keys()])) {
              const value = next.get(id);
              if (JSON.stringify(value) === JSON.stringify(before.get(id))) continue;
              const key = `${entity}:${id}`;
              const revision = tx.objectStore('syncMeta').get(key);
              revision.onsuccess = () => {
                const number = Math.max(revision.result?.revision || 0, entity === 'notes' && value ? (value as Note).revision : 0) + 1;
                if (entity === 'notes' && value) (value as Note).revision = number;
                if (value) tx.objectStore(entity).put(value); else tx.objectStore(entity).delete(id);
                tx.objectStore('syncMeta').put({ id: key, entity, entityId: id, revision: number, updatedAt: stamp, deleted: !value, value });
              };
            }
          }
          tx.objectStore('meta').put({ key: 'snapshot', schemaVersion: 3, savedAt: stamp });
          result(after);
        };
      }
    });
  });
}
export const removeProject = (id: string) => change((rows, stamp) => detachProject(rows.projects, rows.tasks, rows.notes, id, stamp));
export const undoRemoveProject = (undo: ProjectDeletion) => change((rows, stamp) => restoreProject(rows.projects, rows.tasks, rows.notes, undo, stamp));

export const reorderProject = (id: string, target: string, after: boolean) => change((rows, stamp) => ({ ...rows, projects: moveProject(rows.projects, id, target, after, stamp) }));
