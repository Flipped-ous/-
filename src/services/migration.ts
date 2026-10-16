import type {
  Task,
  Project,
  ReviewEntry,
  AppSettings,
  SyncDevice,
} from '../types/index.ts';

export interface StoredData {
  schemaVersion: number;
  tasks: Task[];
  projects: Project[];
  reviews: ReviewEntry[];
  settings: AppSettings | null;
  devices: SyncDevice[];
}

const validDate = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));

/** Converts the previous arrays/innerTasks format once, preserving IDs and timestamps. */
export function migrateStorageData(
  raw: any,
  reference = new Date(),
): StoredData {
  if (!raw || typeof raw !== 'object') throw new Error('�������ݸ�ʽ��');
  if (raw.schemaVersion > 2)
    throw new Error('�����������Ը��°汾��������Ӧ��');
  const stamp = reference.toISOString();
  const projects: Project[] = (raw.projects || []).map((p: any) => {
    if (!p || typeof p.id !== 'string' || typeof p.name !== 'string')
      throw new Error('��Ŀ���ݸ�ʽ��');
    const { innerTasks, pendingCount, completedCount, ...rest } = p;
    return {
      ...rest,
      description: p.description || '',
      docs: p.docs || [],
      createdAt: validDate(p.createdAt) ? p.createdAt : stamp,
      updatedAt: validDate(p.updatedAt) ? p.updatedAt : stamp,
    };
  });
  const taskMap = new Map<string, Task>();
  const taskRows = raw.tasks ?? [
    ...(raw.allTasks || []),
    ...(raw.todayTasks || []),
  ];
  for (const t of taskRows) {
    if (!t || typeof t.id !== 'string' || typeof t.title !== 'string')
      throw new Error('�������ݸ�ʽ��');
    const project = projects.find(
      (p) => p.id === t.projectId || p.name === t.project,
    );
    let dueAt = validDate(t.dueAt) ? t.dueAt : undefined;
    if (!dueAt && t.dueCategory && t.dueCategory !== 'none') {
      const d = new Date(reference);
      d.setDate(
        d.getDate() +
          (t.dueCategory === 'overdue'
            ? -1
            : t.dueCategory === 'future'
              ? 1
              : 0),
      );
      const [h, m] = /^\d\d:\d\d$/.test(t.dueTime || '')
        ? t.dueTime.split(':').map(Number)
        : [18, 0];
      d.setHours(h, m, 0, 0);
      dueAt = d.toISOString();
    }
    const { dueCategory, dueLabel, ...rest } = t;
    taskMap.set(t.id, {
      ...rest,
      dueAt,
      projectId: project?.id || t.projectId,
      project: project?.name || t.project || '',
      status: t.status === 'completed' ? 'completed' : 'pending',
      priority: t.priority || 'normal',
      createdAt: validDate(t.createdAt) ? t.createdAt : stamp,
      updatedAt: validDate(t.updatedAt) ? t.updatedAt : stamp,
    });
  }
  for (const p of raw.projects || []) {
    for (const t of p.innerTasks || []) {
      const id = `legacy-${p.id}-${t.id}`;
      if (
        !taskMap.has(t.id) &&
        !taskMap.has(id) &&
        ![...taskMap.values()].some(
          (task) => task.projectId === p.id && task.title === t.title,
        )
      )
        taskMap.set(id, {
          id,
          title: t.title,
          status: t.completed ? 'completed' : 'pending',
          priority: 'normal',
          projectId: p.id,
          project: p.name,
          createdAt: stamp,
          updatedAt: stamp,
          dueAt: undefined,
          completedAt: undefined,
        });
    }
  }
  const reviews: ReviewEntry[] = (raw.reviews || []).map((r: any) => ({
    ...r,
    createdAt: validDate(r.createdAt) ? r.createdAt : stamp,
    updatedAt: validDate(r.updatedAt) ? r.updatedAt : stamp,
  }));
  return {
    schemaVersion: 2,
    tasks: [...taskMap.values()],
    projects,
    reviews,
    settings: raw.settings || null,
    devices: raw.devices || [],
  };
}
