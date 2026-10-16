import React, { useState } from 'react';
import type { Task, PriorityLevel } from '../types/index.ts';

interface TasksViewProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenAddTask: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onToggleTask,
  onDeleteTask,
  onOpenAddTask,
}) => {
  const [viewMode, setViewMode] = useState<'date' | 'quadrant'>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overdue: true,
    today: true,
    future: true,
    none: true,
  });

  const toggleSection = (sec: string) => {
    setExpandedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Filter tasks with search
  const filteredTasks = tasks.filter((task) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(q) ||
      task.project.toLowerCase().includes(q) ||
      task.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  // Group by date
  const overdueTasks = filteredTasks.filter((t) => t.dueCategory === 'overdue');
  const todayTasks = filteredTasks.filter((t) => t.dueCategory === 'today');
  const futureTasks = filteredTasks.filter((t) => t.dueCategory === 'future');
  const noneTasks = filteredTasks.filter((t) => t.dueCategory === 'none');

  // Group by quadrants
  const quadrant1 = filteredTasks.filter((t) => t.priority === 'urgent');
  const quadrant2 = filteredTasks.filter((t) => t.priority === 'important');
  const quadrant3 = filteredTasks.filter(
    (t) => t.priority === 'normal' && (t.dueCategory === 'today' || t.dueCategory === 'overdue')
  );
  const quadrant4 = filteredTasks.filter(
    (t) => t.priority === 'later' || (t.priority === 'normal' && t.dueCategory !== 'today' && t.dueCategory !== 'overdue')
  );

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
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter icon button */}
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-[#F5F1E8] dark:bg-[#342E28] hover:bg-[#EBE4D6] text-[#786E64] dark:text-[#A89E92] flex items-center justify-center transition-colors cursor-pointer"
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
            <span className="material-symbols-outlined text-[17px] leading-none">add</span>
            <span className="text-[12px] font-medium tracking-wide">新建任务</span>
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

      {/* Mode Switcher: 按日期分组 vs 四象限 */}
      <div className="relative w-full bg-[#EBE4D6] dark:bg-[#342E28] p-1 rounded-xl flex items-center mb-2.5 select-none">
        <button
          type="button"
          onClick={() => setViewMode('date')}
          className={`flex-1 h-7 rounded-lg text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            viewMode === 'date'
              ? 'bg-white dark:bg-[#433B34] text-[#A55340] dark:text-[#C76E59] shadow-sm font-semibold'
              : 'text-[#786E64] dark:text-[#A89E92]'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">calendar_view_day</span>
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
          <span className="material-symbols-outlined text-[15px]">grid_view</span>
          四象限
        </button>
      </div>

      {/* Micro-hint subrow */}
      <div className="flex items-center justify-between text-[11px] text-[#786E64]/80 dark:text-[#A89E92]/80 px-1 mb-3">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px] text-[#6C8271]">swipe</span>
          右滑完成 · 左滑删除
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">drag_indicator</span>
          长按拖拽跨组排期
        </span>
      </div>

      {/* Render View Mode */}
      {viewMode === 'date' ? (
        <div className="flex flex-col gap-3.5">
          {/* 1. 逾期 */}
          {overdueTasks.length > 0 && (
            <section>
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
                  <span className="text-[13px] font-semibold text-[#A55340] dark:text-[#E08570]">
                    逾期 ({overdueTasks.length})
                  </span>
                </div>
                <span className="text-[11px] text-[#A55340] dark:text-[#E08570] font-medium">
                  需要优先处理
                </span>
              </div>

              {expandedSections.overdue && (
                <div className="paper-card rounded-[14px] bg-white dark:bg-[#27221E] overflow-hidden mt-1 border-l-2 border-l-[#A55340]">
                  {overdueTasks.map((task, idx) => (
                    <TaskRowItem
                      key={task.id}
                      task={task}
                      isLast={idx === overdueTasks.length - 1}
                      onToggle={() => onToggleTask(task.id)}
                      onDelete={() => onDeleteTask(task.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 2. 今天 */}
          <section>
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
                <span className="text-[13px] font-semibold text-[#28231D] dark:text-[#EDE6DE]">
                  今天 ({todayTasks.length})
                </span>
              </div>
              <span className="text-[11px] text-[#786E64] dark:text-[#A89E92]">
                专注当前节律
              </span>
            </div>

            {expandedSections.today && (
              <div className="paper-card rounded-[14px] bg-white dark:bg-[#27221E] overflow-hidden mt-1">
                {todayTasks.length > 0 ? (
                  todayTasks.map((task, idx) => (
                    <TaskRowItem
                      key={task.id}
                      task={task}
                      isLast={idx === todayTasks.length - 1}
                      onToggle={() => onToggleTask(task.id)}
                      onDelete={() => onDeleteTask(task.id)}
                    />
                  ))
                ) : (
                  <div className="py-4 text-center text-[12px] text-[#786E64]">今日待办已清空</div>
                )}
              </div>
            )}
          </section>

          {/* 3. 未来 */}
          <section>
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
                <span className="text-[13px] font-semibold text-[#28231D] dark:text-[#EDE6DE]">
                  未来 ({futureTasks.length})
                </span>
              </div>
              <span className="text-[11px] text-[#786E64] dark:text-[#A89E92]">规划步调</span>
            </div>

            {expandedSections.future && (
              <div className="paper-card rounded-[14px] bg-white dark:bg-[#27221E] overflow-hidden mt-1">
                {futureTasks.map((task, idx) => (
                  <TaskRowItem
                    key={task.id}
                    task={task}
                    isLast={idx === futureTasks.length - 1}
                    onToggle={() => onToggleTask(task.id)}
                    onDelete={() => onDeleteTask(task.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 4. 未安排 */}
          <section>
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
                <span className="text-[13px] font-semibold text-[#28231D] dark:text-[#EDE6DE]">
                  未安排 ({noneTasks.length})
                </span>
              </div>
              <span className="text-[11px] text-[#786E64] dark:text-[#A89E92]">灵感暂存</span>
            </div>

            {expandedSections.none && (
              <div className="paper-card rounded-[14px] bg-white dark:bg-[#27221E] overflow-hidden mt-1">
                {noneTasks.map((task, idx) => (
                  <TaskRowItem
                    key={task.id}
                    task={task}
                    isLast={idx === noneTasks.length - 1}
                    onToggle={() => onToggleTask(task.id)}
                    onDelete={() => onDeleteTask(task.id)}
                  />
                ))}
              </div>
            )}
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
          />
          <QuadrantBox
            title="重要不紧急"
            badge="深度投入"
            color="sage"
            tasks={quadrant2}
            onToggle={onToggleTask}
          />
          <QuadrantBox
            title="紧急不重要"
            badge="快速委派"
            color="amber"
            tasks={quadrant3}
            onToggle={onToggleTask}
          />
          <QuadrantBox
            title="不重要不紧急"
            badge="闲时清空"
            color="gray"
            tasks={quadrant4}
            onToggle={onToggleTask}
          />
        </div>
      )}
    </div>
  );
};

// Sub-component for individual task item inside unified group card
const TaskRowItem: React.FC<{
  task: Task;
  isLast: boolean;
  onToggle: () => void;
  onDelete: () => void;
}> = ({ task, isLast, onToggle, onDelete }) => {
  const isCompleted = task.status === 'completed';

  return (
    <div
      className={`p-3 pl-3.5 flex items-start gap-2.5 transition-colors hover:bg-[#FAF6EF]/70 dark:hover:bg-[#322C26]/40 ${
        !isLast ? 'border-b border-[#746B61]/8 dark:border-[#5E544A]/15' : ''
      } ${isCompleted ? 'opacity-70 is-completed' : ''}`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isCompleted ? '撤销完成' : '完成'}
        className={`w-[18px] h-[18px] mt-0.5 rounded-[5px] border-[1.5px] flex items-center justify-center shrink-0 active:scale-90 transition-transform cursor-pointer ${
          isCompleted
            ? 'bg-[#6C8271] border-[#6C8271]'
            : 'bg-white dark:bg-[#342E28] border-[#A89D91] dark:border-[#796F64] hover:border-[#A55340]'
        }`}
      >
        {isCompleted && (
          <span className="material-symbols-outlined text-[15px] text-white checkbox-icon-active leading-none">
            check
          </span>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4
          className={`title-line text-[14px] leading-snug break-words ${
            isCompleted
              ? 'text-[#786E64] dark:text-[#A89E92]'
              : 'text-[#28231D] dark:text-[#EDE6DE] font-medium'
          }`}
        >
          {task.title}
        </h4>

        {/* Tags subrow */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
          {task.badgeLabel && (
            <span
              className={`px-1.5 py-0.2 rounded-md font-medium ${
                task.badgeType === 'terracotta'
                  ? 'bg-[#FDEAE6] dark:bg-[#432722] text-[#A55340] dark:text-[#E08570]'
                  : task.badgeType === 'amber'
                  ? 'bg-[#FBF1E2] dark:bg-[#403323] text-[#C88A3A] dark:text-[#E2A657]'
                  : 'bg-[#EFEAE2] dark:bg-[#38322B] text-[#786E64] dark:text-[#A89E92]'
              }`}
            >
              {task.badgeLabel}
            </span>
          )}

          {task.tags
            ?.filter((tag) => tag !== task.badgeLabel && tag !== `#${task.badgeLabel}`)
            .map((tag) => (
              <span
                key={tag}
                className="text-[#786E64] dark:text-[#A89E92] bg-[#F5F1E8] dark:bg-[#342E28] px-1.5 py-0.2 rounded"
              >
                {tag}
              </span>
            ))}
        </div>
      </div>

      {/* Right controls: drag handle & more */}
      <div className="flex items-center gap-1 shrink-0 text-[#8C7F73]">
        <span
          className="material-symbols-outlined text-[16px] opacity-40 hover:opacity-100 cursor-grab"
          title="拖拽排序"
        >
          drag_indicator
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded opacity-50 hover:opacity-100 hover:text-[#A55340] transition-opacity cursor-pointer"
          title="删除"
        >
          <span className="material-symbols-outlined text-[16px] leading-none">delete</span>
        </button>
      </div>
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
}> = ({ title, badge, color, tasks, onToggle }) => {
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
      <div className={`px-3.5 py-2 flex items-center justify-between ${getHeaderColor()}`}>
        <span className="text-[13px] font-semibold">{title}</span>
        <span className="text-[11px] font-medium opacity-80">
          {badge} · {tasks.length}
        </span>
      </div>
      <div className="p-2 flex flex-col gap-1.5">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onToggle(task.id)}
              className="px-2 py-1.5 rounded-lg hover:bg-[#F5F1E8] dark:hover:bg-[#322C26] flex items-center gap-2 cursor-pointer transition-colors text-[13px]"
            >
              <span
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                  task.status === 'completed'
                    ? 'bg-[#6C8271] border-[#6C8271] text-white text-[10px]'
                    : 'border-[#A89D91]'
                }`}
              >
                {task.status === 'completed' && '✓'}
              </span>
              <span
                className={`truncate ${
                  task.status === 'completed' ? 'line-through text-[#786E64]' : ''
                }`}
              >
                {task.title}
              </span>
            </div>
          ))
        ) : (
          <div className="py-2 text-center text-[11.5px] text-[#786E64]/70">暂无任务</div>
        )}
      </div>
    </div>
  );
};
