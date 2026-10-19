import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { AppSettings, Task } from '../types/index.ts';
import { taskTime } from '../utils/taskPresentation.ts';

export interface WidgetLaunch { action?: 'today' | 'add' | 'task'; taskId?: string }
export interface WidgetSnapshot {
  revision: number; dark: boolean;
  tasks: { id: string; title: string; dueAt: number; pending: boolean; hasTime: boolean; dueTime: string; order: number }[];
}
interface WidgetAPI {
  getStatus(): Promise<{ revision: number }>;
  updateSnapshot(snapshot: WidgetSnapshot): Promise<void>;
}
export const TodayWidget = registerPlugin<WidgetAPI & {
  consumeLaunch(): Promise<WidgetLaunch>;
  addListener(event: 'openWidget', callback: (request: WidgetLaunch) => void): Promise<PluginListenerHandle>;
}>('TodayWidget');

export function widgetSnapshot(tasks: Task[], settings: AppSettings, revision: number): WidgetSnapshot {
  return { revision, dark: settings.theme === 'dark', tasks: tasks.flatMap((task, index) => {
    const dueAt = Date.parse(task.dueAt || '');
    if (!Number.isFinite(dueAt) || !task.title.trim()) return [];
    return [{ id: task.id, title: task.title, dueAt, pending: task.status === 'pending', hasTime: !!taskTime(task), dueTime: task.dueTime || '', order: task.order ?? index }];
  }) };
}
/** No task or note body is stored natively; writes follow committed business snapshots. */
export function createWidgetMirror(api: WidgetAPI, supported = () => Capacitor.isNativePlatform()) {
  let initialized = false, revision = 0, queue: Promise<unknown> = Promise.resolve();
  return (tasks: Task[], settings: AppSettings) => {
    if (!supported()) return Promise.resolve();
    const snapshot = widgetSnapshot(tasks, settings, 0);
    const next = queue.catch(() => {}).then(async () => {
      if (!initialized) { revision = (await api.getStatus()).revision; initialized = true; }
      revision = Math.max(revision + 1, Date.now());
      await api.updateSnapshot({ ...snapshot, revision });
    });
    queue = next;
    return next;
  };
}
export const mirrorTodayWidget = createWidgetMirror(TodayWidget);
