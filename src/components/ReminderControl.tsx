import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Capacitor } from "@capacitor/core";
import type { AppSettings } from "../types/index.ts";
import { useDialog } from "../hooks/useDialog.ts";
import { NativeAppearance } from "../services/native.ts";
import { TimeField } from './TimeField.tsx';
import {
  openExactAlarmSettings,
  readReminderStatus,
  requestReminderPermission,
  testReminder,
  webReminderStatus,
  type ReminderStatus,
} from "../services/reminders.ts";
export function ReminderControl({
  settings,
  onChange,
  onRefresh,
}: {
  settings: AppSettings;
  onChange?: (patch: Partial<AppSettings>) => void;
  onRefresh?: () => void;
}) {
  const [open, setOpen] = useState(false),
    [status, setStatus] = useState<ReminderStatus>(webReminderStatus),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [wrapTime, setWrapTime] = useState(settings.wrapReminderTime || '21:00');
  useEffect(() => setWrapTime(settings.wrapReminderTime || '21:00'), [settings.wrapReminderTime, open]);
  useDialog(open, () => setOpen(false));
  const refresh = () =>
    void readReminderStatus()
      .then(setStatus)
      .catch((e) => setMessage(e.message));
  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [open]);
  const action = async (fn: () => Promise<unknown>, success = "") => {
    setBusy(true);
    try {
      await fn();
      setMessage(success);
      refresh();
      onRefresh?.();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const labels = {
    gentle: "温和提醒",
    important: "仅重要任务",
    all: "有声提醒",
    off: "已关闭",
  };
  return (
    <>
      <button className="reminder-setting-row" onClick={() => setOpen(true)}>
        <span className="material-symbols-outlined">notifications</span>
        <span>
          <strong>提醒策略</strong>
          <small>任务提醒与每日收工整理</small>
        </span>
        <span>{labels[settings.notification]} ›</span>
      </button>
      {open &&
        createPortal(
          <div className="reminder-backdrop">
            <section
              role="dialog"
              aria-modal="true"
              aria-label="系统提醒设置"
              className="reminder-dialog"
            >
              <header>
                <h2>提醒策略</h2>
                <button
                  aria-label="关闭提醒设置"
                  onClick={() => setOpen(false)}
                >
                  ✕
                </button>
              </header>
              <p>
                设置日期和具体时间后，由手机系统投递提醒。只设置日期的任务不会在午夜提醒。
              </p>
              {!status.supported ? (
                <p className="note-error">
                  浏览器预览不发送系统提醒，请在 Android App 中开启。
                </p>
              ) : (
                <>
                  <div className="reminder-permission">
                    <strong>
                      通知权限：{status.granted ? "已允许" : "未允许"}
                    </strong>
                    <button
                      disabled={busy}
                      onClick={() =>
                        void action(() =>
                          status.granted
                            ? NativeAppearance.openNotificationSettings()
                            : requestReminderPermission(),
                        )
                      }
                    >
                      {status.granted ? "系统通知设置" : "允许通知"}
                    </button>
                  </div>
                  <div className="reminder-permission">
                    <span>
                      准确时间提醒：
                      {status.exact ? "已允许" : "未允许，可能延迟"}
                    </span>
                    <button
                      disabled={busy}
                      onClick={() => void action(openExactAlarmSettings)}
                    >
                      设置
                    </button>
                  </div>
                </>
              )}
              <section className="wrap-reminder">
                <h3>每日收工</h3>
                <label>收工整理提醒<input type="checkbox" role="switch" aria-label="收工整理提醒" checked={settings.wrapReminderEnabled !== false} onChange={event => {
                  const enabled = event.target.checked;
                  onChange?.({ wrapReminderEnabled: enabled });
                  if (enabled && status.supported && !status.granted) void action(requestReminderPermission);
                }} /></label>
                <p className="agenda-muted">仅在有逾期或今天未完成的任务时提醒，不会自动更改任务日期。</p>
                <label>提醒时间 <span>{settings.wrapReminderTime || '21:00'}</span></label>
                <TimeField value={wrapTime} onChange={setWrapTime} />
                <button className="agenda-link" disabled={busy || !/^(?:[01]?\d|2[0-3]):[0-5]?\d$/.test(wrapTime)} onClick={() => {
                  onChange?.({ wrapReminderTime: wrapTime.split(':').map(part => part.padStart(2, '0')).join(':') });
                  setMessage('收工提醒时间已更新');
                }}>保存提醒时间</button>
                {!status.granted && <p className="agenda-muted">通知权限未允许，开启后才能收到晚间提醒。</p>}
              </section>
              <h3 className="agenda-muted">单项任务提醒</h3>
              <div className="reminder-options">
                {(["gentle", "important", "all", "off"] as const).map((v) => (
                  <button
                    key={v}
                    aria-pressed={settings.notification === v}
                    disabled={!status.supported}
                    onClick={() => onChange?.({ notification: v })}
                  >
                    {labels[v]}
                  </button>
                ))}
              </div>
              <label className="reminder-lead">
                提前提醒
                <select
                  aria-label="提前提醒"
                  disabled={!status.supported}
                  value={settings.reminderLeadMinutes || 0}
                  onChange={(e) =>
                    onChange?.({ reminderLeadMinutes: Number(e.target.value) })
                  }
                >
                  {[0, 5, 10, 15, 30, 60].map((v) => (
                    <option key={v} value={v}>
                      {v ? `提前 ${v} 分钟，并在到期时提醒` : "仅到期时"}
                    </option>
                  ))}
                </select>
              </label>
              <p className="note-meta">
                温和提醒不播放声音；有声提醒使用系统提示音。仅重要任务包含“紧急且重要”和“重要不紧急”。实际声音与振动以系统通知渠道设置为准。
              </p>
              <p className="note-meta">
                已安排 {status.pending}{" "}
                条任务提醒。重启手机后由系统恢复；强行停止应用或厂商省电限制可能阻止投递。
              </p>
              {message && (
                <p role="status" className="note-error">
                  {message}
                </p>
              )}
              <button
                className="note-primary"
                disabled={busy || !status.granted}
                onClick={() =>
                  void action(
                    testReminder,
                    "已安排测试通知，约 5 秒后由系统投递；请同时检查通知栏。",
                  )
                }
              >
                发送测试通知
              </button>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
