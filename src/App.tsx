/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type {
  Task,
  Project,
  ReviewEntry,
  SyncDevice,
  AppSettings,
  BackupData,
} from './types/index.ts';
import {
  initialTasks,
  initialProjects,
  initialReviews,
  initialDevices,
  initialSettings,
} from './data/initialData.ts';
import {
  getDueCategory,
  calculateReviewStats,
  mergeEntities,
  createBackup,
  validateBackupData,
} from './utils/taskLogic.ts';
import { loadStorageData, saveStorageData } from './services/storage.ts';
import { migrateStorageData } from './services/migration.ts';
import { useTasks } from './hooks/useTasks.ts';
import { MotionProvider } from './motion/MotionProvider.tsx';
import { AnimatePresence } from 'motion/react';
import { PageTransition } from './motion/PageTransition.tsx';
import {
  BottomNavigation,
  type NavTabId,
} from './components/BottomNavigation.tsx';
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
  const {
    tasks,
    setTasks,
    saveTask,
    toggle,
    remove,
    undo,
    dismiss,
    move,
    deletedTaskBackup,
  } = useTasks(initialTasks);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [reviews, setReviews] = useState<ReviewEntry[]>(initialReviews);
  const [devices, setDevices] = useState<SyncDevice[]>(initialDevices);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);

  // UI state
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [reviewPeriod, setReviewPeriod] = useState<'week' | 'month'>('week');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    loadStorageData()
      .then((data) => {
        if (!active) return;
        if (data) {
          setTasks(data.tasks);
          setProjects(data.projects);
          setReviews(data.reviews);
          setDevices(data.devices);
          setSettings({ ...initialSettings, ...data.settings });
        }
        setHydrated(true);
      })
      .catch((error) => {
        if (active) setStorageError(error.message || '�������ݶ�ȡʧ��');
      });
    return () => {
      active = false;
    };
  }, [setTasks]);

  useEffect(() => {
    if (!hydrated) return;
    saveStorageData({
      schemaVersion: 2,
      tasks,
      projects,
      reviews,
      devices,
      settings,
    })
      .then(() => setStorageError(''))
      .catch((error) => setStorageError(error.message));
  }, [hydrated, tasks, projects, reviews, devices, settings]);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 30000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

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
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  // Derive Today tasks dynamically from unified tasks
  const todayTasks = useMemo(() => {
    return tasks.filter((t) => getDueCategory(t, now) === 'today');
  }, [tasks, now]);

  const handleToggleTask = (id: string) => {
    toggle(id);
  };
  const handleDeleteTask = (id: string) => {
    remove(id);
  };
  const handleUndoDelete = () => {
    undo();
  };
  const handleSaveTask = (value: Partial<Task>) => {
    saveTask(value);
    showToast(value.id ? '�ѱ����޸�' : '����������嵥');
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

  const handleReorderTasks = (
    id: string,
    targetId: string,
    category?: import('./types/index.ts').DueCategory,
  ) => move(id, targetId, category);

  // Add Project
  const handleAddProject = (newProj: Partial<Project>) => {
    const nowIso = new Date().toISOString();
    const proj: Project = {
      id: crypto.randomUUID(),
      name: newProj.name || '�½���Ŀ',
      description: newProj.description || '',
      status: 'active',
      statusLabel: '�� ������',
      statusType: 'sage',
      docCount: 0,
      docs: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setProjects((prev) => [proj, ...prev]);
    showToast('����Ŀ�����ɹ�');
  };

  // Add Review
  const handleAddReview = (newEntry: Partial<ReviewEntry>) => {
    const nowIso = new Date().toISOString();
    const entry: ReviewEntry = {
      id: crypto.randomUUID(),
      date: new Date().toLocaleDateString('zh-CN'),
      subDate: newEntry.subDate || '�������',
      time: newEntry.time || '�ո�',
      wordCount: [...(newEntry.content || '')].length,
      type: newEntry.type || 'day',
      title: newEntry.title || '�������',
      content: newEntry.content || '',
      moods: newEntry.moods || ['ƽ��'],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setReviews((prev) => [entry, ...prev]);
    showToast('�����������¼��ī��');
  };

  // Trigger LAN Sync
  const handleTriggerSync = () => {
    setDevices((prev) =>
      prev.map((d) => ({
        ...d,
        lastSync: '�ո�',
        pingMs: Math.floor(Math.random() * 4) + 2,
      })),
    );
  };

  // Export Data JSON
  const handleExportData = () => {
    const backup = createBackup(tasks, projects, reviews, settings);

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jinri-youxu-backup-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('�ѵ����������ر��� (.json)');
  };

  // Import Data JSON
  const handleImportBackup = (
    incoming: BackupData,
    mode: 'overwrite' | 'merge',
  ) => {
    const validation = validateBackupData(incoming);
    if (!validation.valid) throw new Error(validation.error);
    const migrated = migrateStorageData(incoming);
    incoming = {
      ...incoming,
      ...migrated,
      settings: migrated.settings || undefined,
    };
    dismiss();
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
      if (incoming.settings)
        setSettings((previous) => ({ ...previous, ...incoming.settings }));
    }
  };

  // Real review stats calculated purely from tasks
  const reviewStats = useMemo(() => {
    return calculateReviewStats(tasks, now, reviewPeriod);
  }, [tasks, now, reviewPeriod]);

  const pendingCountTotal = tasks.filter((t) => t.status === 'pending').length;

  if (!hydrated)
    return (
      <div
        className="min-h-screen bg-[#F5F1E8] text-[#786E64] flex flex-col items-center justify-center gap-3"
        role="status"
      >
        {storageError || '���ڶ�ȡ�������ݡ�'}
        {storageError && (
          <button onClick={() => location.reload()}>���¶�ȡ</button>
        )}
      </div>
    );

  return (
    <MotionProvider settings={settings}>
      <div className="app-root min-h-screen bg-[#F5F1E8] dark:bg-[#1D1916] text-[#28231D] dark:text-[#EDE6DE] relative flex flex-col font-sans transition-colors duration-200">
        {/* 
        Extreme bottom-right corner subtle sage tint (as required: 
        "ֻ������ҳ�漫���½ǵķǳ�С�������һ˿������β���̣�Լռ5%~10%���ǳ����")
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

        {storageError && (
          <div
            role="alert"
            className="relative z-50 px-4 py-2 text-sm text-[#A55340]"
          >
            {storageError}
          </div>
        )}
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative z-10">
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={activeTab}>
              {activeTab === 'today' && (
                <TodayView
                  tasks={todayTasks}
                  onToggleTask={handleToggleTask}
                  onOpenAddTask={handleOpenAddTask}
                  onDeleteTask={handleDeleteTask}
                  onEditTask={handleOpenEditTask}
                  onReorderTasks={handleReorderTasks}
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
                  period={reviewPeriod}
                  onPeriodChange={setReviewPeriod}
                  stats={{
                    completed: reviewStats.completed,
                    delayed: reviewStats.delayed,
                    added: reviewStats.added,
                    topProject: reviewStats.topProject,
                    hours: 'Ͷ����',
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
                    if (
                      typeof document !== 'undefined' &&
                      'startViewTransition' in document &&
                      !matchMedia('(prefers-reduced-motion: reduce)').matches &&
                      settings.motionEnabled &&
                      settings.motion !== 'simple'
                    ) {
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
                  onToggleSyncPause={() =>
                    setSettings((previous) => ({
                      ...previous,
                      syncPaused: !previous.syncPaused,
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
            </PageTransition>
          </AnimatePresence>
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
          key={deletedTaskBackup?.task.id}
          visible={!!deletedTaskBackup}
          message={
            deletedTaskBackup
              ? `��ɾ����${deletedTaskBackup.task.title}��`
              : '��ɾ������'
          }
          onUndo={handleUndoDelete}
          onDismiss={dismiss}
          duration={5000}
        />

        {/* Toast Notification */}
        <Toast message={toastMessage} />
      </div>
    </MotionProvider>
  );
}
