import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { createPortal } from 'react-dom';
import { useDialog } from '../hooks/useDialog.ts';
import { InlineCalendar } from './InlineCalendar.tsx';
import { dateSummary } from '../utils/calendar.ts';
import { localDateValue, quickDate } from '../utils/taskEdit.ts';
import { taskDate, taskTime, wrapTasks, orderAgenda } from '../utils/taskPresentation.ts';
import type { ScheduleUndo } from '../utils/wrapUp.ts';
import type { Task } from '../types/index.ts';
export interface WrapResult { count: number; skipped: number; undo?: ScheduleUndo[] }
export function WrapUpSheet({ tasks, onClose, onApply, onUndo, onComplete }: {
 tasks: Task[]; onClose: () => void;
 onApply: (ids: string[], date: string) => Promise<WrapResult>;
 onUndo: (records: ScheduleUndo[]) => Promise<WrapResult>;
 onComplete: (id: string) => Promise<void>;
}) {
 const [selected, setSelected] = useState<string[]>([]);
 const [action, setAction] = useState<'tomorrow' | 'date' | 'none'>('tomorrow');
 const [date, setDate] = useState(quickDate('tomorrow'));
 const [busy, setBusy] = useState(false);
 const lock = useRef(false);
 const scrollRef = useRef<HTMLDivElement>(null);
 const calendarRef = useRef<HTMLDivElement>(null);
 const reduced = useReducedMotion();
 const [error, setError] = useState('');
 const [notice, setNotice] = useState('');
 const [undo, setUndo] = useState<ScheduleUndo[]>([]);
 useEffect(() => { if (action === 'date') calendarRef.current?.scrollIntoView({ block: 'nearest' }); }, [action]);
 useEffect(() => { if (notice) scrollRef.current?.scrollTo({ top: 0 }); }, [notice]);
 const eligible = wrapTasks(tasks);
 const eligibleIds = eligible.map(t => t.id).join('|');
 useEffect(() => { setSelected(before => before.filter(id => eligible.some(t => t.id === id))); }, [eligibleIds]);
 useDialog(true, () => { if (!lock.current) onClose(); }, '[aria-label="关闭收工整理"]');
 const all = eligible.length > 0 && selected.length === eligible.length;
 const target = action === 'tomorrow' ? quickDate('tomorrow') : action === 'none' ? '' : date;
 const run = async (work: () => Promise<void>) => {
  if (lock.current) return; lock.current = true; setBusy(true); setError('');
  try { await work(); } catch (e) { setError((e as Error).message || '保存失败，请重试'); }
  finally { lock.current = false; setBusy(false); }
 };
 const commit = () => run(async () => {
  if (action === 'date' && (!date || date < localDateValue(new Date()))) throw new Error('请选择今天或以后的日期');
  const result = await onApply(selected, target);
  setUndo(result.undo || []); setSelected([]); setAction('tomorrow');
  setNotice(result.count ? `已将 ${result.count} 项任务${target ? `安排到${dateSummary(target)}` : '设为暂不安排'}${result.skipped ? `，跳过 ${result.skipped} 项已变化的任务` : ''}` : '任务已变化，请重新选择');
 });
 const toggle = (id: string) => setSelected(before => before.includes(id) ? before.filter(v => v !== id) : [...before, id]);
 return createPortal(<motion.div className="agenda-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none' }} transition={{ duration: reduced ? 0 : .18 }}><div className="agenda-dimmer" onClick={() => { if (!busy) onClose(); }} /><motion.section className="wrap-sheet" role="dialog" aria-modal="true" aria-label="收工整理" aria-busy={busy} initial={{ y: reduced ? 0 : 14 }} animate={{ y: 0 }} exit={{ y: reduced ? 0 : 10 }} transition={{ duration: reduced ? 0 : .18 }}>
  <div className="sheet-handle" aria-hidden="true" /><header className="agenda-header"><h2>收工整理</h2><button disabled={busy} aria-label="关闭收工整理" onClick={onClose}>×</button></header>
  <div ref={scrollRef} className="agenda-scroll" style={{ flex: 1 }}>
   <p className="agenda-muted">把没做完的事，安排到合适的时候。</p>
   {notice && <div role="status" className="wrap-success"><span>{notice}</span>{undo.length > 0 && <button disabled={busy} onClick={() => void run(async () => { const result = await onUndo(undo); setUndo([]); setNotice(`已撤销 ${result.count} 项${result.skipped ? `，跳过 ${result.skipped} 项已变化的任务` : ''}`); })}>撤销</button>}</div>}
   {eligible.length > 0 ? <>
    <div className="wrap-counter"><span>已选 {selected.length}/{eligible.length}</span><button disabled={busy} onClick={() => setSelected(all ? [] : eligible.map(t => t.id))}>{all ? '取消全选' : '全选'}</button></div>
    {[{ name: '之前逾期', tasks: eligible.filter(t => taskDate(t) < localDateValue(new Date())) }, { name: '今天未完成', tasks: eligible.filter(t => taskDate(t) === localDateValue(new Date())) }].filter(group => group.tasks.length).map(group => <section key={group.name}><h3>{group.name} · {group.tasks.length} 项</h3>{orderAgenda(group.tasks).map(task => <div className="wrap-task" data-selected={selected.includes(task.id)} key={task.id}>
     <button className="wrap-select" disabled={busy} aria-pressed={selected.includes(task.id)} aria-label={`选择：${task.title}`} onClick={() => toggle(task.id)}><span className="wrap-circle" aria-hidden="true">{selected.includes(task.id) ? '●' : ''}</span><span className="wrap-copy"><strong>{task.title}</strong><small>{taskDate(task) < localDateValue(new Date()) ? `逾期 · ${dateSummary(taskDate(task))}` : `${taskTime(task) ? `今天 ${taskTime(task)}` : '今天'}`} {task.project ? ` · ${task.project}` : ''}</small></span></button>
     <details className="wrap-more"><summary aria-label={`${task.title}的更多操作`}>···</summary><button disabled={busy} onClick={() => void run(async () => { await onComplete(task.id); setUndo([]); setNotice('已标记完成'); })}>标记完成</button></details>
    </div>)}</section>)}
   </> : <div className="wrap-done"><span className="material-symbols-outlined" aria-hidden="true">task_alt</span><h3>整理好了，今天就到这里。</h3><p>没有未处理的任务了。</p></div>}
   {action === 'date' && selected.length > 0 && <div ref={calendarRef}><InlineCalendar value={date} shortcuts={false} minDate={localDateValue(new Date())} onChange={setDate} /></div>}
   {error && <p className="agenda-error" role="alert">{error}</p>}
  </div>
  <footer className="agenda-footer">
   {eligible.length ? <><div className="wrap-actions" role="group" aria-label="批量安排方式">{([{ id: 'tomorrow', label: '移到明天' }, { id: 'date', label: '选择日期' }, { id: 'none', label: '暂不安排' }] as const).map(option => <button key={option.id} disabled={busy || !selected.length} aria-pressed={action === option.id} onClick={() => setAction(option.id)}>{option.label}</button>)}</div>
   <p className="wrap-summary">{!selected.length ? '请选择要整理的任务' : target ? `将 ${selected.length} 项任务安排到${dateSummary(target)}，保留原时间。` : '清除所选任务的日期、具体时间和对应提醒，保留任务。'}</p>
   <button className="agenda-primary" disabled={busy || !selected.length} onClick={() => void commit()}>{busy ? '正在保存…' : `确认安排${selected.length ? `（${selected.length}）` : ''}`}</button></> : <button className="agenda-primary" disabled={busy} onClick={onClose}>完成</button>}
  </footer>
 </motion.section></motion.div>, document.body);
}


