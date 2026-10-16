import React, { useState } from 'react';
import type { Task } from '../types/index.ts';
import { SegmentedControl } from '../components/SegmentedControl.tsx';

interface TodayViewProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onOpenAddTask: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  tasks,
  onToggleTask,
  onOpenAddTask,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);

  // Filter tasks
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const displayedPending = filter === 'completed' ? [] : pendingTasks;
  const displayedCompleted = filter === 'pending' ? [] : completedTasks;

  const totalCount = tasks.length;
  const completedCount = completedTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Badge background and text colors
  const getBadgeStyle = (badgeType?: string) => {
    switch (badgeType) {
      case 'terracotta':
        return 'bg-[#FDEAE6] dark:bg-[#432722] text-[#A55340] dark:text-[#E08570]';
      case 'sage':
        return 'bg-[#EAF0EB] dark:bg-[#28372B] text-[#6C8271] dark:text-[#95B59C]';
      case 'amber':
        return 'bg-[#FBF1E2] dark:bg-[#403323] text-[#C88A3A] dark:text-[#E2A657]';
      case 'gray':
      default:
        return 'bg-[#EFEAE2] dark:bg-[#38322B] text-[#786E64] dark:text-[#A89E92]';
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-3 pb-24">
      {/* Top Header */}
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#F5E8E4] dark:bg-[#422923] flex items-center justify-center text-[#A55340] dark:text-[#E08570]">
            <span className="material-symbols-outlined text-[19px]">calendar_today</span>
          </div>
          <div>
            <div className="text-[11px] font-normal text-[#786E64] dark:text-[#A89E92] leading-none mb-0.5">
              晨光暖白 · 顺遂有常
            </div>
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
          <span className="material-symbols-outlined text-[20px] leading-none">add</span>
        </button>
      </header>

      {/* Overview stats & Subtitle Banner */}
      <div className="flex items-baseline justify-between mb-3.5">
        <div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-[22px] font-bold text-[#28231D] dark:text-[#EDE6DE]">
              今日待办 · {totalCount}项
            </h2>
          </div>
          <p className="text-[12px] text-[#786E64] dark:text-[#A89E92] mt-0.5">
            5月24日 · 星期五 · 顺遂有序 · 心安神凝
          </p>
        </div>

        {/* Subtle Progress Capsule */}
        <div className="px-2.5 py-1 rounded-full bg-[#EAF0EB] dark:bg-[#28372B] text-[#6C8271] dark:text-[#95B59C] text-[11px] font-medium shrink-0">
          进行度 {progressPercent}%
        </div>
      </div>

      {/* Segmented Control Filter */}
      <SegmentedControl
        className="mb-3.5"
        activeId={filter}
        onChange={(val) => setFilter(val as any)}
        options={[
          { id: 'all', label: '全部', count: totalCount },
          { id: 'pending', label: '待完成', count: pendingTasks.length },
          { id: 'completed', label: '已完成', count: completedCount },
        ]}
      />

      {/* Pending Tasks List */}
      <div className="flex flex-col gap-2.5">
        {displayedPending.map((task) => (
          <article
            key={task.id}
            className="paper-card rounded-[14px] p-3.5 relative overflow-hidden group transition-all"
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => onToggleTask(task.id)}
                aria-label={`完成 ${task.title}`}
                className="w-5 h-5 mt-0.5 rounded-[5px] border-[1.5px] border-[#A89D91] dark:border-[#796F64] bg-white dark:bg-[#342E28] hover:border-[#A55340] flex items-center justify-center shrink-0 active:scale-90 transition-transform cursor-pointer"
              >
                {/* empty for pending */}
              </button>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1.5">
                  <h3 className="text-[14.5px] font-medium text-[#28231D] dark:text-[#EDE6DE] leading-snug">
                    {task.title}
                  </h3>
                  {task.badgeLabel && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${getBadgeStyle(
                        task.badgeType
                      )}`}
                    >
                      {task.badgeLabel}
                    </span>
                  )}
                </div>

                {task.note && (
                  <p className="text-[12px] text-[#786E64] dark:text-[#A89E92] mt-1 leading-relaxed">
                    {task.note}
                  </p>
                )}

                {/* Bottom line: time & project */}
                <div className="flex items-center gap-2 mt-2 text-[11.5px] text-[#786E64] dark:text-[#A89E92]">
                  {task.dueTime && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] leading-none">
                        schedule
                      </span>
                      {task.dueTime}
                    </span>
                  )}
                  {task.dueTime && task.project && (
                    <span className="text-[#D3C9BD] dark:text-[#5E544A] text-[10px]">·</span>
                  )}
                  {task.project && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] leading-none">
                        folder
                      </span>
                      {task.project}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}

        {displayedPending.length === 0 && filter === 'pending' && (
          <div className="text-center py-8 text-[13px] text-[#786E64] dark:text-[#A89E92]">
            今日所有待办均已完成，心安神凝
          </div>
        )}
      </div>

      {/* Completed Section (Collapsible) */}
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
              <span>已完成 ({displayedCompleted.length})</span>
            </div>
            <span
              className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                isCompletedExpanded ? '' : '-rotate-90'
              }`}
            >
              expand_more
            </span>
          </button>

          {isCompletedExpanded && (
            <div className="flex flex-col gap-2 mt-1.5">
              {displayedCompleted.map((task) => (
                <article
                  key={task.id}
                  className="paper-card is-completed rounded-[14px] p-3.5 relative overflow-hidden bg-white/70 dark:bg-[#27221E]/60 opacity-75 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      aria-label={`撤销完成 ${task.title}`}
                      className="w-5 h-5 mt-0.5 rounded-[5px] bg-[#6C8271] border-[1.5px] border-[#6C8271] flex items-center justify-center shrink-0 active:scale-90 transition-transform cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px] text-white checkbox-icon-active leading-none">
                        check
                      </span>
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1.5">
                        <h3 className="title-line text-[14.5px] font-normal leading-snug">
                          {task.title}
                        </h3>
                        {task.badgeLabel && (
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${getBadgeStyle(
                              task.badgeType
                            )}`}
                          >
                            {task.badgeLabel}
                          </span>
                        )}
                      </div>

                      {task.note && (
                        <p className="text-[12px] text-[#786E64]/80 dark:text-[#A89E92]/80 mt-1">
                          {task.note}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-2 text-[11.5px] text-[#786E64]/70 dark:text-[#A89E92]/70">
                        {task.dueTime && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] leading-none">
                              schedule
                            </span>
                            {task.dueTime}
                          </span>
                        )}
                        {task.dueTime && task.project && <span>·</span>}
                        {task.project && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] leading-none">
                              folder
                            </span>
                            {task.project}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
