import test from "node:test";
import assert from "node:assert/strict";
import { planReminders } from "./reminderPlan.ts";
import { applyReminderPlan } from "./reminders.ts";
import { validateLegacyLanDelta } from "./legacyLanContract.ts";
import type { Task, AppSettings } from "../types/index.ts";
const now = new Date(2026, 9, 18, 9).getTime(),
  due = new Date(2026, 9, 18, 10).toISOString();
const task: Task = {
  id: "task",
  title: "真实截止提醒",
  status: "pending",
  priority: "normal",
  project: "",
  dueAt: due,
  dueTime: "10:00",
  createdAt: new Date(now).toISOString(),
  updatedAt: new Date(now).toISOString(),
};
const settings: AppSettings = {
  theme: "light",
  motion: "standard",
  motionEnabled: true,
  notification: "gentle",
};
test("only pending explicitly timed tasks notify; dates, completed tasks and disabled policies stay quiet", () => {
  assert.equal(planReminders([task], settings, now).length, 1);
  assert.equal(
    planReminders([{ ...task, dueTime: undefined }], settings, now).length,
    0,
  );
  assert.equal(
    planReminders([{ ...task, status: "completed" }], settings, now).length,
    0,
  );
  assert.equal(
    planReminders([task], { ...settings, notification: "off" }, now).length,
    0,
  );
  assert.equal(
    planReminders([task], { ...settings, notification: "important" }, now)
      .length,
    0,
  );
  assert.equal(
    planReminders(
      [{ ...task, priority: "important" }],
      { ...settings, notification: "important" },
      now,
    ).length,
    1,
  );
  assert.equal(
    planReminders([task], settings, new Date(due).getTime() + 1).length,
    0,
  );
});
test("early reminders keep the deadline event and stable identifiers, including midnight", () => {
  const plans = planReminders(
    [task],
    { ...settings, reminderLeadMinutes: 10 },
    now,
  );
  assert.equal(plans.length, 2);
  assert.equal(plans[0].at, new Date(due).getTime() - 600000);
  assert.equal(new Set(plans.map((p) => p.id)).size, 2);
  assert.equal(
    planReminders([{ ...task, title: "改名" }], settings, now)[0].id,
    planReminders([task], settings, now)[0].id,
  );
  assert.equal(
    planReminders(
      [
        {
          ...task,
          dueTime: "00:00",
          dueAt: new Date(2026, 9, 19).toISOString(),
        },
      ],
      settings,
      now,
    ).length,
    1,
  );
});
test("system boundary updates changed notifications, cancels deleted ones, and leaves unrelated test notifications alone", async () => {
  const plans = planReminders([task], settings, now);
  let pending: any[] = [];
  const canceled: number[] = [],
    scheduled: any[] = [];
  const api: any = {
    getPending: async () => ({ notifications: pending }),
    cancel: async ({ notifications }: any) => {
      canceled.push(...notifications.map((x: any) => x.id));
      pending = pending.filter(
        (x) => !notifications.some((n: any) => n.id === x.id),
      );
    },
    schedule: async ({ notifications }: any) => {
      scheduled.push(...notifications);
      pending.push(...notifications);
    },
  };
  await applyReminderPlan(plans, api);
  assert.equal(scheduled.length, 1);
  await applyReminderPlan(plans, api);
  assert.equal(scheduled.length, 1);
  await applyReminderPlan(
    planReminders([{ ...task, title: "修改后的任务" }], settings, now),
    api,
  );
  assert.equal(canceled.length, 1);
  assert.equal(scheduled.length, 2);
  pending.push({ id: 2100000001, extra: { owner: "youxu-test" } });
  await applyReminderPlan([], api);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].id, 2100000001);
});
test("old APK field-clock protocol is distinct from the new internal exchange contract", () => {
  const delta = {
    protocol: 1,
    records: {
      "tasks:task": {
        birth: [1, "phone"],
        dead: null,
        fields: {
          '["title"]': {
            s: [2, "phone"],
            ctx: { phone: 1 },
            present: true,
            value: "兼容字段",
          },
        },
      },
    },
  };
  assert.equal(validateLegacyLanDelta(delta).valid, true);
  assert.equal(
    validateLegacyLanDelta({ protocolVersion: 1, records: [] }).valid,
    false,
  );
  const bad: any = structuredClone(delta);
  bad.records["tasks:task"].fields['["__proto__"]'] =
    bad.records["tasks:task"].fields['["title"]'];
  assert.equal(validateLegacyLanDelta(bad).valid, false);
});
