import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useDialog } from '../hooks/useDialog.ts';
import { ScheduleWheels } from './WheelPicker.tsx';
import { TimeField } from './TimeField.tsx';
import { useMotion } from '../motion/MotionProvider.tsx';
import { localDateValue, quickDate, buildDueAt } from '../utils/taskEdit.ts';
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
  const [dateOption, setDateOption] = useState<
    'today' | 'tomorrow' | 'weekend' | 'none' | 'custom'
  >('today');
  const [time, setTime] = useState('');
  const [timeError, setTimeError] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => quickDate('today'));
  const [scheduleChanged, setScheduleChanged] = useState(false);
  const config = useMotion();
  const [saved, setSaved] = useState(false);
  const [wheel, setWheel] = useState<'date' | null>(null);
  const submitted = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  useDialog(isOpen, onClose);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProjectName, setSelectedProjectName] =
    useState(defaultProject);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync state when sheet opens or taskToEdit changes
  useEffect(() => {
    if (!isOpen) return;
    setScheduleChanged(false);
    setTimeError(false);
    setSaved(false);
    submitted.current = false;
    setWheel(null);
    clearTimeout(closeTimer.current);
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setNote(taskToEdit.note || '');
      setPriority(taskToEdit.priority || 'normal');
      setSelectedProjectId(taskToEdit.projectId || '');
      setSelectedProjectName(taskToEdit.project || defaultProject);
      setShowAdvanced(true);

      if (taskToEdit.dueAt) {
        const d = new Date(taskToEdit.dueAt);
        setSelectedDate(localDateValue(d));
        setTime(
          taskToEdit.dueTime ||
            (d.getHours() || d.getMinutes()
              ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
              : ''),
        );
        setDateOption('custom');
      } else {
        setDateOption('none');
        setSelectedDate('');
        setTime('');
      }
    } else {
      setTitle('');
      setNote('');
      setPriority('normal');
      setDateOption('today');
      setSelectedDate(quickDate('today'));
      setTime('');
      setSelectedProjectId(projects[0]?.id || '');
      setSelectedProjectName(projects[0]?.name || '');
      setShowAdvanced(false);
    }
  }, [taskToEdit, isOpen, defaultProject, projects]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim() || submitted.current) return;
    if (dateOption !== 'none' && time && !/^(?:[01]?\d|2[0-3]):[0-5]?\d$/.test(time)) {
      setTimeError(true);
      setShowAdvanced(true);
      return;
    }
    submitted.current = true;

    const normalizedTime = time && dateOption !== 'none'
      ? time.split(':').map((part) => part.padStart(2, '0')).join(':')
      : '';
    const targetDueAt =
      taskToEdit && !scheduleChanged
        ? taskToEdit.dueAt
        : buildDueAt(dateOption === 'none' ? '' : selectedDate, normalizedTime);

    onSave({
      ...(taskToEdit ? { id: taskToEdit.id } : {}),
      title: title.trim(),
      note: note.trim() || undefined,
      priority,
      dueAt: targetDueAt,
      dueTime: normalizedTime || undefined,
      dueCategory: undefined,
      dueLabel: undefined,
      projectId: selectedProjectId || undefined,
      project: selectedProjectName,
      badgeLabel:
        priority === 'urgent'
          ? '重点'
          : priority === 'important'
            ? '重要'
            : undefined,
      badgeType:
        priority === 'urgent'
          ? 'terracotta'
          : priority === 'important'
            ? 'sage'
            : 'gray',
    });

    if (config.durations.smallTransition === 0) {
      onClose();
      return;
    }
    setSaved(true);
    closeTimer.current = setTimeout(
      onClose,
      config.durations.smallTransition ? 210 : 0,
    );
  };

  const projectList = [{ id: '', name: '未归属项目' }, ...projects];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none' }}
          transition={{ duration: config.durations.bottomSheet / 1000 }}
          className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto"
        >
          {/* Dim backdrop */}
          <div
            className="fixed inset-0 bg-[#28231D]/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={onClose}
          />

          {/* Bottom Sheet Drawer */}
          <motion.div
            layoutId={
              taskToEdit && config.allowScaleEffects
                ? `task-surface-${taskToEdit.id}`
                : undefined
            }
            layout={config.allowScaleEffects}
            role="dialog"
            aria-modal="true"
            aria-label={taskToEdit ? '编辑待办' : '新建待办'}
            initial={{ y: config.allowScaleEffects ? 32 : 0, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: config.allowScaleEffects ? 32 : 0, opacity: 0 }}
            transition={{
              duration: config.durations.bottomSheet / 1000,
              ease: [0.2, 0.9, 0.3, 1],
            }}
            className="bottom-sheet paper-glass relative w-full max-w-md bg-[#FDFCFA] dark:bg-[#27221E] rounded-t-[24px] shadow-[0_-8px_30px_rgba(60,50,40,0.12)] border-t border-[#746B61]/15 p-5 pb-8 z-10 flex flex-col gap-3.5 transform transition-transform duration-300 animate-in slide-in-from-bottom max-h-[90dvh] overflow-hidden no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-air" aria-hidden="true" />
            {/* Grab Handle */}
            <div className="w-10 h-1 bg-[#D3C9BD] dark:bg-[#5E544A] rounded-full mx-auto -mt-1 opacity-70" />

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[17px] font-semibold text-[#28231D] dark:text-[#EDE6DE]">
                  {taskToEdit ? '编辑待办' : '新建待办'}
                </h2>
                <p className="text-[12px] text-[#786E64] dark:text-[#A89E92] mt-0.5">
                  {taskToEdit
                    ? '修剪枝叶，使条理分明'
                    : '记住心头事，写下即释怀'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭"
                className="w-7 h-7 rounded-full bg-[#F5F1E8] dark:bg-[#342E28] text-[#786E64] dark:text-[#A89E92] hover:text-[#28231D] dark:hover:text-[#EDE6DE] flex items-center justify-center cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            {/* Form Body */}
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3.5 min-h-0 overflow-hidden"
            >
              <div className="flex flex-col gap-3.5 min-h-0 overflow-y-auto no-scrollbar">
                {/* Title */}
                <div>
                  <label className="block text-[13px] font-medium text-[#28231D] dark:text-[#EDE6DE] mb-1.5">
                    待办事项
                  </label>
                  <motion.div
                    layout={config.allowScaleEffects ? 'position' : false}
                  >
                    <input
                      type="text"
                      autoFocus
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      aria-label="待办事项"
                      placeholder="例如：整理茶桌并写下今日所悟…"
                      className="w-full text-[14.5px] bg-[#F5F1E8]/70 dark:bg-[#342E28] text-[#28231D] dark:text-[#EDE6DE] rounded-xl px-3.5 py-2.5 border border-[#746B61]/15 focus:border-[#A55340] focus:bg-white dark:focus:bg-[#3B342E] outline-none transition-all placeholder:text-[#9E9284]"
                    />
                  </motion.div>
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
                    aria-label="备注"
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
                    <span>
                      {showAdvanced
                        ? '收起排期与项目设置'
                        : '+ 设置排期、具体时间与归属项目'}
                    </span>
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
                              onClick={() => {
                                setDateOption(d.id as any);
                                setSelectedDate(
                                  d.id === 'none'
                                    ? ''
                                    : quickDate(
                                        d.id as
                                          | 'today'
                                          | 'tomorrow'
                                          | 'weekend',
                                      ),
                                );
                                setScheduleChanged(true);
                              }}
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
                        <input
                          aria-label="排期日期"
                          type="date"
                          value={selectedDate}
                          onInput={(event) => {
                            setSelectedDate(event.currentTarget.value);
                            setDateOption(
                              event.currentTarget.value ? 'custom' : 'none',
                            );
                            setScheduleChanged(true);
                          }}
                          onChange={(event) => {
                            setSelectedDate(event.target.value);
                            setDateOption(
                              event.target.value ? 'custom' : 'none',
                            );
                            setScheduleChanged(true);
                          }}
                          className="mt-2 text-[13px] bg-[#F5F1E8]/70 dark:bg-[#342E28] px-3 py-1.5 rounded-lg border border-[#746B61]/15"
                        />
                      </div>

                      {wheel === 'date' && (
                        <ScheduleWheels
                          kind="date"
                          date={selectedDate}
                          time={time}
                          onDate={(value) => {
                            setSelectedDate(value);
                            setDateOption('custom');
                            setScheduleChanged(true);
                          }}
                          onTime={setTime}
                        />
                      )}
                      <button
                        type="button"
                        className="wheel-trigger"
                        aria-expanded={wheel === 'date'}
                        onClick={() =>
                          setWheel(wheel === 'date' ? null : 'date')
                        }
                      >
                        日期滚轮
                      </button>
                      {/* Specific Time Picker */}
                      {dateOption !== 'none' && (
                        <div>
                          <span className="text-[11.5px] text-[#786E64] dark:text-[#A89E92] block mb-1">
                            具体时刻 (可选)
                          </span>
                          <TimeField value={time} onChange={(value) => {
                            setTime(value);
                            setTimeError(false);
                            setScheduleChanged(true);
                          }} />
                          {timeError && <p role="alert" className="mt-1.5 text-[11px] text-[#A55340]">请填写完整且有效的小时和分钟</p>}
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
                                (selectedProjectId &&
                                  selectedProjectId === p.id) ||
                                selectedProjectName === p.name
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
              </div>
              {/* Buttons Footer */}
              <div className="flex items-center justify-end gap-2.5 mt-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 rounded-full text-[13px] font-medium text-[#786E64] dark:text-[#A89E92] hover:bg-[#F5F1E8] dark:hover:bg-[#342E28] cursor-pointer transition-colors"
                >
                  取消
                </button>
                <motion.button
                  whileTap={
                    config.allowScaleEffects ? { scale: 0.97 } : undefined
                  }
                  animate={{
                    backgroundColor: saved ? '#6C8271' : '#A55340',
                    scale: 1,
                  }}
                  transition={{ duration: config.durations.tapFeedback / 1000 }}
                  type="submit"
                  disabled={!title.trim() || saved}
                  className="h-9 px-5 rounded-full bg-[#A55340] hover:bg-[#873C2A] text-white text-[13px] font-medium tracking-wide shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span aria-live="polite">
                    {saved
                      ? taskToEdit
                        ? '✓ 已保存'
                        : '✓ 已添入'
                      : taskToEdit
                        ? '保存修改'
                        : '添入待办'}
                  </span>
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
