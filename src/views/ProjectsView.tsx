import React, { useState } from 'react';
import type { Project, ProjectStatus } from '../types/index.ts';
import { SegmentedControl } from '../components/SegmentedControl.tsx';

interface ProjectsViewProps {
  projects: Project[];
  onAddProject: (project: Partial<Project>) => void;
  onToggleProjectTask?: (projectId: string, taskId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  onAddProject,
  onToggleProjectTask,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'archived'>('all');
  const [expandedId, setExpandedId] = useState<string | null>('proj-1');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const filteredProjects = projects.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const activeCount = projects.filter((p) => p.status === 'active').length;
  const pausedCount = projects.filter((p) => p.status === 'paused').length;
  const archivedCount = projects.filter((p) => p.status === 'archived').length;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddProject({
      name: newTitle.trim(),
      description: newDesc.trim() || '新建个人项目',
      status: 'active',
      statusLabel: '● 进行中',
      statusType: 'sage',
      pendingCount: 0,
      completedCount: 0,
      docCount: 0,
      innerTasks: [],
      docs: [],
    });
    setNewTitle('');
    setNewDesc('');
    setShowNewModal(false);
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-3 pb-24">
      {/* Top Header */}
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[22px] text-[#A55340] dark:text-[#C76E59]">
            folder_open
          </span>
          <h1 className="text-[20px] font-bold text-[#28231D] dark:text-[#EDE6DE] tracking-tight">
            项目
          </h1>
          <span className="px-2 py-0.5 rounded-full bg-[#EBE4D6] dark:bg-[#38312B] text-[11px] font-semibold text-[#786E64] dark:text-[#A89E92]">
            {projects.length}
          </span>
        </div>

        {/* + 新建项目 button */}
        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="h-8 pl-2.5 pr-3 rounded-full bg-[#A55340] hover:bg-[#873C2A] text-white flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[17px] leading-none">add</span>
          <span className="text-[12px] font-medium tracking-wide">新建项目</span>
        </button>
      </header>

      {/* Segmented Control Filter */}
      <SegmentedControl
        className="mb-3.5"
        activeId={filter}
        onChange={(val) => setFilter(val as any)}
        options={[
          { id: 'all', label: '全部', count: projects.length },
          { id: 'active', label: '进行中', count: activeCount },
          { id: 'paused', label: '暂停', count: pausedCount },
          { id: 'archived', label: '归档', count: archivedCount },
        ]}
      />

      {/* Project Cards Stream */}
      <div className="flex flex-col gap-3">
        {filteredProjects.map((project) => {
          const isExpanded = expandedId === project.id;

          return (
            <article
              key={project.id}
              className="paper-card rounded-[16px] bg-white dark:bg-[#27221E] overflow-hidden transition-all duration-300"
            >
              {/* Card Header row */}
              <div
                onClick={() => toggleExpand(project.id)}
                className="p-3.5 cursor-pointer hover:bg-[#FAF6EF]/60 dark:hover:bg-[#322C26]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-[#A55340] dark:text-[#C76E59]">
                      folder
                    </span>
                    <h3 className="text-[15px] font-bold text-[#28231D] dark:text-[#EDE6DE]">
                      {project.name}
                    </h3>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      project.statusType === 'terracotta'
                        ? 'bg-[#FDEAE6] dark:bg-[#432722] text-[#A55340] dark:text-[#E08570]'
                        : project.statusType === 'sage'
                        ? 'bg-[#EAF0EB] dark:bg-[#28372B] text-[#6C8271] dark:text-[#95B59C]'
                        : 'bg-[#FBF1E2] dark:bg-[#403323] text-[#C88A3A] dark:text-[#E2A657]'
                    }`}
                  >
                    {project.statusLabel}
                  </span>
                </div>

                {/* Subtitle description */}
                <p className="text-[12px] text-[#786E64] dark:text-[#A89E92] mt-1.5 leading-relaxed">
                  {project.description}
                </p>

                {/* Stats row */}
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#746B61]/8 dark:border-[#5E544A]/15 text-[11.5px] text-[#786E64] dark:text-[#A89E92]">
                  <span>
                    待办 {project.pendingCount} · 已完成 {project.completedCount} · 资料{' '}
                    {project.docCount}
                  </span>
                  <span className="text-[11px] text-[#A55340] dark:text-[#C76E59] flex items-center gap-0.5">
                    {isExpanded ? '收起详情' : '点击展开'}
                    <span className="material-symbols-outlined text-[14px]">
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Expanded details container */}
              {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-1 bg-[#FAF6EF]/50 dark:bg-[#2C2723]/60 border-t border-[#746B61]/10 flex flex-col gap-3 animate-in fade-in duration-200">
                  {/* Inner tasks checklist */}
                  {project.innerTasks && project.innerTasks.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-[12px] text-[#786E64] dark:text-[#A89E92] mb-1.5 font-medium">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-[#6C8271]">
                            task_alt
                          </span>
                          核心待办 (2/{project.pendingCount})
                        </span>
                        <span className="text-[11px] text-[#A55340] dark:text-[#C76E59] cursor-pointer">
                          查看全部 &gt;
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        {project.innerTasks.map((it) => (
                          <div
                            key={it.id}
                            onClick={() => onToggleProjectTask?.(project.id, it.id)}
                            className="bg-white dark:bg-[#342E28] rounded-xl p-2 px-2.5 flex items-center justify-between text-[12.5px] border border-[#746B61]/10 cursor-pointer hover:border-[#A55340] transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-4 h-4 rounded-[4px] border flex items-center justify-center text-[10px] ${
                                  it.completed
                                    ? 'bg-[#6C8271] border-[#6C8271] text-white'
                                    : 'border-[#A89D91]'
                                }`}
                              >
                                {it.completed && '✓'}
                              </span>
                              <span
                                className={`${
                                  it.completed
                                    ? 'line-through text-[#786E64]'
                                    : 'text-[#28231D] dark:text-[#EDE6DE]'
                                }`}
                              >
                                {it.title}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#786E64] dark:text-[#A89E92] bg-[#F5F1E8] dark:bg-[#3E362F] px-1.5 py-0.5 rounded">
                              {it.dueText}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Associated Documents */}
                  {project.docs && project.docs.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-[12px] text-[#786E64] dark:text-[#A89E92] mb-1.5 font-medium">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-[#A55340]">
                            description
                          </span>
                          关联知识与资料
                        </span>
                        <span className="text-[11px] opacity-75">{project.docCount} 份</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {project.docs.map((doc) => (
                          <span
                            key={doc}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#342E28] border border-[#746B61]/12 text-[11.5px] text-[#28231D] dark:text-[#EDE6DE]"
                          >
                            <span className="material-symbols-outlined text-[13px] text-[#786E64]">
                              attachment
                            </span>
                            {doc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Poetic Footer */}
      <div className="text-center mt-6 text-[11.5px] text-[#786E64]/60 dark:text-[#A89E92]/60 select-none">
        —— 静心沉淀 · 纸感记事 ——
      </div>

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#28231D]/40 backdrop-blur-sm"
            onClick={() => setShowNewModal(false)}
          />
          <div className="relative w-full max-w-sm bg-[#FDFCFA] dark:bg-[#27221E] rounded-2xl p-5 shadow-xl border border-[#746B61]/15 z-10">
            <h3 className="text-[16px] font-bold text-[#28231D] dark:text-[#EDE6DE] mb-3">
              新建项目
            </h3>
            <form onSubmit={handleCreateProject} className="flex flex-col gap-3">
              <div>
                <label className="block text-[12px] text-[#786E64] dark:text-[#A89E92] mb-1">
                  项目名称
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例如：东方茶器美学考工"
                  className="w-full text-[13.5px] bg-[#F5F1E8] dark:bg-[#342E28] text-[#28231D] dark:text-[#EDE6DE] rounded-xl px-3 py-2 border border-[#746B61]/15 focus:border-[#A55340] outline-none"
                />
              </div>
              <div>
                <label className="block text-[12px] text-[#786E64] dark:text-[#A89E92] mb-1">
                  简述
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="项目目标与预期成果..."
                  rows={2}
                  className="w-full text-[13px] bg-[#F5F1E8] dark:bg-[#342E28] text-[#28231D] dark:text-[#EDE6DE] rounded-xl px-3 py-2 border border-[#746B61]/15 focus:border-[#A55340] outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3.5 py-1.5 rounded-full text-[12.5px] text-[#786E64]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-4 py-1.5 rounded-full bg-[#A55340] text-white text-[12.5px] font-medium disabled:opacity-50"
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
