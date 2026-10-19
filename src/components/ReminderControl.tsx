import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AppSettings } from '../types/index.ts';
import { useDialog } from '../hooks/useDialog.ts';
import { NativeAppearance } from '../services/native.ts';
import { TimeField } from './TimeField.tsx';
import { openExactAlarmSettings, readReminderStatus, requestReminderPermission, testReminder, webReminderStatus, type ReminderStatus } from '../services/reminders.ts';

const labels = { gentle: '温和', important: '仅重要', all: '有声', off: '关闭' };
const hints = {
  gentle: '到点轻振动，不播放声音。',
  important: '只提醒「紧急且重要」和「重要不紧急」的任务。',
  all: '到点播放系统提示音。',
  off: '已关闭单项任务提醒，不影响每日收工。',
};
export function ReminderControl({ settings, onChange, onRefresh }: {
  settings: AppSettings; onChange?: (patch: Partial<AppSettings>) => void; onRefresh?: () => void;
}) {
  const [open, setOpen] = useState(false), [status, setStatus] = useState<ReminderStatus>(webReminderStatus);
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [editingTime, setEditingTime] = useState(false), [wrapTime, setWrapTime] = useState(settings.wrapReminderTime || '21:00');
  const timeId = useId(), wrapEnabled = settings.wrapReminderEnabled !== false;
  useEffect(() => { setWrapTime(settings.wrapReminderTime || '21:00'); setEditingTime(false); }, [settings.wrapReminderTime, open]);
  useDialog(open, () => setOpen(false), '[aria-label="关闭提醒设置"]');
  const refresh = () => void readReminderStatus().then(setStatus).catch(e => setMessage(e.message));
  useEffect(() => {
    refresh(); window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [open]);
  const action = async (fn: () => Promise<unknown>, success = '') => {
    setBusy(true);
    try { await fn(); setMessage(success); refresh(); onRefresh?.(); }
    catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  };
  return <>
    <button className="reminder-setting-row" onClick={() => { setMessage(''); setOpen(true); }}>
      <span className="material-symbols-outlined">notifications</span>
      <span><strong>提醒策略</strong><small>任务提醒与每日收工整理</small></span>
      <span>{settings.notification === 'off' ? '已关闭' : `${labels[settings.notification]}提醒`} ›</span>
    </button>
    {open && createPortal(<div className="reminder-backdrop">
      <section role="dialog" aria-modal="true" aria-label="系统提醒设置" className="reminder-dialog reminder-compact">
        <header><div><h2>提醒策略</h2><p>按你的节奏，适时提醒</p></div><button aria-label="关闭提醒设置" onClick={() => setOpen(false)}>✕</button></header>
        <div className="reminder-content">
          {!status.supported ? <p className="reminder-status-line">浏览器预览 · 系统通知在手机端生效</p> : !status.granted ? <button className="reminder-permission-banner" disabled={busy} onClick={() => void action(requestReminderPermission)}>通知尚未允许 <span>去开启 →</span></button> : null}
          <section className="reminder-group" aria-label="每日收工设置">
            <div className="reminder-section-row">
              <h3>收工整理</h3>
              <div className="reminder-row-controls">
                <button className="reminder-time-pill" aria-label={`收工提醒时间 ${settings.wrapReminderTime || '21:00'}`} aria-expanded={editingTime} aria-controls={timeId} disabled={!wrapEnabled || busy} onClick={() => { setWrapTime(settings.wrapReminderTime || '21:00'); setEditingTime(!editingTime); }}>{settings.wrapReminderTime || '21:00'}<span aria-hidden="true">⌄</span></button>
                <button type="button" role="switch" aria-label="收工整理提醒" aria-checked={wrapEnabled} className="paper-switch" disabled={busy} onClick={() => {
                  onChange?.({ wrapReminderEnabled: !wrapEnabled }); setEditingTime(false);
                  if (!wrapEnabled && status.supported && !status.granted) void action(requestReminderPermission);
                }}><span /></button>
              </div>
            </div>
            <p className="reminder-hint">{wrapEnabled ? '每天在设定时间提醒，需有逾期或今日未完成任务。' : '已暂停每日收工提醒。'}</p>
            {editingTime && <div id={timeId} className="reminder-time-editor">
              <TimeField value={wrapTime} onChange={setWrapTime} allowClear={false} />
              <div><button onClick={() => setEditingTime(false)}>取消</button><button className="reminder-time-save" disabled={busy || !/^(?:[01]?\d|2[0-3]):[0-5]?\d$/.test(wrapTime)} onClick={() => {
                onChange?.({ wrapReminderTime: wrapTime.split(':').map(part => part.padStart(2, '0')).join(':') }); setEditingTime(false);
              }}>确定</button></div>
            </div>}
          </section>
          <section className="reminder-group" aria-label="单项任务提醒设置">
            <h3>任务提醒</h3>
            <div className="reminder-policy-options" role="group" aria-label="任务提醒方式">
              {(['gentle', 'important', 'all', 'off'] as const).map(policy => <button key={policy} aria-pressed={settings.notification === policy} disabled={!status.supported || busy} onClick={() => onChange?.({ notification: policy })}>{labels[policy]}</button>)}
            </div>
            <p className="reminder-hint">{hints[settings.notification]}</p>
            <div className="reminder-lead-heading"><h4>提前提醒</h4><span>到期时仍会提醒</span></div>
            <div role="radiogroup" aria-label="提前提醒" className="reminder-lead-options">
              {[0, 5, 10, 15, 30, 60].map((value, index, options) => <button key={value} type="button" role="radio" aria-checked={(settings.reminderLeadMinutes || 0) === value} disabled={busy} tabIndex={(settings.reminderLeadMinutes || 0) === value ? 0 : -1} onClick={() => onChange?.({ reminderLeadMinutes: value })} onKeyDown={event => {
                const step = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
                if (!step && event.key !== 'Home' && event.key !== 'End') return;
                event.preventDefault();
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + step + options.length) % options.length;
                onChange?.({ reminderLeadMinutes: options[next] }); (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
              }}>{value ? `${value} 分钟` : '仅到期'}</button>)}
            </div>
          </section>
          <details className="reminder-advanced">
            <summary>权限与提醒说明 <span aria-hidden="true">⌄</span></summary>
            <div className="reminder-advanced-content">
              {status.supported && <>
                <div className="reminder-permission"><span>通知权限 · {status.granted ? '已允许' : '未允许'}</span><button disabled={busy} onClick={() => void action(() => status.granted ? NativeAppearance.openNotificationSettings() : requestReminderPermission())}>{status.granted ? '系统设置' : '去开启'}</button></div>
                <div className="reminder-permission"><span>准时提醒 · {status.exact ? '已允许' : '可能延迟'}</span><button disabled={busy} onClick={() => void action(openExactAlarmSettings)}>设置</button></div>
              </>}
              <p>任务需设置日期和具体时间才会提醒；收工整理不会自动改期。</p>
              <p>声音与振动以系统通知设置为准。重启后恢复提醒，强行停止或省电限制可能影响投递。</p>
              <div className="reminder-test-row"><span>已安排 {status.pending} 条任务提醒</span><button disabled={busy || !status.granted} onClick={() => void action(testReminder, '已安排测试通知，约 5 秒后查看通知栏。')}>测试通知</button></div>
              <small>仅用于检查通知，不会创建或修改待办。</small>
            </div>
          </details>
          {message && <p role="status" className="reminder-feedback">{message}</p>}
        </div>
      </section>
    </div>, document.body)}
  </>;
}
