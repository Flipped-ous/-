import type { Task, AppSettings } from "../types/index.ts";
export interface ReminderPlan {
  id: number;
  taskId: string;
  at: number;
  title: string;
  body: string;
  channelId: string;
  fingerprint: string;
}
export function planReminders(
  tasks: Task[],
  settings: AppSettings,
  now = Date.now(),
): ReminderPlan[] {
  if (settings.notification === "off") return [];
  const used = new Set<number>(),
    plans: ReminderPlan[] = [];
  const lead = [0, 5, 10, 15, 30, 60].includes(
    settings.reminderLeadMinutes || 0,
  )
    ? settings.reminderLeadMinutes || 0
    : 0;
  for (const task of [...tasks].sort((a, b) => a.id.localeCompare(b.id))) {
    if (
      task.status !== "pending" ||
      (settings.notification === "important" &&
        !["urgent", "important"].includes(task.priority))
    )
      continue;
    const due = Date.parse(task.dueAt || "");
    if (
      !Number.isFinite(due) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(task.dueTime || "")
    )
      continue;
    const moments: [string, number, string][] = [
      ["due", due, "到安排的时间了"],
    ];
    if (lead > 0)
      moments.unshift(["early", due - lead * 60000, `${lead} 分钟后到期`]);
    if (task.reminderAt && Number.isFinite(Date.parse(task.reminderAt)))
      moments.push(["custom", Date.parse(task.reminderAt), "任务提醒"]);
    const seenTimes = new Set<number>();
    for (const [kind, at, body] of moments) {
      if (at <= now || seenTimes.has(at)) continue;
      seenTimes.add(at);
      let hash = 2166136261;
      for (const char of `${task.id}:${kind}`)
        hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
      let id = ((hash >>> 0) % 2000000000) + 1;
      while (used.has(id)) id = (id % 2000000000) + 1;
      used.add(id);
      const channelId =
        settings.notification === "all" ? "youxu-alert-v1" : "youxu-gentle-v1";
      plans.push({
        id,
        taskId: task.id,
        at,
        title: task.title,
        body,
        channelId,
        fingerprint: JSON.stringify([task.id, at, task.title, body, channelId]),
      });
    }
  }
  return plans.sort((a, b) => a.at - b.at);
}
