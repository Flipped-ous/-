import React, { useState } from 'react';
import type { Task, PriorityLevel } from '../types/index.ts';

interface TaskCardProps {
  task: Task;
  onToggle: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  onPriorityChange?: (taskId: string, priority: PriorityLevel) => void;
  className?: string;
  isCompactRow?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggle,
  onDelete,
  onEdit,
  onPriorityChange,
  className = '',
  isCompactRow = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const isCompleted = task.status === 'completed';

  // Left vertical accent stripe
  const getStripeColor = () => {
    if (isCompleted) return null;
    if (task.priority === 'urgent' || task.dueCategory === 'overdue') return 'bg-[#A55340] dark:bg-[#C76E59]';
    if (task.priority === 'important') return 'bg-[#6C8271] dark:bg-[#819E87]';
    return null;
  };

  const stripeColor = getStripeColor();

  return (
    <article
      className={`relative group ${
        isCompactRow
          ? 'py-2.5 px-3 hover:bg-[#FAF6EF]/60 dark:hover:bg-[#322C26]/40 transition-colors'
          : `paper-card rounded-[14px] p-3 pl-3.5 overflow-hidden ${
              isCompleted ? 'opacity-70 is-completed bg-[#FFFFFF]/75 dark:bg-[#27221E]/60' : ''
            }`
      } ${className}`}
    >
      {/* Left accent bar for independent cards */}
      {!isCompactRow && stripeColor && (
        <div className={`absolute left-0 top-2 bottom-2 w-[2.5px] rounded-r-full ${stripeColor}`} />
      )}

      <div className="flex items-start gap-2.5">
        {/* Custom animated checkbox */}
        <button
          type="button"
          onClick={() => onToggle(task.id)}
          aria-label={isCompleted ? `标记 "${task.title}" 为待办` : `完成 "${task.title}"`}
          className="relative flex items-center justify-center w-5 h-5 mt-0.5 shrink-0 cursor-pointer active:scale-90 transition-transform"
        >
          <div
            className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center transition-all ${
              isCompleted
                ? 'bg-[#6C8271] border-[#6C8271] dark:bg-[#819E87] dark:border-[#819E87]'
                : 'bg-white dark:bg-[#342E28] border-[#A89D91] dark:border-[#796F64] group-hover:border-[#A55340]'
            }`}
          >
            {isCompleted && (
              <span className="material-symbols-outlined text-[15px] text-white checkbox-icon-active select-none leading-none">
                check
              </span>
            )}
          </div>
        </button>

        {/* Content body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1.5">
            <span
              onClick={() => onEdit?.(task)}
              className={`title-line text-[14.5px] leading-snug break-words cursor-pointer ${
                isCompleted
                  ? 'text-[#786E64] dark:text-[#A89E92] font-normal'
                  : 'text-[#28231D] dark:text-[#EDE6DE] font-medium'
              }`}
            >
              {task.title}
            </span>

            {/* More actions trigger */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="text-[#8C7F73] hover:text-[#28231D] dark:hover:text-[#EDE6DE] p-1 rounded -mr-1 -mt-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                title="更多操作"
                aria-label="更多操作"
              >
                <span className="material-symbols-outlined text-[18px] leading-none">
                  more_horiz
                </span>
              </button>

              {/* Action Dropdown Menu */}
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-6 w-36 bg-white dark:bg-[#2C2723] rounded-xl shadow-lg border border-[#746B61]/15 py-1 z-30 text-[12.5px] select-none">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onEdit?.(task);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#F5F1E8] dark:hover:bg-[#38312B] flex items-center gap-2 text-[#28231D] dark:text-[#EDE6DE] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                      编辑任务
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        const nextPrio =
                          task.priority === 'urgent'
                            ? 'important'
                            : task.priority === 'important'
                            ? 'normal'
                            : task.priority === 'normal'
                            ? 'later'
                            : 'urgent';
                        onPriorityChange?.(task.id, nextPrio);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#F5F1E8] dark:hover:bg-[#38312B] flex items-center gap-2 text-[#28231D] dark:text-[#EDE6DE] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">flag</span>
                      切换优先级
                    </button>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          onDelete(task.id);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#FDEAE6] dark:hover:bg-[#432722] flex items-center gap-2 text-[#A55340] dark:text-[#E08570] cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                        删除任务
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Optional task note */}
          {task.note && !isCompleted && (
            <p className="text-[12px] text-[#786E64] dark:text-[#A89E92] mt-0.5 line-clamp-1">
              {task.note}
            </p>
          )}

          {/* Metadata chips / sub-row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11.5px]">
            {isCompleted && task.completedAt ? (
              <span className="text-[#786E64]/70 dark:text-[#A89E92]/70 text-[11.5px]">
                {task.completedAt}
              </span>
            ) : (
              <>
                {/* Due status */}
                {task.dueCategory === 'overdue' && (
                  <span className="inline-flex items-center gap-0.5 text-[#A55340] dark:text-[#C76E59] font-medium">
                    <span className="material-symbols-outlined text-[13px] leading-none">
                      history
                    </span>
                    {task.dueLabel || '已逾期'}
                  </span>
                )}

                {task.dueCategory === 'today' && task.dueTime && (
                  <span className="inline-flex items-center gap-0.5 text-[#786E64] dark:text-[#A89E92]">
                    <span className="material-symbols-outlined text-[12.5px] leading-none">
                      schedule
                    </span>
                    今天 {task.dueTime}
                  </span>
                )}

                {task.dueCategory === 'today' && !task.dueTime && task.dueLabel && (
                  <span className="inline-flex items-center gap-0.5 text-[#786E64] dark:text-[#A89E92]">
                    <span className="material-symbols-outlined text-[12.5px] leading-none">
                      today
                    </span>
                    {task.dueLabel}
                  </span>
                )}

                {task.dueCategory === 'future' && task.dueLabel && (
                  <span className="inline-flex items-center gap-0.5 text-[#786E64] dark:text-[#A89E92]">
                    <span className="material-symbols-outlined text-[12.5px] leading-none">
                      calendar_month
                    </span>
                    {task.dueLabel}
                  </span>
                )}

                {/* Priority indicator badge */}
                {(task.priority === 'urgent' || task.priority === 'important') && (
                  <>
                    <span className="text-[#D3C9BD] dark:text-[#5E544A] text-[10px]">·</span>
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        task.priority === 'urgent'
                          ? 'text-[#A55340] dark:text-[#C76E59]'
                          : 'text-[#6C8271] dark:text-[#819E87]'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          task.priority === 'urgent'
                            ? 'bg-[#A55340] dark:bg-[#C76E59]'
                            : 'bg-[#6C8271] dark:bg-[#819E87]'
                        }`}
                      />
                      {task.priority === 'urgent' ? '今天必须' : '重要'}
                    </span>
                  </>
                )}

                {/* Project Tag */}
                {task.project && (
                  <>
                    <span className="text-[#D3C9BD] dark:text-[#5E544A] text-[10px]">·</span>
                    <span className="inline-flex items-center gap-0.5 text-[#786E64] dark:text-[#A89E92]">
                      <span className="material-symbols-outlined text-[12.5px] leading-none">
                        folder
                      </span>
                      {task.project}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
