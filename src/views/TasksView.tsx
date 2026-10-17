import { useMotion } from '../motion/MotionProvider.tsx';
import { AnimatePresence, motion } from 'motion/react';
import React, { useState } from 'react';
import type { Task, DueCategory } from '../types/index.ts';
import { SwipeableTaskItem } from '../components/SwipeableTaskItem.tsx';
import { AnimatedNumber } from '../components/AnimatedNumber.tsx';
import { SegmentedControl } from '../components/SegmentedControl.tsx';
import {
  filterTasks,
  groupTasksByDate,
  groupTasksByQuadrant,
} from '../utils/taskLogic.ts';

interface TasksViewProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask?: (task: Task) => void;
  onOpenAddTask: () => void;
  onReorderTasks?: (
    id: string,
    targetId: string,
    category?: DueCategory,
  ) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onToggleTask,
  onDeleteTask,
  onEditTask,
  onOpenAddTask,
  onReorderTasks,
}) => {
  const [viewMode, setViewMode] = useState<'date' | 'quadrant'>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'completed'
  >('all');
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    overdue: true,
    today: true,
    future: true,
    none: true,
  });

  const toggleSection = (sec: string) => {
    setExpandedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Filter tasks with search
  const filteredTasks = filterTasks(tasks, statusFilter, searchQuery);

  // Group dynamically by date using real time model
  const {
    overdue: overdueTasks,
    today: todayTasks,
    future: futureTasks,
    none: noneTasks,
  } = groupTasksByDate(filteredTasks);

  // Group dynamically by quadrants
  const {
    urgentImportant: quadrant1,
    importantNotUrgent: quadrant2,
    urgentNotImportant: quadrant3,
    neither: quadrant4,
  } = groupTasksByQuadrant(filteredTasks);

  return (
    <div className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-3 pb-24">
      {/* Top Header */}
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[22px] text-[#A55340] dark:text-[#C76E59]">
            spa
          </span>
          <h1 className="text-[20px] font-bold text-[#28231D] dark:text-[#EDE6DE] tracking-tight">
            待办
          </h1>
          <span className="px-2 py-0.5 rounded-full bg-[#EBE4D6] dark:bg-[#38312B] text-[11px] font-semibold text-[#786E64] dark:text-[#A89E92]">
            <AnimatedNumber value={tasks.length} />
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter icon button */}
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-[#F5F1E8] dark:bg-[#342E28] hover:bg-[#EBE4D6] text-[#786E64] dark:text-[#A89E92] flex items-center justify-center transition-colors cursor-pointer"
            onClick={() => setShowFilter(!showFilter)}
            aria-expanded={showFilter}
            title="筛选"
            aria-label="筛选"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
          </button>

          {/* Terracotta + 新建任务 button */}
          <button
            type="button"
            onClick={onOpenAddTask}
            className="h-8 pl-2.5 pr-3 rounded-full bg-[#A55340] hover:bg-[#873C2A] text-white flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px] leading-none">
              add
            </span>
            <span className="text-[12px] font-medium tracking-wide">
              新建任务
            </span>
          </button>
        </div>
      </header>

      {/* Search Input with ⌘K */}
      <div className="relative mb-3">
        <span className="material-symbols-outlined absolute left-3 top-2.5 text-[17px] text-[#786E64] dark:text-[#A89E92]">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索任务、项目或标签..."
          className="w-full h-9 pl-9 pr-12 text-[13px] bg-[#FAF6EF] dark:bg-[#2F2924] text-[#28231D] dark:text-[#EDE6DE] rounded-xl border border-[#746B61]/15 focus:border-[#A55340] outline-none transition-all placeholder:text-[#9E9284]"
        />
        <div className="absolute right-2.5 top-2 px-1.5 py-0.5 rounded bg-[#EBE4D6] dark:bg-[#3E362F] text-[#786E64] dark:text-[#A89E92] text-[10px] font-mono pointer-events-none">
          ⌘K
        </div>
      </div>

      {showFilter && (
        <SegmentedControl
          className="mb-3"
          activeId={statusFilter}
          onChange={setStatusFilter}
          options={[
            { id: 'all', label: '全部' },
            { id: 'pending', label: '待完成' },
            { id: 'completed', label: '已完成' },
          ]}
        />
      )}
      {/* Mode Switcher: 按日期分组 vs 四象限 */}
      <div className="relative w-full bg-[#EBE4D6] dark:bg-[#342E28] p-1 rounded-xl flex items-center mb-3.5 select-none">
        <button
          type="button"
          onClick={() => setViewMode('date')}
          className={`flex-1 h-7 rounded-lg text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            viewMode === 'date'
              ? 'bg-white dark:bg-[#433B34] text-[#A55340] dark:text-[#C76E59] shadow-sm font-semibold'
              : 'text-[#786E64] dark:text-[#A89E92]'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">
            calendar_view_day
          </span>
          按日期分组
        </button>
        <button
          type="button"
          onClick={() => setViewMode('quadrant')}
          className={`flex-1 h-7 rounded-lg text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            viewMode === 'quadrant'
              ? 'bg-white dark:bg-[#433B34] text-[#A55340] dark:text-[#C76E59] shadow-sm font-semibold'
              : 'text-[#786E64] dark:text-[#A89E92]'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">
            grid_view
          </span>
          四象限
        </button>
      </div>

      {/* Render View Mode */}
      {viewMode === 'date' ? (
        <div className="flex flex-col gap-3.5">
          {/* 1. 逾期 */}
          {overdueTasks.length > 0 && (
            <section data-drop-category="overdue" role="list">
              <div
                onClick={() => toggleSection('overdue')}
                className="flex items-center justify-between py-1 px-1 cursor-pointer select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`material-symbols-outlined text-[16px] text-[#A55340] transition-transform duration-200 ${
                      expandedSections.overdue ? '' : '-rotate-90'
                    }`}
                  >
                    expand_more
                  </span>
                  <span className="text-[13px] font-semibold text-[#A55340] dark:text-[#E08570] inline-flex items-center">
                    逾期 (<AnimatedNumber value={overdueTasks.length} />)
                  </span>
                </div>
                <span className="text-[11px] text-[#A55340] dark:text-[#E08570] font-medium">
                  需要优先处理
                </span>
              </div>

              <div
                className={`accordion-grid ${expandedSections.overdue ? 'expanded' : ''}`}
              >
                <div className="accordion-inner">
                  <div className="paper-card rounded-[14px] bg-white dark:bg-[#27221E] overflow-hidden mt-1 border-l-2 border-l-[#A55340]">
                    <AnimatePresence>
                      {overdueTasks.map((task, idx) => (
                        <SwipeableTaskItem
                          key={task.id}
                          task={task}
                          group="overdue"
                          index={idx}
                          isLast={idx === overdueTasks.length - 1}
                          onToggle={() => onToggleTask(task.id)}
                          onDelete={() => onDeleteTask(task.id)}
                          onEdit={onEditTask}
                          onReorder={onReorderTasks}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 2. 今天 */}
          <section data-drop-category="today" role="list">
            <div
              onClick={() => toggleSection('today')}
              className="flex items-center justify-between py-1 px-1 cursor-pointer select-none"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`material-symbols-outlined text-[16px] text-[#786E64] dark:text-[#A89E92] transition-transform duration-200 ${
                    expandedSections.today ? '' : '-rotate-90'
                  }`}
                >
                  expand_more
                </span>
                <span className="text-[13px] font-semibold text-[#28231D] dark:text-[#EDE6DE] inline-flex items-center">
                  今天 (<AnimatedNumber value={todayTasks.length} />)
                </span>
              </div>
              <span className="text-[11px] text-[#786E64] dark:text-[#A89E92]">
                专注当前节律
              </span>
            </div>

            <div
              className={`accordion-grid ${expandedSections.today ? 'expanded' : ''}`}
            >
              <div className="accordion-inner">
                <div className="paper-card rounded-[14px] bg-white dark:bg-[#27221E] overflow-hidden mt-1">
                  <AnimatePresence>
                    {todayTasks.length > 0 ? (
                      todayTasks.map((task, idx) => (
                        <SwipeableTaskItem
                          key={task.id}
                          task={task}
                          group="today"
                          index={idx}
                          isLast={idx === todayTasks.length - 1}
                          onToggle={() => onToggleTask(task.id)}
                          onDelete={() => onDeleteTask(task.id)}
                          onEdit={onEditTask}
                          onReorder={onReorderTasks}
                        />
                      ))
                    ) : (
                      <div className="py-4 text-center text-[12px] text-[#786E64]">
                        今日待办已清空
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </section>

          {/* 3. 未来 */}
          <section data-drop-category="future" role="list">
            <div
              onClick={() => toggleSection('future')}
              className="flex items-center justify-between py-1 px-1 cursor-pointer select-none"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`material-symbols-outlined text-[16px] text-[#786E64] dark:text-[#A89E92] transition-transform duration-200 ${
                    expandedSections.future ? '' : '-rotate-90'
                  }`}
                >
                  expand_more
                </span>
                <span className="text-[13px] font-semibold text-[#28231D] dark:text-[#EDE6DE] inline-flex items-center">
                  未来 (<AnimatedNumber value={futureTasks.length} />)
                </span>
              </div>
              <span className="text-[11px] text-[#786E64] dark:text-[#A89E92]">
                规划步调
              </span>
            </div>

            <div
              className={`accordion-grid ${expandedSections.future ? 'expanded' : ''}`}
            >
              <div className="accordion-inner">
                <div className="paper-card rounded-[14px] bg-white dark:bg-[#27221E] overflow-hidden mt-1">
                  <AnimatePresence>
                    {futureTasks.map((task, idx) => (
                      <SwipeableTaskItem
                        key={task.id}
                        task={task}
                        group="future"
                        index={idx}
                        isLast={idx === futureTasks.length - 1}
                        onToggle={() => onToggleTask(task.id)}
                        onDelete={() => onDeleteTask(task.id)}
                        onEdit={onEditTask}
                        onReorder={onReorderTasks}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </section>

          {/* 4. 未安排 */}
          <section data-drop-category="none" role="list">
            <div
              onClick={() => toggleSection('none')}
              className="flex items-center justify-between py-1 px-1 cursor-pointer select-none"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`material-symbols-outlined text-[16px] text-[#786E64] dark:text-[#A89E92] transition-transform duration-200 ${
                    expandedSections.none ? '' : '-rotate-90'
                  }`}
                >
                  expand_more
                </span>
                <span className="text-[13px] font-semibold text-[#28231D] dark:text-[#EDE6DE] inline-flex items-center">
                  未安排 (<AnimatedNumber value={noneTasks.length} />)
                </span>
              </div>
              <span className="text-[11px] text-[#786E64] dark:text-[#A89E92]">
                灵感暂存
              </span>
            </div>

            <div
              className={`accordion-grid ${expandedSections.none ? 'expanded' : ''}`}
            >
              <div className="accordion-inner">
                <div className="paper-card rounded-[14px] bg-white dark:bg-[#27221E] overflow-hidden mt-1">
                  <AnimatePresence>
                    {noneTasks.map((task, idx) => (
                      <SwipeableTaskItem
                        key={task.id}
                        task={task}
                        group="none"
                        index={idx}
                        isLast={idx === noneTasks.length - 1}
                        onToggle={() => onToggleTask(task.id)}
                        onDelete={() => onDeleteTask(task.id)}
                        onEdit={onEditTask}
                        onReorder={onReorderTasks}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        /* Quadrant Mode */
        <div className="grid grid-cols-1 gap-3">
          <QuadrantBox
            title="重要且紧急"
            badge="优先完成"
            color="terracotta"
            tasks={quadrant1}
            onToggle={onToggleTask}
            onEdit={onEditTask}
          />
          <QuadrantBox
            title="重要不紧急"
            badge="深度投入"
            color="sage"
            tasks={quadrant2}
            onToggle={onToggleTask}
            onEdit={onEditTask}
          />
          <QuadrantBox
            title="紧急不重要"
            badge="快速委派"
            color="amber"
            tasks={quadrant3}
            onToggle={onToggleTask}
            onEdit={onEditTask}
          />
          <QuadrantBox
            title="不重要不紧急"
            badge="闲时清空"
            color="gray"
            tasks={quadrant4}
            onToggle={onToggleTask}
            onEdit={onEditTask}
          />
        </div>
      )}
    </div>
  );
};

// Quadrant sub-box
const QuadrantBox: React.FC<{
  title: string;
  badge: string;
  color: 'terracotta' | 'sage' | 'amber' | 'gray';
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit?: (task: Task) => void;
}> = ({ title, badge, color, tasks, onToggle, onEdit }) => {
  const config = useMotion();
  const getHeaderColor = () => {
    switch (color) {
      case 'terracotta':
        return 'text-[#A55340] dark:text-[#E08570] bg-[#FDEAE6]/50 dark:bg-[#432722]/40';
      case 'sage':
        return 'text-[#6C8271] dark:text-[#95B59C] bg-[#EAF0EB]/50 dark:bg-[#28372B]/40';
      case 'amber':
        return 'text-[#C88A3A] dark:text-[#E2A657] bg-[#FBF1E2]/50 dark:bg-[#403323]/40';
      case 'gray':
      default:
        return 'text-[#786E64] dark:text-[#A89E92] bg-[#EFEAE2]/50 dark:bg-[#38322B]/40';
    }
  };

  return (
    <div className="paper-card rounded-[14px] overflow-hidden bg-white dark:bg-[#27221E]">
      <div
        className={`px-3.5 py-2 flex items-center justify-between ${getHeaderColor()}`}
      >
        <span className="text-[13px] font-semibold">{title}</span>
        <span className="text-[11px] font-medium opacity-80 inline-flex items-center gap-1">
          {badge} · <AnimatedNumber value={tasks.length} />
        </span>
      </div>
      <div className="p-2 flex flex-col gap-1.5">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <motion.div
              layoutId={
                config.allowScaleEffects ? `task-surface-${task.id}` : undefined
              }
              layout={config.allowScaleEffects ? 'position' : false}
              key={task.id}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  event.key === 'Enter'
                )
                  onEdit?.(task);
              }}
              onClick={() => onEdit?.(task)}
              className="px-2 py-1.5 rounded-lg hover:bg-[#F5F1E8] dark:hover:bg-[#322C26] flex items-center gap-2 cursor-pointer transition-colors text-[13px]"
            >
              <button
                type="button"
                aria-label={task.status === 'completed' ? '撤销完成' : '完成'}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle(task.id);
                }}
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                  task.status === 'completed'
                    ? 'bg-[#6C8271] border-[#6C8271] text-white text-[10px]'
                    : 'border-[#A89D91]'
                }`}
              >
                {task.status === 'completed' && '✓'}
              </button>
              <span
                className={`truncate ${
                  task.status === 'completed'
                    ? 'line-through text-[#786E64]'
                    : ''
                }`}
              >
                {task.title}
              </span>
            </motion.div>
          ))
        ) : (
          <div className="py-2 text-center text-[11.5px] text-[#786E64]/70">
            暂无任务
          </div>
        )}
      </div>
    </div>
  );
};
