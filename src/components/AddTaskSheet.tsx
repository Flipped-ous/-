import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useDialog } from '../hooks/useDialog.ts';
import { InlineCalendar } from './InlineCalendar.tsx';
import { TimeField } from './TimeField.tsx';
import { localDateValue, quickDate, buildDueAt } from '../utils/taskEdit.ts';
import { dateSummary } from '../utils/calendar.ts';
import { priorities } from '../utils/taskPresentation.ts';
import type { PriorityLevel, Task, Project } from '../types/index.ts';
interface Props {
  isOpen: boolean; onClose: () => void; onSave: (data: Partial<Task>) => void;
  taskToEdit?: Task | null; initialValues?: Partial<Task>; projects?: Project[];
  defaultProject?: string; onOpenSourceNote?: (id: string) => void;
}
export function AddTaskSheet(props: Props) {
  return <AnimatePresence>{props.isOpen && <TaskForm key={props.taskToEdit?.id || 'new'} {...props} />}</AnimatePresence>;
}
function TaskForm({ onClose, onSave, taskToEdit: task, initialValues, projects = [], onOpenSourceNote }: Props) {
  const seed = task || initialValues;
  const [title, setTitle] = useState(seed?.title || '');
  const [note, setNote] = useState(seed?.note || '');
  const [priority, setPriority] = useState<PriorityLevel>(seed?.priority || 'normal');
  const [date, setDate] = useState(() => seed && 'dueAt' in seed ? (seed.dueAt ? localDateValue(new Date(seed.dueAt)) : '') : task ? '' : quickDate('today'));
  const [time, setTime] = useState(() => {
    if (seed?.dueTime) return seed.dueTime;
    if (!seed?.dueAt) return '';
    const d = new Date(seed.dueAt);
    return d.getHours() || d.getMinutes() ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
  });
  const [changed, setChanged] = useState(false);
  const [projectId, setProjectId] = useState(seed ? seed.projectId || '' : projects[0]?.id || '');
  const [projectName, setProjectName] = useState(seed ? seed.project || '' : projects[0]?.name || '');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const submitted = React.useRef(false);
  const reduced = useReducedMotion();
  useDialog(true, onClose, task ? '[aria-label="关闭"]' : '[aria-label="待办事项"]');
  const open = (section: string) => setExpanded(expanded === section ? null : section);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || submitted.current) return;
    if (date && time && !/^(?:[01]?\d|2[0-3]):[0-5]?\d$/.test(time)) {
      setExpanded('time'); setError('请填写完整时间：小时 00–23，分钟 00–59'); return;
    }
    try {
      const normalized = date && time ? time.split(':').map(part => part.padStart(2, '0')).join(':') : '';
      const dueAt = task && !changed ? task.dueAt : buildDueAt(date, normalized);
      let reminderAt = task?.reminderAt;
      if (changed) {
        const offset = Date.parse(task?.reminderAt || '') - Date.parse(task?.dueAt || '');
        const at = dueAt && Number.isFinite(offset) ? Date.parse(dueAt) + offset : NaN;
        reminderAt = at > Date.now() ? new Date(at).toISOString() : undefined;
      }
      submitted.current = true;
      onSave({ ...(task ? { id: task.id } : {}), title: title.trim(), note: note.trim() || undefined,
        sourceNoteId: seed?.sourceNoteId, priority, projectId: projectId || undefined, project: projectName,
        dueAt, dueTime: normalized || undefined, reminderAt, dueCategory: undefined, dueLabel: undefined,
        badgeLabel: priority === 'urgent' ? '重点' : priority === 'important' ? '重要' : undefined,
        badgeType: priority === 'urgent' ? 'terracotta' : priority === 'important' ? 'sage' : 'gray' });
      onClose();
    } catch (e) { submitted.current = false; setError((e as Error).message); }
  };
  const row = (id: string, icon: string, label: string, summary: string) => <button type="button" className="task-setting-row" aria-expanded={expanded === id} onClick={() => open(id)}><span className="material-symbols-outlined" aria-hidden="true">{icon}</span><span>{label}</span><span className="setting-summary">{summary}</span><span aria-hidden="true">{expanded === id ? '⌃' : '›'}</span></button>;
  return createPortal(<motion.div className="agenda-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none' }} transition={{ duration: reduced ? 0 : .18 }}>
    <div className="agenda-dimmer" onClick={onClose} />
    <motion.form noValidate role="dialog" aria-modal="true" aria-label={task ? '编辑待办' : '新建待办'} onSubmit={submit} className="task-sheet" initial={{ y: reduced ? 0 : 16 }} animate={{ y: 0 }} exit={{ y: reduced ? 0 : 12 }} transition={{ duration: reduced ? 0 : .18 }}>
      <div className="sheet-handle" aria-hidden="true" />
      <header className="agenda-header"><h2>{task ? '编辑待办' : '新建待办'}</h2><button type="button" aria-label="关闭" onClick={onClose}>×</button></header>
      <div className="agenda-scroll">
        <div className="task-content-paper"><textarea aria-label="待办事项" placeholder="准备做些什么？" rows={Math.min(4, Math.max(1, Math.ceil(title.length / 18)))} value={title} onChange={e => setTitle(e.target.value)} /><textarea aria-label="备注" placeholder="添加备注…" rows={Math.min(5, Math.max(1, note.split('\n').length))} value={note} onChange={e => setNote(e.target.value)} /></div>
        {seed?.sourceNoteId && onOpenSourceNote && <button type="button" className="agenda-link" onClick={() => onOpenSourceNote(seed.sourceNoteId!)}>查看来源笔记 →</button>}
        <div className="task-settings">
          {row('date', 'calendar_today', '日期', dateSummary(date))}
          {expanded === 'date' && <div className="setting-detail"><InlineCalendar value={date} onChange={value => { setDate(value); if (!value) setTime(''); setChanged(true); setError(''); setExpanded(null); }} /></div>}
          {row('time', 'schedule', '时间', date ? time || '不设置时间' : '不设置时间')}
          {expanded === 'time' && <div className="setting-detail">{date ? <><TimeField value={time} onChange={value => { setTime(value); setChanged(true); setError(''); }} /><p className="agenda-muted">不填具体时间，仅安排日期。</p></> : <button type="button" className="agenda-link" onClick={() => setExpanded('date')}>请先选择日期 →</button>}</div>}
          {row('project', 'folder', '项目', projectName || '未归属项目')}
          {expanded === 'project' && <div className="setting-detail"><input aria-label="搜索项目" placeholder="搜索项目" value={query} onChange={e => setQuery(e.target.value)} /><div className="setting-options">{[{ id: '', name: '未归属项目' }, ...projects].filter(p => p.name.includes(query)).map(p => <button type="button" key={p.id} aria-pressed={p.id === projectId} onClick={() => { setProjectId(p.id); setProjectName(p.id ? p.name : ''); setExpanded(null); }}>{p.name}{p.id === projectId ? ' ✓' : ''}</button>)}</div></div>}
          {row('priority', 'flag', '优先级', priorities.find(p => p.value === priority)!.label)}
          {expanded === 'priority' && <div className="setting-detail setting-options">{priorities.map(p => <button type="button" key={p.value} aria-pressed={p.value === priority} onClick={() => { setPriority(p.value); setExpanded(null); }}>{p.label}{p.value === priority ? ' ✓' : ''}</button>)}</div>}
        </div>
        {error && <p role="alert" className="agenda-error">{error}</p>}
      </div>
      <footer className="agenda-footer"><button className="agenda-primary" disabled={!title.trim()}>{task ? '保存修改' : '添加待办'}</button></footer>
    </motion.form>
  </motion.div>, document.body);
}
