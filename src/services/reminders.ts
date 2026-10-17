import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { AppSettings, Task } from "../types/index.ts";
import { NativeAppearance } from "./native.ts";
import { planReminders, type ReminderPlan } from "./reminderPlan.ts";
const owner = "youxu-task-reminder-v1";
export interface ReminderStatus {
  supported: boolean;
  granted: boolean;
  exact: boolean;
  pending: number;
  error?: string;
}
export const webReminderStatus: ReminderStatus = {
  supported: false,
  granted: false,
  exact: false,
  pending: 0,
};
let work: Promise<unknown> = Promise.resolve();
export async function readReminderStatus(): Promise<ReminderStatus> {
  if (!Capacitor.isNativePlatform()) return webReminderStatus;
  const [permission, exact, pending] = await Promise.all([
    LocalNotifications.checkPermissions(),
    LocalNotifications.checkExactNotificationSetting(),
    LocalNotifications.getPending(),
  ]);
  return {
    supported: true,
    granted: permission.display === "granted",
    exact: exact.exact_alarm === "granted",
    pending: pending.notifications.filter((n) => n.extra?.owner === owner)
      .length,
  };
}
/** Injectable system boundary allows real cancellation/update logic to be tested without posting OS notifications. */
export async function applyReminderPlan(
  plans: ReminderPlan[],
  api: Pick<
    typeof LocalNotifications,
    "getPending" | "cancel" | "schedule"
  > = LocalNotifications,
) {
  const existing = (await api.getPending()).notifications.filter(
    (n) => n.extra?.owner === owner,
  );
  const desired = new Map(plans.map((p) => [p.id, p]));
  const remove = existing
    .filter(
      (n) =>
        !desired.has(n.id) ||
        desired.get(n.id)!.fingerprint !== n.extra?.fingerprint,
    )
    .map((n) => ({ id: n.id }));
  if (remove.length) await api.cancel({ notifications: remove });
  const unchanged = new Set(
    existing
      .filter((n) => desired.get(n.id)?.fingerprint === n.extra?.fingerprint)
      .map((n) => n.id),
  );
  const add = plans.filter((p) => !unchanged.has(p.id));
  if (add.length)
    await api.schedule({
      notifications: add.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        channelId: p.channelId,
        smallIcon: "ic_stat_note",
        iconColor: "#A55340",
        schedule: { at: new Date(p.at), allowWhileIdle: true },
        extra: { owner, taskId: p.taskId, fingerprint: p.fingerprint },
      })),
    });
}
export function reconcileReminders(
  tasks: Task[],
  settings: AppSettings,
): Promise<ReminderStatus> {
  const next = work
    .catch(() => {})
    .then(async () => {
      if (!Capacitor.isNativePlatform()) return webReminderStatus;
      await NativeAppearance.prepareReminderChannels();
      const state = await readReminderStatus();
      await applyReminderPlan(
        state.granted ? planReminders(tasks, settings) : [],
      );
      return readReminderStatus();
    });
  work = next;
  return next;
}
export async function requestReminderPermission() {
  if (!Capacitor.isNativePlatform())
    throw new Error("系统提醒请在 Android App 中开启");
  await LocalNotifications.requestPermissions();
  return readReminderStatus();
}
export async function testReminder() {
  if (!Capacitor.isNativePlatform())
    throw new Error("请在 Android App 中测试系统通知");
  const state = await readReminderStatus();
  if (!state.granted) throw new Error("请先允许系统通知");
  await NativeAppearance.prepareReminderChannels();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 2100000001,
        title: "今日有序 · 提醒测试",
        body: "这是一条由手机系统投递的本地提醒。",
        channelId: "youxu-gentle-v1",
        smallIcon: "ic_stat_note",
        iconColor: "#A55340",
        schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
        extra: { owner: "youxu-test" },
      },
    ],
  });
}
export const openExactAlarmSettings = () =>
  LocalNotifications.changeExactNotificationSetting();
export const onReminderAction = (callback: (id: string) => void) =>
  LocalNotifications.addListener(
    "localNotificationActionPerformed",
    (event) => {
      if (
        event.notification.extra?.owner === owner &&
        typeof event.notification.extra.taskId === "string"
      )
        callback(event.notification.extra.taskId);
    },
  );
