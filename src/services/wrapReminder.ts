import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { AppSettings, Task } from '../types/index.ts';

export const WrapReminder = registerPlugin<{
  getStatus(): Promise<{ revision: number }>;
  updateSnapshot(options: { revision: number; enabled: boolean; time: string; tasks: { dueAt: number; pending: boolean }[] }): Promise<void>;
  consumeLaunch(): Promise<{ requested: boolean }>;
  addListener(event: 'openWrapUp', callback: () => void): Promise<PluginListenerHandle>;
}>('WrapReminder');
let revision = 0;
let initialized = false;
let queue: Promise<unknown> = Promise.resolve();
/** Call only after the associated business snapshot commits. Ordered across retries. */
export function mirrorWrapReminder(tasks: Task[], settings: AppSettings) {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  const snapshot = {
    enabled: settings.wrapReminderEnabled !== false,
    time: settings.wrapReminderTime || '21:00',
    tasks: tasks.filter(t => Number.isFinite(Date.parse(t.dueAt || ''))).map(t => ({ dueAt: Date.parse(t.dueAt!), pending: t.status === 'pending' })),
  };
  const next = queue.catch(() => {}).then(async () => {
    if (!initialized) { revision = (await WrapReminder.getStatus()).revision; initialized = true; }
    revision = Math.max(revision + 1, Date.now());
    await WrapReminder.updateSnapshot({ ...snapshot, revision });
  });
  queue = next;
  return next;
}
