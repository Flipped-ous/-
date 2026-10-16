/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { Task, Project, ReviewEntry, SyncDevice, AppSettings, BackupData } from './types/index.ts';
import {
  initialTasks,
  initialProjects,
  initialReviews,
  initialDevices,
  initialSettings,
} from './data/initialData.ts';
import {
  getDueCategory,
  toggleTask,
  deleteTask,
  restoreTask,
  moveTask,
  changeTaskCategory,
  calculateReviewStats,
  mergeEntities,
} from './utils/taskLogic.ts';
import {
  loadStorageData,
  saveTasksToStorage,
  saveProjectsToStorage,
  saveReviewsToStorage,
  saveSettingsToStorage,
  saveDevicesToStorage,
} from './services/storage.ts';
import { BottomNavigation, type NavTabId } from './components/BottomNavigation.tsx';
import { AddTaskSheet } from './components/AddTaskSheet.tsx';
import { Toast } from './components/Toast.tsx';
import { UndoSnackbar } from './components/UndoSnackbar.tsx';
import { TodayView } from './views/TodayView.tsx';
import { TasksView } from './views/TasksView.tsx';
import { ProjectsView } from './views/ProjectsView.tsx';
import { ReviewView } from './views/ReviewView.tsx';
import { MoreView } from './views/MoreView.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('today');

  // Single Source of Truth for all tasks
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [reviews, setReviews] = useState<ReviewEntry[]>(initialReviews);
  const [devices, setDevices] = useState<SyncDevice[]>(initialDevices);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);

  // UI state
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Undo deletion state
  const [deletedTaskBackup, setDeletedTaskBackup] = useState<{
    task: Task;
    index: number;
  } | null>(null);
  const [showUndoSnackbar, setShowUndoSnackbar] = useState(false);

  // Initialize and load persistent data from IndexedDB
  useEffect(() => {
    loadStorageData().then((data) => {
      if (data) {
        if (data.tasks && data.tasks.length > 0) setTasks(data.tasks);
        if (data.projects && data.projects.length > 0) setProjects(data.projects);
        if (data.reviews && data.reviews.length > 0) setReviews(data.reviews);
        if (data.devices && data.devices.length > 0) setDevices(data.devices);
        if (data.settings) setSettings(data.settings);
      } else {
        // First run: save initial seed data
        saveTasksToStorage(initialTasks);
        saveProjectsToStorage(initialProjects);
        saveReviewsToStorage(initialReviews);
        saveSettingsToStorage(initialSettings);
        saveDevicesToStorage(initialDevices);
      }
    });
  }, []);

  // Auto-save changes to IndexedDB
  useEffect(() => {
    saveTasksToStorage(tasks);
  }, [tasks]);

  useEffect(() => {
    saveProjectsToStorage(projects);
  }, [projects]);

  useEffect(() => {
    saveReviewsToStorage(reviews);
  }, [reviews]);

  useEffect(() => {
    saveSettingsToStorage(settings);
  }, [settings]);

  // Apply dark mode class
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  // Derive Today tasks dynamically from unified tasks
  const todayTasks = useMemo(() => {
    return tasks.filter((t) => getDueCategory(t) === 'today');
  }, [tasks]);

  // Toggle task in single tasks array
  const handleToggleTask = (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    const wasPending = target?.status === 'pending';
    setTasks((prev) => toggleTask(prev, taskId));
    if (wasPending) {
      showToast('已完成 1 项任务');
    }
  };

  // Delete task with Undo tolerance
  const handleDeleteTask = (taskId: string) => {
    const { updatedTasks, deletedTask, deletedIndex } = deleteTask(tasks, taskId);
    if (deletedTask) {
      setDeletedTaskBackup({ task: deletedTask, index: deletedIndex });
      setTasks(updatedTasks);
      setShowUndoSnackbar(true);
    }
  };

  // Undo delete
  const handleUndoDelete = () => {
    if (deletedTaskBackup) {
      setTasks((prev) => restoreTask(prev, deletedTaskBackup.task, deletedTaskBackup.index));
      showToast(`已恢复待办「${deletedTaskBackup.task.title}」`);
      setDeletedTaskBackup(null);
      setShowUndoSnackbar(false);
    }
  };

  // Add or Edit Task (Single insertion / modification)
  const handleSaveTask = (taskData: Partial<Task>) => {
    const nowIso = new Date().toISOString();

    if (taskData.id) {
      // Editing existing task
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskData.id
            ? {
                ...t,
                ...taskData,
                updatedAt: nowIso,
              }
            : t
        )
      );
      showToast(`已更新「${taskData.title}」`);
    } else {
      // Adding new task
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: taskData.title || '',
        note: taskData.note,
        status: 'pending',
        priority: taskData.priority || 'normal',
        dueAt: taskData.dueAt,
        dueTime: taskData.dueTime,
        dueLabel: taskData.dueLabel || '今天',
        projectId: taskData.projectId,
        project: taskData.project || '今日有序 Android 客户端',
        badgeLabel: taskData.badgeLabel,
        badgeType: taskData.badgeType,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setTasks((prev) => [newTask, ...prev]);
      showToast('已添入待办清单');
    }

    setTaskToEdit(null);
    setIsAddTaskOpen(false);
  };

  // Open Edit Sheet
  const handleOpenEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsAddTaskOpen(true);
  };

  // Open Add Sheet
  const handleOpenAddTask = () => {
    setTaskToEdit(null);
    setIsAddTaskOpen(true);
  };

  // Reorder tasks inside a section (in TasksView)
  const handleReorderTasks = (
    section: 'overdue' | 'today' | 'future' | 'none',
    fromIdx: number,
    toIdx: number
  ) => {
    setTasks((prev) => {
      const sectionTasks = prev.filter((t) => getDueCategory(t) === section);
      const otherTasks = prev.filter((t) => getDueCategory(t) !== section);
      if (fromIdx < 0 || fromIdx >= sectionTasks.length || toIdx < 0 || toIdx >= sectionTasks.length) {
        return prev;
      }
      const updatedSection = moveTask(sectionTasks, fromIdx, toIdx);
      return [...updatedSection, ...otherTasks];
    });
  };

  // Reorder tasks in TodayView
  const handleReorderTodayTasks = (fromIdx: number, toIdx: number) => {
    setTasks((prev) => {
      const currentToday = prev.filter((t) => getDueCategory(t) === 'today');
      const otherTasks = prev.filter((t) => getDueCategory(t) !== 'today');
      if (fromIdx < 0 || fromIdx >= currentToday.length || toIdx < 0 || toIdx >= currentToday.length) {
        return prev;
      }
      const reorderedToday = moveTask(currentToday, fromIdx, toIdx);
      return [...reorderedToday, ...otherTasks];
    });
  };

  // Add Project
  const handleAddProject = (newProj: Partial<Project>) => {
    const nowIso = new Date().toISOString();
    const proj: Project = {
      id: `proj-${Date.now()}`,
      name: newProj.name || '新建项目',
      description: newProj.description || '',
      status: 'active',
      statusLabel: '● 进行中',
      statusType: 'sage',
      docCount: 0,
      docs: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setProjects((prev) => [proj, ...prev]);
    showToast('新项目创建成功');
  };

  // Add Review
  const handleAddReview = (newEntry: Partial<ReviewEntry>) => {
    const nowIso = new Date().toISOString();
    const entry: ReviewEntry = {
      id: `rev-${Date.now()}`,
      date: newEntry.date || '今日',
      subDate: newEntry.subDate || '今日随感',
      time: newEntry.time || '刚刚',
      wordCount: newEntry.wordCount || 100,
      type: 'day',
      title: newEntry.title || '今日随感',
      content: newEntry.content || '',
      moods: newEntry.moods || ['平静'],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setReviews((prev) => [entry, ...prev]);
    showToast('复盘随感已收录于墨迹');
  };

  // Trigger LAN Sync
  const handleTriggerSync = () => {
    setDevices((prev) =>
      prev.map((d) => ({
        ...d,
        lastSync: '刚刚',
        pingMs: Math.floor(Math.random() * 4) + 2,
      }))
    );
  };

  // Export Data JSON
  const handleExportData = () => {
    const backup: BackupData = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      tasks,
      projects,
      reviews,
      settings,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jinri-youxu-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已导出完整本地备份 (.json)');
  };

  // Import Data JSON
  const handleImportBackup = (incoming: BackupData, mode: 'overwrite' | 'merge') => {
    if (mode === 'overwrite') {
      setTasks(incoming.tasks);
      setProjects(incoming.projects);
      setReviews(incoming.reviews);
      if (incoming.settings) {
        setSettings((s) => ({ ...s, ...incoming.settings }));
      }
    } else {
      // Merge by ID, keeping newer updatedAt
      setTasks((prev) => mergeEntities(prev, incoming.tasks));
      setProjects((prev) => mergeEntities(prev, incoming.projects));
      setReviews((prev) => mergeEntities(prev, incoming.reviews));
    }
  };

  // Real review stats calculated purely from tasks
  const reviewStats = useMemo(() => {
    return calculateReviewStats(tasks);
  }, [tasks]);

  const pendingCountTotal = tasks.filter((t) => t.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-[#1D1916] text-[#28231D] dark:text-[#EDE6DE] relative flex flex-col font-sans transition-colors duration-200">
      {/* 
        Extreme bottom-right corner subtle sage tint (as required: 
        "只允许在页面极右下角的非常小区域加入一丝极淡鼠尾草绿，约占5%~10%，非常柔和")
      */}
      <div className="sage-ambient-corner" />

      {/* Subtle stationery watermark line drawing (bamboo & gentle gridlines, opacity 0.035) */}
      <svg
        className="pointer-events-none fixed right-2 top-20 w-64 h-80 text-[#746B61] opacity-[0.035] dark:opacity-[0.02] z-0 select-none"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        viewBox="0 0 120 150"
      >
        <path
          d="M70,140 C65,95 72,50 68,10 M68,10 C72,25 88,32 102,28 M68,10 C62,30 52,58 48,100 M62,50 C76,46 88,52 94,62 M55,75 C70,70 82,78 86,88"
          strokeLinecap="round"
        />
        <path
          d="M10,20 L110,20 M10,65 L110,65 M10,110 L110,110 M35,5 L35,145 M85,5 L85,145"
          strokeDasharray="2 3"
          strokeWidth="0.5"
        />
      </svg>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-10">
        {activeTab === 'today' && (
          <TodayView
            tasks={todayTasks}
            onToggleTask={handleToggleTask}
            onOpenAddTask={handleOpenAddTask}
            onDeleteTask={handleDeleteTask}
            onEditTask={handleOpenEditTask}
            onReorderTasks={handleReorderTodayTasks}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksView
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onEditTask={handleOpenEditTask}
            onOpenAddTask={handleOpenAddTask}
            onReorderTasks={handleReorderTasks}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsView
            projects={projects}
            tasks={tasks}
            onAddProject={handleAddProject}
            onToggleTask={handleToggleTask}
            onEditTask={handleOpenEditTask}
          />
        )}

        {activeTab === 'review' && (
          <ReviewView
            reviews={reviews}
            stats={{
              completed: reviewStats.completed,
              delayed: reviewStats.delayed,
              added: reviewStats.added,
              topProject: reviewStats.topProject,
              hours: '投入中',
            }}
            onAddReview={handleAddReview}
          />
        )}

        {activeTab === 'more' && (
          <MoreView
            settings={settings}
            devices={devices}
            tasksCount={tasks.length}
            projectsCount={projects.length}
            reviewsCount={reviews.length}
            onToggleTheme={() => {
              const applyTheme = () => {
                setSettings((s) => ({
                  ...s,
                  theme: s.theme === 'light' ? 'dark' : 'light',
                }));
              };
              if (typeof document !== 'undefined' && 'startViewTransition' in document) {
                (document as any).startViewTransition(applyTheme);
              } else {
                applyTheme();
              }
            }}
            onChangeMotionLevel={(lvl) =>
              setSettings((s) => ({
                ...s,
                motion: lvl,
              }))
            }
            onToggleMotion={() =>
              setSettings((s) => ({
                ...s,
                motionEnabled: !s.motionEnabled,
              }))
            }
            onTriggerSync={handleTriggerSync}
            onExportData={handleExportData}
            onImportBackup={handleImportBackup}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Floating Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        pendingCount={pendingCountTotal}
      />

      {/* Add / Edit Task Bottom Sheet */}
      <AddTaskSheet
        isOpen={isAddTaskOpen}
        taskToEdit={taskToEdit}
        projects={projects}
        onClose={() => {
          setIsAddTaskOpen(false);
          setTaskToEdit(null);
        }}
        onSave={handleSaveTask}
      />

      {/* Undo Snackbar on deletion */}
      <UndoSnackbar
        visible={showUndoSnackbar}
        message={deletedTaskBackup ? `已删除「${deletedTaskBackup.task.title}」` : '已删除任务'}
        onUndo={handleUndoDelete}
        onDismiss={() => setShowUndoSnackbar(false)}
        duration={5000}
      />

      {/* Toast Notification */}
      <Toast message={toastMessage} />
    </div>
  );
}
