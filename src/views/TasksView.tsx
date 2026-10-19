import React from 'react';
import type { Task, DueCategory } from '../types/index.ts';
import { InlineCalendar } from '../components/InlineCalendar.tsx';
import { SwipeableTaskItem } from '../components/SwipeableTaskItem.tsx';
import { filterTasks } from '../utils/taskLogic.ts';
import { orderAgenda, taskDate } from '../utils/taskPresentation.ts';
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
 const [ui, setUI] = usePageMemory('agenda', { date: localDateValue(new Date()), week: false, mode: 'date', search: '', status: 'all' as 'all' | 'pending' | 'completed', completed: false });
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
 return <div className="agenda-page">
  <header className="agenda-page-header"><h1><span className="material-symbols-outlined" aria-hidden="true">spa</span> 待办 <small>{tasks.filter(t => t.status === 'pending').length}</small></h1><button className="agenda-primary" onClick={add}>＋ 新建任务</button></header>
  <div className="agenda-search"><span className="material-symbols-outlined" aria-hidden="true">search</span><input aria-label="搜索待办" placeholder="搜索任务、项目或标签…" value={ui.search} onChange={e => patch({ search: e.target.value })} />{ui.search && <button aria-label="清除搜索" onClick={() => patch({ search: '' })}>×</button>}</div>
  {!search && <><InlineCalendar value={ui.date} shortcuts={false} week={ui.week} dots={tasks.filter(t => t.status === 'pending').map(taskDate)} onToggleWeek={() => patch({ week: !ui.week })} onChange={date => patch({ date, mode: 'date' })} />
  <div className="agenda-entries"><button aria-pressed={ui.mode === 'overdue'} onClick={() => patch({ mode: ui.mode === 'overdue' ? 'date' : 'overdue' })}>逾期 · {overdue.length}</button><button aria-pressed={ui.mode === 'none'} onClick={() => patch({ mode: ui.mode === 'none' ? 'date' : 'none' })}>未安排 · {none.length}</button><button className="agenda-link" onClick={onOpenWrap}>整理 →</button></div></>}
  <div className="agenda-list-header"><h2>{heading}</h2><select aria-label="完成状态筛选" value={ui.status} onChange={e => patch({ status: e.target.value as typeof ui.status })}><option value="all">全部</option><option value="pending">待完成</option><option value="completed">已完成</option></select></div>
  <div role="list" className="agenda-list">{pending.map(renderTask)}</div>
  {!!completed.length && <section><button className="agenda-completed" aria-expanded={ui.completed} onClick={() => patch({ completed: !ui.completed })}>已完成 · {completed.length} {ui.completed ? '⌃' : '⌄'}</button>{ui.completed && completed.map(renderTask)}</section>}
  {!listed.length && <div className="agenda-empty"><p>{search || ui.status !== 'all' ? '没有符合条件的待办' : '这一天还没有安排'}</p>{search || ui.status !== 'all' ? <button className="agenda-link" onClick={() => patch({ search: '', status: 'all' })}>清除筛选</button> : <button className="agenda-link" onClick={add}>＋ 添加待办</button>}</div>}
 </div>;
}
