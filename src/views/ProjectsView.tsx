import React, { useState } from 'react';
import type { Project, Task } from '../types/index.ts';
import { SegmentedControl } from '../components/SegmentedControl.tsx';
import { AnimatedNumber } from '../components/AnimatedNumber.tsx';
import { AnimatePresence, motion } from 'motion/react';
import { useMotion } from '../motion/MotionProvider.tsx';
import { useDialog } from '../hooks/useDialog.ts';
import { formatDueLabel } from '../utils/taskLogic.ts';
import { SwipeableProject } from '../components/SwipeableProject.tsx';
import { belongsToProject } from '../utils/projectRelations.ts';

interface ProjectsViewProps {
  projects: Project[];
  tasks: Task[];
  onAddProject: (project: Partial<Project>) => void;
  onToggleTask: (taskId: string) => void;
  onEditTask?: (task: Task) => void;
  onOpenDetail?: (project: Project) => void;
  onReorderProject?: (id: string, target: string, after: boolean) => void | Promise<void>;
  onDeleteProject?: (project: Project) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  tasks,
  onAddProject,
  onToggleTask,
  onEditTask,
  onOpenDetail,
  onDeleteProject,
  onReorderProject,
}) => {
  const config = useMotion();
  const [filter, setFilter] = useState<
    'all' | 'active' | 'paused' | 'archived'
  >('all');
  const [expandedId, setExpandedId] = useState<string | null>('proj-1');
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [recentId, setRecentId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [dragSession, setDragSession] = useState<{id:string;rows:Project[];shifts:Record<string,number>} | null>(null);

  useDialog(showNewModal, () => setShowNewModal(false));

  const filteredProjects = projects.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const activeCount = projects.filter((p) => p.status === 'active').length;
  const pausedCount = projects.filter((p) => p.status === 'paused').length;
  const archivedCount = projects.filter((p) => p.status === 'archived').length;

  const toggleExpand = (id: string) => {
    setRecentId(id);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const nowIso = new Date().toISOString();
    onAddProject({
      name: newTitle.trim(),
      description: newDesc.trim() || '新建个人项目',
      status: 'active',
      statusLabel: '● 进行中',
      statusType: 'sage',
      docCount: 0,
      docs: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    setNewTitle('');
    setNewDesc('');
    setShowNewModal(false);
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-3 pb-24">
      {/* Top Header */}
      <header className="flex items-center justify-between mb-3 min-h-11">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[22px] text-[#A55340] dark:text-[#C76E59]">
            folder_open
          </span>
          <h1 className="text-[20px] font-bold text-[#28231D] dark:text-[#EDE6DE] tracking-tight">
            项目
          </h1>
          <span className="px-2 py-0.5 rounded-full bg-[#EBE4D6] dark:bg-[#38312B] text-[11px] font-semibold text-[#786E64] dark:text-[#A89E92]">
            <AnimatedNumber value={projects.length} />
          </span>
        </div>

        {/* + 新建项目 button */}
        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          aria-label="新建项目" title="新建项目" className="compact-icon-button compact-add"
        >
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
        </button>
      </header>

      {/* Segmented Control Filter */}
      <SegmentedControl
        className="mb-3.5"
        activeId={filter}
        onChange={(val) => { if(!dragSession) setFilter(val as any); }}
        options={[
          { id: 'all', label: '全部', count: projects.length },
          { id: 'active', label: '进行中', count: activeCount },
          { id: 'paused', label: '暂停', count: pausedCount },
          { id: 'archived', label: '归档', count: archivedCount },
        ]}
      />

      {/* Project Cards Stream */}
      <div className="flex flex-col gap-3">
        {!filteredProjects.length && <p className="text-center text-[13px] text-[#82776C] dark:text-[#B3A79B] py-10">{projects.length ? '这个分类下还没有项目' : '还没有项目，点击右上角新建'}</p>}
        {(dragSession?.rows ?? filteredProjects).map((project) => {
          const isExpanded = expandedId === project.id;

          // Real-time dynamic calculation from unified tasks
          const projectTasks = tasks.filter(
            (t) => belongsToProject(t, project),
          );
          const pendingCount = projectTasks.filter(
            (t) => t.status === 'pending',
          ).length;
          const completedCount = projectTasks.filter(
            (t) => t.status === 'completed',
          ).length;
          const docCount = project.docCount || project.docs?.length || 0;

          return (
            <SwipeableProject id={project.id} onReorder={onReorderProject}
              shift={dragSession?.shifts[project.id] || 0} sortActive={!!dragSession}
              onSortStart={id=>{setSwipedId(null);setDragSession({id,rows:filteredProjects,shifts:{}});}}
              onSortPreview={shifts=>setDragSession(before=>before?{...before,shifts}:before)}
              onSortEnd={()=>setDragSession(null)} key={project.id} name={project.name} open={swipedId === project.id}
              onOpenChange={open => setSwipedId(current => open ? project.id : current === project.id ? null : current)}
              onDelete={onDeleteProject ? () => onDeleteProject(project) : undefined}>
            <motion.article
              layout={false}
              transition={{
                layout: { duration: config.durations.listReflow / 1000 },
              }}
              animate={{ y: isExpanded && config.level === 'rich' ? -2 : 0 }}
              data-stacked={
                config.level === 'rich' &&
                (project.id === recentId ||
                  project.id ===
                    projects.find((p) => p.status === 'active')?.id)
                  ? 'true'
                  : undefined
              }
              data-expanded={isExpanded}
              key={project.id}
              className="paper-card project-folder rounded-[16px] bg-white dark:bg-[#27221E] transition-shadow duration-300"
            >
              {/* Card Header row */}
              <div
                role="button"
                data-project-swipe-handle
                aria-keyshortcuts="ArrowLeft Delete"
                tabIndex={0}
                aria-expanded={isExpanded}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleExpand(project.id);
                  }
                }}
                onClick={() => toggleExpand(project.id)}
                className="p-3.5 rounded-[16px] cursor-pointer hover:bg-[#FAF6EF]/60 dark:hover:bg-[#322C26]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <motion.span
                      layout={config.allowScaleEffects ? 'position' : false}
                      className="material-symbols-outlined text-[20px] text-[#A55340] dark:text-[#C76E59]"
                    >
                      folder
                    </motion.span>
                    <motion.h3
                      layout={config.allowScaleEffects ? 'position' : false}
                      className="text-[15px] font-bold text-[#28231D] dark:text-[#EDE6DE] min-w-0 break-words"
                    >
                      {project.name}
                    </motion.h3>
                  </div>

                  <div className="project-card-actions">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      project.statusType === 'terracotta'
                        ? 'bg-[#FDEAE6] dark:bg-[#432722] text-[#A55340] dark:text-[#E08570]'
                        : project.statusType === 'sage'
                          ? 'bg-[#EAF0EB] dark:bg-[#28372B] text-[#6C8271] dark:text-[#95B59C]'
                          : 'bg-[#FBF1E2] dark:bg-[#403323] text-[#C88A3A] dark:text-[#E2A657]'
                    }`}
                  >
                    {project.statusLabel ||
                      (project.status === 'active' ? '● 进行中' : '● 已暂停')}
                  </span>
                  </div>
                </div>

                {/* Subtitle description */}
                <p className="text-[12px] text-[#786E64] dark:text-[#A89E92] mt-1.5 leading-relaxed">
                  {project.description}
                </p>

                {/* Stats row derived dynamically */}
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#746B61]/8 dark:border-[#5E544A]/15 text-[11.5px] text-[#786E64] dark:text-[#A89E92]">
                  <span className="inline-flex items-center gap-1">
                    待办 <AnimatedNumber value={pendingCount} /> · 已完成{' '}
                    <AnimatedNumber value={completedCount} /> · 资料 {docCount}
                  </span>
                  <span className="text-[11px] text-[#A55340] dark:text-[#C76E59] flex items-center gap-0.5">
                    {isExpanded ? '收起详情' : '点击展开'}
                    <span
                      className={`material-symbols-outlined text-[14px] transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </span>
                </div>
              </div>

              {/* Expanded details container with physical paper unfold */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="details"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      duration: config.allowScaleEffects
                        ? 0.35
                        : config.durations.smallTransition / 1000,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="overflow-hidden rounded-b-[16px]"
                  >
                    <div>
                      <div className="px-3.5 pb-3.5 pt-2 bg-[#FAF6EF]/50 dark:bg-[#2C2723]/60 border-t border-[#746B61]/10 flex flex-col gap-3">
                        <button type="button" className="project-detail-entry" onClick={()=>onOpenDetail?.(project)}>项目详情与相关笔记 <span aria-hidden="true">→</span></button>
                        {/* Dynamic Project Tasks Checklist (linked directly to global tasks) */}
                        <div>
                          <div className="flex items-center justify-between text-[12px] text-[#786E64] dark:text-[#A89E92] mb-1.5 font-medium">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-[#6C8271]">
                                task_alt
                              </span>
                              项目待办清单 (
                              <AnimatedNumber value={pendingCount} /> 待办)
                            </span>
                            <span className="text-[11px] opacity-75">
                              共 <AnimatedNumber value={projectTasks.length} />{' '}
                              项
                            </span>
                          </div>

                          {projectTasks.length > 0 ? (
                            <div className="flex flex-col gap-1.5">
                              {projectTasks.map((t, i) => (
                                <motion.div
                                  layout={
                                    config.allowScaleEffects
                                      ? 'position'
                                      : false
                                  }
                                  layoutId={
                                    config.allowScaleEffects
                                      ? `task-surface-${t.id}`
                                      : undefined
                                  }
                                  initial={{
                                    opacity: 0,
                                    y: config.allowScaleEffects ? 4 : 0,
                                  }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{
                                    duration:
                                      config.durations.smallTransition / 1000,
                                    delay: config.allowScaleEffects
                                      ? Math.min(i, 4) * 0.025
                                      : 0,
                                  }}
                                  key={t.id}
                                  className="bg-white dark:bg-[#342E28] rounded-xl p-2 px-2.5 flex items-center justify-between text-[12.5px] border border-[#746B61]/10 hover:border-[#A55340] transition-colors"
                                >
                                  <div
                                    onClick={() => onToggleTask(t.id)}
                                    className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                                  >
                                    <span
                                      className={`w-4 h-4 rounded-[4px] border flex items-center justify-center text-[10px] shrink-0 ${
                                        t.status === 'completed'
                                          ? 'bg-[#6C8271] border-[#6C8271] text-white'
                                          : 'border-[#A89D91]'
                                      }`}
                                    >
                                      {t.status === 'completed' && '✓'}
                                    </span>
                                    <span
                                      className={`truncate ${
                                        t.status === 'completed'
                                          ? 'line-through text-[#786E64]'
                                          : 'text-[#28231D] dark:text-[#EDE6DE]'
                                      }`}
                                    >
                                      {t.title}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                    <span className="text-[11px] text-[#786E64] dark:text-[#A89E92] bg-[#F5F1E8] dark:bg-[#3E362F] px-1.5 py-0.5 rounded">
                                      {formatDueLabel(t)}
                                    </span>
                                    {onEditTask && (
                                      <button
                                        type="button"
                                        onClick={() => onEditTask(t)}
                                        className="w-5 h-5 rounded flex items-center justify-center text-[#9E9284] hover:text-[#A55340] cursor-pointer"
                                        title="编辑"
                                      >
                                        <span className="material-symbols-outlined text-[13px]">
                                          edit
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-3 text-[12px] text-[#786E64]/70 bg-white/50 dark:bg-[#342E28]/50 rounded-xl">
                              暂无分配至此项目的任务
                            </div>
                          )}
                        </div>

                        {/* Associated Documents */}
                        {project.docs && project.docs.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{
                              duration: config.durations.smallTransition / 1000,
                              delay: config.allowScaleEffects ? 0.12 : 0,
                            }}
                          >
                            <div className="flex items-center justify-between text-[12px] text-[#786E64] dark:text-[#A89E92] mb-1.5 font-medium">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-[#A55340]">
                                  description
                                </span>
                                关联知识与资料
                              </span>
                              <span className="text-[11px] opacity-75">
                                {docCount} 份
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {project.docs.map((doc, i) => (
                                <div
                                  key={i}
                                  className="text-[11.5px] bg-white dark:bg-[#342E28] px-2.5 py-1 rounded-lg border border-[#746B61]/10 text-[#786E64] dark:text-[#A89E92] flex items-center gap-1 shadow-2xs"
                                >
                                  <span className="material-symbols-outlined text-[13px] text-[#786E64]">
                                    attach_file
                                  </span>
                                  <span>{doc}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
            </SwipeableProject>
          );
        })}
      </div>

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#28231D]/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#27221E] rounded-2xl p-5 shadow-xl border border-[#746B61]/15">
            <h3 className="text-[16px] font-bold text-[#28231D] dark:text-[#EDE6DE] mb-1">
              新建项目
            </h3>
            <p className="text-[12px] text-[#786E64] dark:text-[#A89E92] mb-3">
              聚合心智，使步调如常
            </p>

            <form
              role="dialog"
              aria-modal="true"
              aria-label="新建项目"
              onSubmit={handleCreateProject}
              className="flex flex-col gap-3"
            >
              <div>
                <label className="block text-[12px] font-medium text-[#786E64] dark:text-[#A89E92] mb-1">
                  项目名称
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例如：东方茶器研习、居住环境精简"
                  className="w-full text-[13.5px] bg-[#FAF6EF] dark:bg-[#342E28] text-[#28231D] dark:text-[#EDE6DE] rounded-xl px-3 py-2 border border-[#746B61]/15 focus:border-[#A55340] outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#786E64] dark:text-[#A89E92] mb-1">
                  简要说明
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="项目的初衷、阶段目标或交付愿景…"
                  className="w-full text-[12.5px] bg-[#FAF6EF] dark:bg-[#342E28] text-[#28231D] dark:text-[#EDE6DE] rounded-xl px-3 py-2 border border-[#746B61]/15 focus:border-[#A55340] outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 text-[12.5px] rounded-lg text-[#786E64] hover:bg-[#F5F1E8] cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-4 py-1.5 text-[12.5px] rounded-lg bg-[#A55340] text-white font-medium hover:bg-[#873C2A] disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
