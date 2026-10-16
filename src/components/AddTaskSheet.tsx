import React, { useState, useEffect } from 'react';
import type { PriorityLevel, Task, Project } from '../types/index.ts';

interface AddTaskSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => void;
  taskToEdit?: Task | null;
  projects?: Project[];
  defaultProject?: string;
}

export const AddTaskSheet: React.FC<AddTaskSheetProps> = ({
  isOpen,
  onClose,
  onSave,
  taskToEdit = null,
  projects = [],
  defaultProject = '今日有序 Android 客户端',
}) => {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('normal');
  const [dateOption, setDateOption] = useState<'today' | 'tomorrow' | 'weekend' | 'none'>('today');
  const [time, setTime] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProjectName, setSelectedProjectName] = useState(defaultProject);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync state when sheet opens or taskToEdit changes
  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setNote(taskToEdit.note || '');
      setPriority(taskToEdit.priority || 'normal');
      setSelectedProjectId(taskToEdit.projectId || '');
      setSelectedProjectName(taskToEdit.project || defaultProject);
      setShowAdvanced(true);

      if (taskToEdit.dueAt) {
        const d = new Date(taskToEdit.dueAt);
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        setTime(`${hours}:${minutes}`);

        const now = new Date();
        const diff = Math.round((d.setHours(0,0,0,0) - new Date(now).setHours(0,0,0,0)) / (86400000));
        if (diff === 0) setDateOption('today');
        else if (diff === 1) setDateOption('tomorrow');
        else if (diff > 1) setDateOption('weekend');
        else setDateOption('today');
      } else {
        setDateOption('none');
        setTime('');
      }
    } else {
      setTitle('');
      setNote('');
      setPriority('normal');
      setDateOption('today');
      setTime('');
      setSelectedProjectId(projects[0]?.id || '');
      setSelectedProjectName(projects[0]?.name || defaultProject);
      setShowAdvanced(false);
    }
  }, [taskToEdit, isOpen, defaultProject, projects]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) return;

    const now = new Date();
    let targetDueAt: string | undefined;
    let dueLabel = '今天';

    if (dateOption === 'today') {
      const d = new Date(now);
      if (time) {
        const [h, m] = time.split(':').map((n) => parseInt(n, 10));
        d.setHours(h || 18, m || 0, 0, 0);
      } else {
        d.setHours(18, 0, 0, 0);
      }
      targetDueAt = d.toISOString();
      dueLabel = time ? `今天 ${time}` : '今天';
    } else if (dateOption === 'tomorrow') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      if (time) {
        const [h, m] = time.split(':').map((n) => parseInt(n, 10));
        d.setHours(h || 10, m || 0, 0, 0);
      } else {
        d.setHours(10, 0, 0, 0);
      }
      targetDueAt = d.toISOString();
      dueLabel = time ? `明天 ${time}` : '明天';
    } else if (dateOption === 'weekend') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = day <= 6 ? 6 - day : 6;
      d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
      d.setHours(10, 0, 0, 0);
      targetDueAt = d.toISOString();
      dueLabel = '本周六';
    } else {
      targetDueAt = undefined;
      dueLabel = '随时';
    }

    onSave({
      ...(taskToEdit ? { id: taskToEdit.id } : {}),
      title: title.trim(),
      note: note.trim() || undefined,
      priority,
      dueAt: targetDueAt,
      dueTime: time || undefined,
      dueLabel,
      projectId: selectedProjectId || undefined,
      project: selectedProjectName,
      badgeLabel: priority === 'urgent' ? '重点' : priority === 'important' ? '重要' : undefined,
      badgeType: priority === 'urgent' ? 'terracotta' : priority === 'important' ? 'sage' : 'gray',
    });

    onClose();
  };

  const projectList =
    projects.length > 0
      ? projects
      : [
          { id: 'proj-1', name: '今日有序 Android 客户端' },
          { id: 'proj-2', name: '桌面书房与阅读环境整理' },
          { id: 'proj-3', name: '生活琐事与心境记录' },
        ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
      {/* Dim backdrop */}
      <div
        className="fixed inset-0 bg-[#28231D]/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Bottom Sheet Drawer */}
      <div
        className="relative w-full max-w-md bg-[#FDFCFA] dark:bg-[#27221E] rounded-t-[24px] shadow-[0_-8px_30px_rgba(60,50,40,0.12)] border-t border-[#746B61]/15 p-5 pb-8 z-10 flex flex-col gap-3.5 transform transition-transform duration-300 animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-[#D3C9BD] dark:bg-[#5E544A] rounded-full mx-auto -mt-1 opacity-70" />

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[17px] font-semibold text-[#28231D] dark:text-[#EDE6DE]">
              {taskToEdit ? '编辑待办' : '新建待办'}
            </h2>
            <p className="text-[12px] text-[#786E64] dark:text-[#A89E92] mt-0.5">
              {taskToEdit ? '修剪枝叶，使条理分明' : '记住心头事，写下即释怀'}
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Title */}
          <div>
            <label className="block text-[13px] font-medium text-[#28231D] dark:text-[#EDE6DE] mb-1.5">
              待办事项
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：整理茶桌并写下今日所悟…"
              className="w-full text-[14.5px] bg-[#F5F1E8]/70 dark:bg-[#342E28] text-[#28231D] dark:text-[#EDE6DE] rounded-xl px-3.5 py-2.5 border border-[#746B61]/15 focus:border-[#A55340] focus:bg-white dark:focus:bg-[#3B342E] outline-none transition-all placeholder:text-[#9E9284]"
            />
          </div>

          {/* Note / Memo */}
          <div>
            <label className="block text-[12px] font-medium text-[#786E64] dark:text-[#A89E92] mb-1">
              简要说明与心境
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="添加补充细节、注意要点或当下心境…"
              className="w-full text-[13px] bg-[#F5F1E8]/50 dark:bg-[#342E28] text-[#28231D] dark:text-[#EDE6DE] rounded-xl px-3.5 py-2 border border-[#746B61]/12 focus:border-[#A55340] focus:bg-white dark:focus:bg-[#3B342E] outline-none transition-all placeholder:text-[#9E9284] resize-none"
            />
          </div>

          {/* Importance Level */}
          <div>
            <label className="block text-[12px] font-medium text-[#786E64] dark:text-[#A89E92] mb-1.5">
              重要程度
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPriority('urgent')}
                className={`h-8.5 rounded-xl text-[12.5px] font-medium transition-all cursor-pointer border ${
                  priority === 'urgent'
                    ? 'bg-[#FDEAE6] dark:bg-[#432722] text-[#A55340] dark:text-[#E08570] border-[#A55340]'
                    : 'bg-[#F5F1E8]/60 dark:bg-[#342E28] text-[#786E64] dark:text-[#A89E92] border-transparent hover:bg-[#EBE4D6]'
                }`}
              >
                紧急且重要
              </button>
              <button
                type="button"
                onClick={() => setPriority('important')}
                className={`h-8.5 rounded-xl text-[12.5px] font-medium transition-all cursor-pointer border ${
                  priority === 'important'
                    ? 'bg-[#EAF0EB] dark:bg-[#28372B] text-[#6C8271] dark:text-[#95B59C] border-[#6C8271]'
                    : 'bg-[#F5F1E8]/60 dark:bg-[#342E28] text-[#786E64] dark:text-[#A89E92] border-transparent hover:bg-[#EBE4D6]'
                }`}
              >
                重要不紧急
              </button>
              <button
                type="button"
                onClick={() => setPriority('normal')}
                className={`h-8.5 rounded-xl text-[12.5px] font-medium transition-all cursor-pointer border ${
                  priority === 'normal'
                    ? 'bg-white dark:bg-[#423A33] text-[#28231D] dark:text-[#EDE6DE] border-[#746B61]/30 shadow-sm'
                    : 'bg-[#F5F1E8]/60 dark:bg-[#342E28] text-[#786E64] dark:text-[#A89E92] border-transparent hover:bg-[#EBE4D6]'
                }`}
              >
                日常普通
              </button>
            </div>
          </div>

          {/* Advanced toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[12px] text-[#A55340] dark:text-[#C76E59] flex items-center gap-1 cursor-pointer select-none"
            >
              <span>{showAdvanced ? '收起排期与项目设置' : '+ 设置排期、具体时间与归属项目'}</span>
              <span className="material-symbols-outlined text-[15px]">
                {showAdvanced ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {showAdvanced && (
              <div className="flex flex-col gap-3 mt-2.5 pt-2.5 border-t border-[#746B61]/10">
                {/* Date quick pills */}
                <div>
                  <span className="text-[11.5px] text-[#786E64] dark:text-[#A89E92] block mb-1">
                    排期日期
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'today', label: '今天' },
                      { id: 'tomorrow', label: '明天' },
                      { id: 'weekend', label: '本周六' },
                      { id: 'none', label: '随时 (未安排)' },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDateOption(d.id as any)}
                        className={`h-7 px-3 rounded-full text-[12px] transition-colors cursor-pointer ${
                          dateOption === d.id
                            ? 'bg-[#A55340] text-white font-medium'
                            : 'bg-[#F5F1E8] dark:bg-[#342E28] text-[#786E64] dark:text-[#A89E92]'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific Time Picker */}
                {dateOption !== 'none' && (
                  <div>
                    <span className="text-[11.5px] text-[#786E64] dark:text-[#A89E92] block mb-1">
                      具体时刻 (可选)
                    </span>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="text-[13px] bg-[#F5F1E8]/70 dark:bg-[#342E28] text-[#28231D] dark:text-[#EDE6DE] px-3 py-1.5 rounded-lg border border-[#746B61]/15 outline-none focus:border-[#A55340]"
                    />
                  </div>
                )}

                {/* Project selection */}
                <div>
                  <span className="text-[11.5px] text-[#786E64] dark:text-[#A89E92] block mb-1">
                    归属项目
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {projectList.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(p.id);
                          setSelectedProjectName(p.name);
                        }}
                        className={`h-7 px-2.5 rounded-full text-[12px] transition-colors cursor-pointer ${
                          (selectedProjectId && selectedProjectId === p.id) || selectedProjectName === p.name
                            ? 'bg-[#6C8271] text-white font-medium'
                            : 'bg-[#F5F1E8] dark:bg-[#342E28] text-[#786E64] dark:text-[#A89E92]'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
              {taskToEdit ? '保存修改' : '添入待办'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
