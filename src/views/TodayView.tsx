import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useMotion } from '../motion/MotionProvider.tsx';
import type { Task, DueCategory } from '../types/index.ts';
import { SegmentedControl } from '../components/SegmentedControl.tsx';
import { SwipeableTaskItem } from '../components/SwipeableTaskItem.tsx';
import { WrapUpButton } from '../components/WrapUpButton.tsx';
import { AnimatedNumber } from '../components/AnimatedNumber.tsx';
import { FilterTransition } from '../motion/FilterTransition.tsx';
import { priorities, priorityTasks } from '../utils/taskPresentation.ts';
import { usePageMemory, usePageScroll } from '../hooks/usePageMemory.ts';
import type { PriorityLevel } from '../types/index.ts';

interface TodayViewProps {
  onOpenWrap?: () => void;
  wrapCount?: number;
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onOpenAddTask: () => void;
  onDeleteTask?: (taskId: string) => void;
  onEditTask?: (task: Task) => void;
  onReorderTasks?: (
    id: string,
    targetId: string,
    category?: DueCategory,
  ) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  tasks,
  onToggleTask,
  onOpenAddTask,
  onDeleteTask,
  onEditTask,
  onReorderTasks,
  onOpenWrap,
  wrapCount = 0,
}) => {
  const config = useMotion();
  const [filter, setFilter] = usePageMemory<'all' | 'pending' | 'completed'>('today-status', 'all');
  const [priority, setPriority] = usePageMemory<PriorityLevel | 'all'>('today-priority', 'all');
  const [showPriority, setShowPriority] = useState(false);
  React.useEffect(() => {
    if (!showPriority) return;
    const dismiss = (event: PointerEvent) => {
      if (!(event.target as Element).closest('.today-priority')) setShowPriority(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [showPriority]);
  usePageScroll('today');
  const [filterDirection, setFilterDirection] = useState(1);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);

  // Filter tasks
  const scoped = priorityTasks(tasks, priority);
  const pendingTasks = scoped.filter((t) => t.status === 'pending');
  const completedTasks = scoped.filter((t) => t.status === 'completed');

  const displayedPending = filter === 'completed' ? [] : pendingTasks;
  const displayedCompleted = filter === 'pending' ? [] : completedTasks;

  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="today-page flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-3 pb-24">
      {/* Top Header */}
      <header className="today-header flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#F5E8E4] dark:bg-[#422923] flex items-center justify-center text-[#A55340] dark:text-[#E08570]">
            <span className="material-symbols-outlined text-[19px]">
              calendar_today
            </span>
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-[#28231D] dark:text-[#EDE6DE] tracking-tight">
              今天
            </h1>
          </div>
        </div>

        {/* Circular Terracotta '+' Add Button */}
        <button
          type="button"
          onClick={onOpenAddTask}
          aria-label="新建待办"
          className="w-8 h-8 rounded-full bg-[#A55340] hover:bg-[#873C2A] text-white flex items-center justify-center shadow-[0_2px_6px_rgba(165,83,64,0.3)] active:scale-90 transition-transform cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px] leading-none">
            add
          </span>
        </button>
      </header>

      {/* Overview stats & Subtitle Banner */}
      <motion.div
        layoutId={config.level === 'rich' ? 'task-summary' : undefined}
        transition={{ duration: config.durations.pageTransition / 1000 }}
        className="today-overview flex items-baseline justify-between mb-2"
      >
        <div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-[20px] font-bold text-[#28231D] dark:text-[#EDE6DE] flex items-baseline">
              今日待办 · <AnimatedNumber value={totalCount} className="mx-1" />
              项
            </h2>
          </div>
          <p className="text-[12px] text-[#786E64] dark:text-[#A89E92] mt-0.5">
            {new Date().toLocaleDateString('zh-CN', {
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}{' '}
          </p>
        </div>

        {/* Subtle Progress Capsule with rolling percent */}
        <div className="px-2.5 py-1 rounded-full bg-[#EAF0EB] dark:bg-[#28372B] text-[#6C8271] dark:text-[#95B59C] text-[11px] font-medium shrink-0 flex items-center gap-0.5">
          <span>进行度</span>
          <AnimatedNumber value={progressPercent} suffix="%" />
        </div>
      </motion.div>

      {/* Segmented Control Filter */}
      <SegmentedControl
        className="mb-1"
        activeId={filter}
        onChange={(value) => {
          if (value === filter) return;
          const order = ['all', 'pending', 'completed'];
          setFilterDirection(order.indexOf(value) > order.indexOf(filter) ? 1 : -1);
          setFilter(value);
        }}
        options={[
          { id: 'all', label: '全部', count: scoped.length },
          { id: 'pending', label: '待完成', count: pendingTasks.length },
          {
            id: 'completed',
            label: '已完成',
            count: completedTasks.length,
            motionId: 'brand-completed',
          },
        ]}
      />

      <div className="today-tools"><div className="today-priority">
        <button className="agenda-filter" aria-expanded={showPriority} onClick={() => setShowPriority(!showPriority)}><span className="material-symbols-outlined" aria-hidden="true">filter_list</span>{priorities.find(p => p.value === priority)?.label || '全部重要程度'} ⌄</button>
        {priority !== 'all' && <button className="agenda-link" aria-label="清除重要程度筛选" onClick={() => setPriority('all')}>清除</button>}
        {showPriority && <div className="priority-popover" role="group" aria-label="重要程度筛选">{[{ value: 'all' as const, label: '全部重要程度' }, ...priorities].map(p => <button key={p.value} aria-pressed={priority === p.value} onClick={() => { setPriority(p.value); setShowPriority(false); }}>{p.label} {priority === p.value ? '✓' : ''}</button>)}</div>}
      </div>
      <WrapUpButton count={wrapCount} onClick={onOpenWrap} /></div>
      <FilterTransition value={`${filter}:${priority}`} direction={filterDirection}>
        {/* Pending Tasks List */}
        <div
          role="list"
          data-drop-category="today"
          className="flex flex-col gap-1 transition-all duration-300"
        >
          <AnimatePresence>
            {displayedPending.map((task, idx) => (
              <SwipeableTaskItem
                key={task.id}
                task={task}
                index={idx}
                group="today-pending"
                variant="card"
                showDetails={true}
                onToggle={() => onToggleTask(task.id)}
                onDelete={() => onDeleteTask?.(task.id)}
                onEdit={onEditTask}
                onReorder={onReorderTasks}
              />
            ))}
          </AnimatePresence>

          {displayedPending.length === 0 && displayedCompleted.length === 0 && (
            <div className="text-center py-8 text-[13px] text-[#786E64] dark:text-[#A89E92]">
              {priority !== 'all' || filter !== 'all' ? <><p>没有符合条件的待办</p><button className="agenda-link" onClick={() => { setPriority('all'); setFilter('all'); }}>清除筛选</button></> : '今天还没有待办，添加一项吧'}
            </div>
          )}
        </div>

        {/* Completed Section (Accordion Collapsible) */}
        {displayedCompleted.length > 0 && filter !== 'pending' && (
          <section className="mt-4">
            <button
              type="button"
              onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
              className="w-full flex items-center justify-between py-1.5 text-[12.5px] font-medium text-[#786E64] dark:text-[#A89E92] hover:text-[#28231D] dark:hover:text-[#EDE6DE] cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#6C8271]">
                  check_circle
                </span>
                <span className="inline-flex items-center">
                  已完成 (<AnimatedNumber value={displayedCompleted.length} />)
                </span>
              </div>
              <span
                className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                  isCompletedExpanded ? '' : '-rotate-90'
                }`}
              >
                expand_more
              </span>
            </button>

            <div
              className={`accordion-grid mt-1.5 ${
                isCompletedExpanded ? 'expanded' : ''
              }`}
            >
              <div className="accordion-inner">
                <div className="flex flex-col gap-1">
                  <AnimatePresence>
                    {displayedCompleted.map((task, idx) => (
                      <SwipeableTaskItem
                        key={task.id}
                        task={task}
                        index={idx}
                        variant="card"
                        showDetails={true}
                        onToggle={() => onToggleTask(task.id)}
                        onDelete={() => onDeleteTask?.(task.id)}
                        onEdit={onEditTask}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </section>
        )}
      </FilterTransition>
    </div>
  );
};
