import React, { useEffect, useRef } from 'react';
import type { Task, DueCategory } from '../types/index.ts';
import { InlineCalendar } from '../components/InlineCalendar.tsx';
import { SwipeableTaskItem } from '../components/SwipeableTaskItem.tsx';
import { filterTasks } from '../utils/taskLogic.ts';
import { orderAgenda, taskDate, wrapTasks } from '../utils/taskPresentation.ts';
import { CompactEntry, WrapUpButton } from '../components/WrapUpButton.tsx';
import { TaskStatusFilter } from '../components/TaskStatusFilter.tsx';
import { localDateValue } from '../utils/taskEdit.ts';
import { dateSummary } from '../utils/calendar.ts';
import { usePageMemory, usePageScroll } from '../hooks/usePageMemory.ts';
interface Props {
 tasks: Task[]; onToggleTask: (id: string) => void; onDeleteTask: (id: string) => void;
 onEditTask?: (task: Task) => void; onOpenAddTask: (values?: Partial<Task>) => void;
 onReorderTasks?: (id: string, target: string, category?: DueCategory) => void;
 onOpenWrap?: () => void;
}
export function TasksView({ tasks, onToggleTask, onDeleteTask, onEditTask, onOpenAddTask, onReorderTasks, onOpenWrap }: Props) {
 const [ui, setUI] = usePageMemory('agenda', { date: localDateValue(new Date()), week: true, mode: 'date', search: '', searchOpen: false, status: 'all' as 'all' | 'pending' | 'completed', completed: false });
 const inputRef = useRef<HTMLInputElement>(null), searchButton = useRef<HTMLButtonElement>(null);
 const searchOpen = ui.searchOpen || !!ui.search;
 useEffect(() => { if (searchOpen) inputRef.current?.focus({ preventScroll: true }); }, [searchOpen]);
 usePageScroll('agenda');
 const patch = (value: Partial<typeof ui>) => setUI(before => ({ ...before, ...value }));
 const today = localDateValue(new Date());
 const overdue = tasks.filter(t => t.status === 'pending' && taskDate(t) && taskDate(t) < today);
 const none = tasks.filter(t => t.status === 'pending' && !taskDate(t));
 const search = ui.search.trim();
 const matched = filterTasks(tasks, ui.status, ui.search);
 const listed = orderAgenda(matched.filter(t => search ? true : ui.mode === 'overdue' ? overdue.some(o => o.id === t.id) : ui.mode === 'none' ? !taskDate(t) : taskDate(t) === ui.date));
 const pending = listed.filter(t => t.status === 'pending');
 const completed = listed.filter(t => t.status === 'completed');
 const heading = search ? `搜索结果 · ${listed.length} 项` : ui.mode === 'overdue' ? '逾期待办' : ui.mode === 'none' ? '未安排' : dateSummary(ui.date);
 const add = () => onOpenAddTask({ dueAt: ui.mode === 'none' ? undefined : new Date(`${ui.date}T00:00:00`).toISOString() });
 const renderTask = (task: Task, index: number) => <SwipeableTaskItem key={task.id} task={task} index={index} group={`agenda-${search ? 'search' : ui.mode}`} variant="card" showDetails onToggle={() => onToggleTask(task.id)} onDelete={() => onDeleteTask(task.id)} onEdit={onEditTask} onReorder={onReorderTasks} />;
 return <div className="agenda-page compact-agenda">
  <header className="agenda-page-header"><h1><span className="material-symbols-outlined" aria-hidden="true">spa</span> 待办 <small>{tasks.filter(t => t.status === 'pending').length}</small></h1><div className="agenda-header-actions"><button ref={searchButton} className="compact-icon-button" aria-label="搜索待办" title="搜索待办" aria-expanded={searchOpen} aria-controls="agenda-search-field" onClick={() => patch({ searchOpen: !searchOpen, search: '' })}><span className="material-symbols-outlined" aria-hidden="true">search</span></button><button className="compact-icon-button compact-add" aria-label="新建任务" title="新建任务" onClick={add}><span className="material-symbols-outlined" aria-hidden="true">add</span></button></div></header>
  {searchOpen && <div id="agenda-search-field" className="agenda-search"><span className="material-symbols-outlined" aria-hidden="true">search</span><input ref={inputRef} aria-label="搜索待办" placeholder="搜索任务、项目或标签…" value={ui.search} onChange={e => patch({ search: e.target.value })} onKeyDown={event => { if (event.key === 'Escape') { patch({ search: '', searchOpen: false }); searchButton.current?.focus(); } }} /><button aria-label="关闭搜索" onClick={() => { patch({ search: '', searchOpen: false }); searchButton.current?.focus(); }}>×</button></div>}
  {!search && <><InlineCalendar value={ui.date} shortcuts={false} week={ui.week} dots={tasks.filter(t => t.status === 'pending').map(taskDate)} onToggleWeek={() => patch({ week: !ui.week })} onChange={date => patch({ date, mode: 'date' })} />
  <div className="agenda-entries"><CompactEntry label="逾期" count={overdue.length} selected={ui.mode==='overdue'} onClick={() => patch({ mode: ui.mode === 'overdue' ? 'date' : 'overdue' })} /><CompactEntry label="未安排" count={none.length} selected={ui.mode==='none'} onClick={() => patch({ mode: ui.mode === 'none' ? 'date' : 'none' })} /><WrapUpButton count={wrapTasks(tasks).length} onClick={onOpenWrap} /></div></>}
  <div className="agenda-list-header"><h2>{heading}</h2><TaskStatusFilter value={ui.status} onChange={status => patch({ status, completed: status === 'completed' })} /></div>
  <div role="list" className="agenda-list">{pending.map(renderTask)}</div>
  {!!completed.length && <section><button className="agenda-completed" aria-expanded={ui.status === 'completed' || ui.completed} disabled={ui.status === 'completed'} onClick={() => patch({ completed: !ui.completed })}>已完成 · {completed.length} {ui.status === 'completed' ? '' : ui.completed ? '⌃' : '⌄'}</button>{(ui.status === 'completed' || ui.completed) && completed.map(renderTask)}</section>}
  {!listed.length && <div className="agenda-empty"><p>{search || ui.status !== 'all' ? '没有符合条件的待办' : ui.mode === 'none' ? '没有未安排的待办' : ui.mode === 'overdue' ? '没有逾期待办' : '这一天还没有安排'}</p>{search || ui.status !== 'all' ? <button className="agenda-link" onClick={() => patch({ search: '', status: 'all' })}>清除筛选</button> : <button className="agenda-link" onClick={add}>＋ 添加待办</button>}</div>}
 </div>;
}
