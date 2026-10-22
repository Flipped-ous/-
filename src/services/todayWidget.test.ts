import test from 'node:test';
import assert from 'node:assert/strict';
import { createWidgetMirror, widgetSnapshot, type WidgetSnapshot } from './todayWidget.ts';
import { initialSettings } from '../data/initialData.ts';
import type { Task } from '../types/index.ts';
const task: Task = { id: 'real-id', title: '真实待办', status: 'pending', priority: 'normal', project: '', dueAt: new Date(2026, 9, 20, 0).toISOString(), dueTime: '00:00', note: '不进入桌面镜像的正文', createdAt: '', updatedAt: '' };

test('widget projection keeps midnight and manual order without copying note bodies', () => {
  const result = widgetSnapshot([task, { ...task, id: 'no-date', dueAt: undefined }], initialSettings, 3);
  assert.equal(result.tasks.length, 1);
  assert.equal(result.tasks[0].hasTime, true);
  assert.equal(result.tasks[0].dueTime, '00:00');
  assert.equal(result.tasks[0].order, 0);
  assert.equal('note' in result.tasks[0], false);
  assert.equal(widgetSnapshot([], { ...initialSettings, theme: 'dark' }, 4).dark, true);
});
test('widget updates serialize, advance revisions and recover from a failed write', async () => {
  const received: WidgetSnapshot[] = []; let fail = true;
  const mirror = createWidgetMirror({ getStatus: async () => ({ revision: Date.now()+1000 }), updateSnapshot: async value => { if(fail) { fail=false; throw new Error('disk'); } received.push(value); } }, () => true);
  await assert.rejects(mirror([task], initialSettings));
  await Promise.all([mirror([task], initialSettings), mirror([], initialSettings)]);
  assert.equal(received.length, 2);
  assert.ok(received[1].revision > received[0].revision);
  assert.equal(received[0].tasks.length, 1);
  assert.equal(received[1].tasks.length, 0);
});
test('browser preview never calls the native widget bridge', async () => {
  const mirror=createWidgetMirror({ getStatus: async()=>{throw new Error('native')}, updateSnapshot: async()=>{throw new Error('native')} },()=>false);
  await mirror([task], initialSettings);
});
