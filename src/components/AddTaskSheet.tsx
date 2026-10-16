import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useDialog } from '../hooks/useDialog.ts';
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
  defaultProject = '�������� Android �ͻ���',
}) => {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('normal');
  const [dateOption, setDateOption] = useState<
    'today' | 'tomorrow' | 'weekend' | 'none' | 'custom'
  >('today');
  const [time, setTime] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => quickDate('today'));
  const [scheduleChanged, setScheduleChanged] = useState(false);
  const config = useMotion();
  useDialog(isOpen, onClose);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProjectName, setSelectedProjectName] =
    useState(defaultProject);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync state when sheet opens or taskToEdit changes
  useEffect(() => {
    if (!isOpen) return;
    setScheduleChanged(false);
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
    if (!title.trim()) return;

    const targetDueAt =
      taskToEdit && !scheduleChanged
        ? taskToEdit.dueAt
        : buildDueAt(dateOption === 'none' ? '' : selectedDate, time);

    onSave({
      ...(taskToEdit ? { id: taskToEdit.id } : {}),
      title: title.trim(),
      note: note.trim() || undefined,
      priority,
      dueAt: targetDueAt,
      dueTime: time || undefined,
      dueCategory: undefined,
      dueLabel: undefined,
      projectId: selectedProjectId || undefined,
      project: selectedProjectName,
      badgeLabel:
        priority === 'urgent'
          ? '�ص�'
          : priority === 'important'
            ? '��Ҫ'
            : undefined,
      badgeType:
        priority === 'urgent'
          ? 'terracotta'
          : priority === 'important'
            ? 'sage'
            : 'gray',
    });

    onClose();
  };

  const projectList = [{ id: '', name: 'δ������Ŀ' }, ...projects];

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
            role="dialog"
            aria-modal="true"
            aria-label={taskToEdit ? '�༭����' : '�½�����'}
            initial={{ y: config.allowScaleEffects ? 32 : 0, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: config.allowScaleEffects ? 32 : 0, opacity: 0 }}
            transition={{
              duration: config.durations.bottomSheet / 1000,
              ease: [0.2, 0.9, 0.3, 1],
            }}
            className="bottom-sheet relative w-full max-w-md bg-[#FDFCFA] dark:bg-[#27221E] rounded-t-[24px] shadow-[0_-8px_30px_rgba(60,50,40,0.12)] border-t border-[#746B61]/15 p-5 pb-8 z-10 flex flex-col gap-3.5 transform transition-transform duration-300 animate-in slide-in-from-bottom max-h-[90dvh] overflow-hidden no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab Handle */}
            <div className="w-10 h-1 bg-[#D3C9BD] dark:bg-[#5E544A] rounded-full mx-auto -mt-1 opacity-70" />

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[17px] font-semibold text-[#28231D] dark:text-[#EDE6DE]">
                  {taskToEdit ? '�༭����' : '�½�����'}
                </h2>
                <p className="text-[12px] text-[#786E64] dark:text-[#A89E92] mt-0.5">
                  {taskToEdit
                    ? '�޼�֦Ҷ��ʹ��������'
                    : '��ס��ͷ�£�д�¼��ͻ�'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="�ر�"
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
                    ��������
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    aria-label="��������"
                    placeholder="���磺����������д�½�������"
                    className="w-full text-[14.5px] bg-[#F5F1E8]/70 dark:bg-[#342E28] text-[#28231D] dark:text-[#EDE6DE] rounded-xl px-3.5 py-2.5 border border-[#746B61]/15 focus:border-[#A55340] focus:bg-white dark:focus:bg-[#3B342E] outline-none transition-all placeholder:text-[#9E9284]"
                  />
                </div>

                {/* Note / Memo */}
                <div>
                  <label className="block text-[12px] font-medium text-[#786E64] dark:text-[#A89E92] mb-1">
                    ��Ҫ˵�����ľ�
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    aria-label="��ע"
                    placeholder="���Ӳ���ϸ�ڡ�ע��Ҫ������ľ���"
                    className="w-full text-[13px] bg-[#F5F1E8]/50 dark:bg-[#342E28] text-[#28231D] dark:text-[#EDE6DE] rounded-xl px-3.5 py-2 border border-[#746B61]/12 focus:border-[#A55340] focus:bg-white dark:focus:bg-[#3B342E] outline-none transition-all placeholder:text-[#9E9284] resize-none"
                  />
                </div>

                {/* Importance Level */}
                <div>
                  <label className="block text-[12px] font-medium text-[#786E64] dark:text-[#A89E92] mb-1.5">
                    ��Ҫ�̶�
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
                      ��������Ҫ
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
                      ��Ҫ������
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
                      �ճ���ͨ
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
                        ? '������������Ŀ����'
                        : '+ �������ڡ�����ʱ���������Ŀ'}
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
                          ��������
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { id: 'today', label: '����' },
                            { id: 'tomorrow', label: '����' },
                            { id: 'weekend', label: '������' },
                            { id: 'none', label: '��ʱ (δ����)' },
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
                          aria-label="��������"
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

                      {/* Specific Time Picker */}
                      {dateOption !== 'none' && (
                        <div>
                          <span className="text-[11.5px] text-[#786E64] dark:text-[#A89E92] block mb-1">
                            ����ʱ�� (��ѡ)
                          </span>
                          <input
                            aria-label="����ʱ��"
                            type="time"
                            value={time}
                            onInput={(event) => {
                              setTime(event.currentTarget.value);
                              setScheduleChanged(true);
                            }}
                            onChange={(e) => {
                              setTime(e.target.value);
                              setScheduleChanged(true);
                            }}
                            className="text-[13px] bg-[#F5F1E8]/70 dark:bg-[#342E28] text-[#28231D] dark:text-[#EDE6DE] px-3 py-1.5 rounded-lg border border-[#746B61]/15 outline-none focus:border-[#A55340]"
                          />
                        </div>
                      )}

                      {/* Project selection */}
                      <div>
                        <span className="text-[11.5px] text-[#786E64] dark:text-[#A89E92] block mb-1">
                          ������Ŀ
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
                  ȡ��
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="h-9 px-5 rounded-full bg-[#A55340] hover:bg-[#873C2A] text-white text-[13px] font-medium tracking-wide shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {taskToEdit ? '�����޸�' : '�������'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
