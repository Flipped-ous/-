import React, { useState } from 'react';
import type { PriorityLevel, Task } from '../types/index.ts';

interface AddTaskSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newTask: Partial<Task>) => void;
  defaultProject?: string;
}

export const AddTaskSheet: React.FC<AddTaskSheetProps> = ({
  isOpen,
  onClose,
  onAdd,
  defaultProject = '今日有序',
}) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('normal');
  const [dateOption, setDateOption] = useState<'today' | 'tomorrow' | 'weekend' | 'none'>('today');
  const [project, setProject] = useState(defaultProject);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) return;

    let dueCategory: 'today' | 'future' | 'none' = 'today';
    let dueLabel = '今天';
    if (dateOption === 'tomorrow') {
      dueCategory = 'future';
      dueLabel = '明天';
    } else if (dateOption === 'weekend') {
      dueCategory = 'future';
      dueLabel = '本周六';
    } else if (dateOption === 'none') {
      dueCategory = 'none';
      dueLabel = '随时';
    }

    onAdd({
      title: title.trim(),
      priority,
      dueCategory,
      dueLabel,
      project,
      status: 'pending',
      badgeLabel: priority === 'urgent' ? '重点' : priority === 'important' ? '重要' : '日常',
      badgeType: priority === 'urgent' ? 'terracotta' : priority === 'important' ? 'sage' : 'gray',
      createdAt: new Date().toISOString(),
    });

    setTitle('');
    setPriority('normal');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
      {/* Dim backdrop */}
      <div
        className="fixed inset-0 bg-[#28231D]/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Bottom Sheet Drawer */}
      <div
        className="relative w-full max-w-md bg-[#FDFCFA] dark:bg-[#27221E] rounded-t-[24px] shadow-[0_-8px_30px_rgba(60,50,40,0.12)] border-t border-[#746B61]/15 p-5 pb-8 z-10 flex flex-col gap-4 transform transition-transform duration-300 animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-[#D3C9BD] dark:bg-[#5E544A] rounded-full mx-auto -mt-1 opacity-70" />

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[17px] font-semibold text-[#28231D] dark:text-[#EDE6DE]">
              新建待办
            </h2>
            <p className="text-[12px] text-[#786E64] dark:text-[#A89E92] mt-0.5">
              记住心头事，写下即释怀
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="w-7 h-7 rounded-full bg-[#F5F1E8] dark:bg-[#342E28] text-[#786E64] dark:text-[#A89E92] hover:text-[#28231D] dark:hover:text-[#EDE6DE] flex items-center justify-center cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Card Container for Task Details */}
          <div className="paper-card bg-white dark:bg-[#2F2925] rounded-[18px] p-4 border border-[#746B61]/12 shadow-[0_2px_8px_rgba(60,50,40,0.04)] flex flex-col gap-3.5">
            {/* Task Title Input */}
            <div>
              <label className="block text-[12.5px] font-medium text-[#28231D] dark:text-[#EDE6DE] mb-1.5">
                待办事项
              </label>
              <input
                type="text"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：整理茶桌并写下今日所悟…"
                className="w-full text-[14.5px] bg-[#FAF6EF] dark:bg-[#38312B] text-[#28231D] dark:text-[#EDE6DE] rounded-xl px-3.5 py-2.5 border border-[#746B61]/15 focus:border-[#A55340] outline-none transition-all placeholder:text-[#9E9284]"
              />
            </div>

            {/* Divider line */}
            <div className="border-t border-[#746B61]/8 dark:border-[#5E544A]/15" />

            {/* Importance Level */}
            <div>
              <label className="block text-[12px] font-medium text-[#786E64] dark:text-[#A89E92] mb-1.5">
                重要程度
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('urgent')}
                  className={`h-8 rounded-xl text-[12.5px] font-medium transition-all cursor-pointer border ${
                    priority === 'urgent'
                      ? 'bg-[#FDEAE6] dark:bg-[#432722] text-[#A55340] dark:text-[#E08570] border-[#A55340]'
                      : 'bg-[#FAF6EF] dark:bg-[#38312B] text-[#786E64] dark:text-[#A89E92] border-transparent hover:bg-[#EBE4D6]'
                  }`}
                >
                  重要
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('normal')}
                  className={`h-8 rounded-xl text-[12.5px] font-medium transition-all cursor-pointer border ${
                    priority === 'normal'
                      ? 'bg-white dark:bg-[#433C35] text-[#28231D] dark:text-[#EDE6DE] border-[#746B61]/30 shadow-sm'
                      : 'bg-[#FAF6EF] dark:bg-[#38312B] text-[#786E64] dark:text-[#A89E92] border-transparent hover:bg-[#EBE4D6]'
                  }`}
                >
                  普通
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('later')}
                  className={`h-8 rounded-xl text-[12.5px] font-medium transition-all cursor-pointer border ${
                    priority === 'later'
                      ? 'bg-[#F0EBE1] dark:bg-[#39322B] text-[#786E64] dark:text-[#A89E92] border-[#746B61]/30'
                      : 'bg-[#FAF6EF] dark:bg-[#38312B] text-[#786E64] dark:text-[#A89E92] border-transparent hover:bg-[#EBE4D6]'
                  }`}
                >
                  稍后
                </button>
              </div>
            </div>

            {/* Advanced toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[12px] text-[#A55340] dark:text-[#C76E59] flex items-center gap-1 cursor-pointer select-none font-medium"
              >
                <span>{showAdvanced ? '收起日期与项目' : '+ 设置排期与归属项目'}</span>
                <span className="material-symbols-outlined text-[15px]">
                  {showAdvanced ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {showAdvanced && (
                <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-[#746B61]/10">
                  {/* Date quick pills */}
                  <div>
                    <span className="text-[11.5px] text-[#786E64] dark:text-[#A89E92] block mb-1">
                      排期
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'today', label: '今天' },
                        { id: 'tomorrow', label: '明天' },
                        { id: 'weekend', label: '本周六' },
                        { id: 'none', label: '随时' },
                      ].map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setDateOption(d.id as any)}
                          className={`h-7 px-2.5 rounded-full text-[12px] transition-colors cursor-pointer ${
                            dateOption === d.id
                              ? 'bg-[#A55340] text-white font-medium'
                              : 'bg-[#FAF6EF] dark:bg-[#38312B] text-[#786E64] dark:text-[#A89E92]'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Project quick pills */}
                  <div>
                    <span className="text-[11.5px] text-[#786E64] dark:text-[#A89E92] block mb-1">
                      归属项目
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        '今日有序 Android 客户端',
                        '品牌项目',
                        '体验工坊',
                        '终端兼容',
                        '生活拾零',
                        '齐身',
                      ].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setProject(p)}
                          className={`h-7 px-2.5 rounded-full text-[12px] transition-colors cursor-pointer ${
                            project === p
                              ? 'bg-[#6C8271] text-white font-medium'
                              : 'bg-[#FAF6EF] dark:bg-[#38312B] text-[#786E64] dark:text-[#A89E92]'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Buttons Footer */}
          <div className="flex items-center justify-end gap-2.5 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-full text-[13px] font-medium text-[#786E64] dark:text-[#A89E92] hover:bg-[#F5F1E8] dark:hover:bg-[#342E28] cursor-pointer transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="h-9 px-5 rounded-full bg-[#A55340] hover:bg-[#873C2A] text-white text-[13px] font-medium tracking-wide shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              添入待办
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
