import { readBackupReceipt, recordBackupReceipt } from './services/backupReceipt.ts';
import { reorderProject } from './services/projectRepository.ts';
import { sortProjects } from './utils/projectOrder.ts';
import { reconcileReminders, onReminderAction } from "./services/reminders.ts";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { flushSync } from 'react-dom';
import { App as NativeApp } from "@capacitor/app";
import { exportBackupFile, NativeAppearance } from "./services/native.ts";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import type {
  Note,
  Task,
  Project,
  ReviewEntry,
  SyncDevice,
  AppSettings,
  BackupData,
} from "./types/index.ts";
import {
  initialTasks,
  initialProjects,
  initialReviews,
  initialDevices,
  initialSettings,
} from "./data/initialData.ts";
import {
  getDueCategory,
  calculateReviewStats,
  mergeEntities,
  createBackup,
  validateBackupData,
  restoreTask,
} from "./utils/taskLogic.ts";
import { loadStorageData, saveStorageData } from "./services/storage.ts";
import { migrateStorageData } from "./services/migration.ts";
import { useTasks } from "./hooks/useTasks.ts";
import { MotionProvider } from "./motion/MotionProvider.tsx";
import { AnimatePresence } from "motion/react";
import { revealTheme } from "./motion/themeTransition.ts";
import { PageTransition } from "./motion/PageTransition.tsx";
import {
  BottomNavigation,
  type NavTabId,
} from "./components/BottomNavigation.tsx";
import { AddTaskSheet } from "./components/AddTaskSheet.tsx";
import { Toast } from "./components/Toast.tsx";
import { DeletionStack, type DeletionReceipt } from './components/DeletionStack.tsx';
import { DeleteProjectDialog } from './components/DeleteProjectDialog.tsx';
import { removeProject, undoRemoveProject } from './services/projectRepository.ts';
import { belongsToProject } from './utils/projectRelations.ts';
import { TodayView } from "./views/TodayView.tsx";
import { TasksView } from "./views/TasksView.tsx";
import { ProjectsView } from "./views/ProjectsView.tsx";
import { ReviewView } from "./views/ReviewView.tsx";
import "./notes.css";
import './agenda.css';
import { NotesView } from "./views/NotesView.tsx";
import { ProjectDetail } from "./views/ProjectDetail.tsx";
import { NoteWorkspace } from "./components/NoteWorkspace.tsx";
import { newNote, reviewToNote } from "./utils/notes.ts";
import {
  initializeNotes,
  getNotes,
  subscribeNotes,
  saveNote,
  publishCommittedNotes,
} from "./services/notesRepository.ts";
import {
  createNotesBackup,
  restoreNotesBackup,
} from "./services/notesBackup.ts";
import { navigationVisibility } from "./services/navigationVisibility.ts";
import { MoreView } from "./views/MoreView.tsx";
import { WrapUpSheet } from './components/WrapUpSheet.tsx';
import { arrangeTasks, undoArrangement, type ScheduleUndo } from './utils/wrapUp.ts';
import { wrapTasks } from './utils/taskPresentation.ts';
import { mirrorWrapReminder, WrapReminder } from './services/wrapReminder.ts';
import { commitTaskBatch } from './services/taskBatch.ts';
import { TodayWidget, mirrorTodayWidget, type WidgetLaunch } from './services/todayWidget.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>("today");

  // Single Source of Truth for all tasks
  const {
    tasks,
    setTasks,
    saveTask,
    toggle,
    move,
  } = useTasks(initialTasks);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [reviews, setReviews] = useState<ReviewEntry[]>(initialReviews);
  const [devices, setDevices] = useState<SyncDevice[]>(initialDevices);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);

  const notes = useSyncExternalStore(subscribeNotes, getNotes);
  const [noteScreen, setNoteScreen] = useState<{
    note: Note;
    editing: boolean;
  } | null>(null);
  const [projectDetail, setProjectDetail] = useState<Project | null>(null);
  const [taskInitial, setTaskInitial] = useState<Partial<Task> | undefined>();
  const [deletions, setDeletions] = useState<DeletionReceipt[]>([]);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // UI state
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [wrapOpen, setWrapOpen] = useState(false);
  const [wrapError, setWrapError] = useState('');
  const [widgetError, setWidgetError] = useState('');
  const batchLock = useRef(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [hydrated, setHydrated] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState(readBackupReceipt);
  const exportBusy = useRef(false);
  const [storageError, setStorageError] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [reviewPeriod, setReviewPeriod] = useState<"week" | "month">("week");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTabRef = useRef(activeTab);
  const businessRef = useRef({ schemaVersion: 3, tasks, projects, reviews, devices, settings });
  businessRef.current = { schemaVersion: 3, tasks, projects, reviews, devices, settings };
  activeTabRef.current = activeTab;
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const subscription = NativeApp.addListener("backButton", () => {
      if (navigationVisibility.isKeyboardVisible()) {
        void NativeAppearance.hideKeyboard().catch(() => {});
        return;
      }
      if (history.state?.dialogToken || history.state?.subpageToken)
        history.back();
      else if (activeTabRef.current !== "today") setActiveTab("today");
      else void NativeApp.minimizeApp();
    });
    return () => {
      void subscription.then((listener) => listener.remove());
    };
  }, []);
  useEffect(() => {
    if (Capacitor.isNativePlatform())
      void SystemBars.setStyle({
        style:
          settings.theme === "dark"
            ? SystemBarsStyle.Dark
            : SystemBarsStyle.Light,
      }).catch(() => {});
    if (Capacitor.isNativePlatform())
      void NativeAppearance.setTheme({ dark: settings.theme === "dark" }).catch(
        () => {},
      );
  }, [settings.theme]);

  useEffect(() => {
    let active = true;
    loadStorageData()
      .then(async (data) => {
        if (!active) return;
        if (data) {
          setTasks(data.tasks);
          setProjects(data.projects);
          setReviews(data.reviews);
          setDevices(data.devices);
          setSettings({
            ...initialSettings,
            ...data.settings,
            motion: "standard",
            motionEnabled: true,
          });
        }
        await initializeNotes(
          data?.notes ?? (data ? [] : initialReviews.map(reviewToNote)),
        );
        if (active) setHydrated(true);
      })
      .catch((error) => {
        if (active) setStorageError(error.message || "本地数据读取失败");
      });
    return () => {
      active = false;
    };
  }, [setTasks]);

  useEffect(() => {
    if (!hydrated) return;
    const snapshot = {
      schemaVersion: 3,
      tasks,
      projects,
      reviews,
      devices,
      settings,
    };
    saveStorageData(snapshot)
      .then(async () => {
        setStorageError('');
        void mirrorTodayWidget(snapshot.tasks, snapshot.settings).then(() => setWidgetError('')).catch(error => setWidgetError((error as Error).message || '桌面小组件更新失败'));
        try { await mirrorWrapReminder(snapshot.tasks, snapshot.settings); setWrapError(''); }
        catch (error) { setWrapError((error as Error).message || '收工提醒更新失败，请在提醒策略中重试'); }
      })
      .catch((error) => setStorageError(error.message));
  }, [hydrated, tasks, projects, reviews, devices, settings]);

  useEffect(() => {
    if (!hydrated || !Capacitor.isNativePlatform()) return;
    let active = true;
    const openWidget = (request: WidgetLaunch) => {
      if (!active || !request.action) return;
      if (navigationVisibility.getSnapshot()) {
        showToast('请先保存或关闭当前编辑，再从小组件打开');
        return;
      }
      setActiveTab('today'); setProjectDetail(null); setNoteScreen(null);
      if (request.action === 'add') {
        const date = new Date(); date.setHours(0, 0, 0, 0);
        setTaskToEdit(null); setTaskInitial({ dueAt: date.toISOString() }); setIsAddTaskOpen(true);
      } else if (request.action === 'task') {
        const task = businessRef.current.tasks.find(item => item.id === request.taskId);
        if (task) { setTaskToEdit(task); setTaskInitial(undefined); setIsAddTaskOpen(true); }
        else showToast('这项待办已删除，请查看最新列表');
      }
    };
    const listener = TodayWidget.addListener('openWidget', openWidget);
    void TodayWidget.consumeLaunch().then(openWidget).catch(error => setWidgetError(error.message));
    return () => { active = false; void listener.then(handle => handle.remove()); };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !Capacitor.isNativePlatform()) return;
    const listener = WrapReminder.addListener('openWrapUp', () => setWrapOpen(true));
    void WrapReminder.consumeLaunch().then(result => { if (result.requested) setWrapOpen(true); }).catch(error => setWrapError(error.message));
    return () => { void listener.then(handle => handle.remove()); };
  }, [hydrated]);

  const persistBatch = async (transform: (current: Task[]) => { tasks: Task[]; count: number; skipped: number; undo?: ScheduleUndo[] }) => {
    if (batchLock.current) throw new Error('正在保存，请稍候');
    batchLock.current = true;
    try {
      const before = businessRef.current;
      const result = await commitTaskBatch(before, transform);
      if (!result.count) return result;
      setTasks(result.tasks);
      businessRef.current = { ...before, tasks: result.tasks };
      setStorageError('');
      // Failure here does not turn a successful business commit into a failed batch.
      void mirrorWrapReminder(result.tasks, before.settings).then(() => setWrapError('')).catch(error => setWrapError(error.message));
      return result;
    } finally { batchLock.current = false; }
  };

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 30000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // Apply dark mode class
  useEffect(() => {
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.theme]);

  const taskSnapshot = useRef(tasks);
  taskSnapshot.current = tasks;
  const [reminderRefresh, setReminderRefresh] = useState(0);
  const [reminderError, setReminderError] = useState("");
  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    const update = () =>
      void reconcileReminders(taskSnapshot.current, settings)
        .then(() => {
          if (active) setReminderError("");
        })
        .catch((error) => {
          if (active) setReminderError(error.message || "系统提醒更新失败");
        });
    update();
    const timer = setInterval(update, 60000);
    window.addEventListener("focus", update);
    const sub = Capacitor.isNativePlatform()
      ? NativeApp.addListener("appStateChange", ({ isActive }) => {
          if (isActive) update();
        })
      : null;
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", update);
      void sub?.then((x) => x.remove());
    };
  }, [
    hydrated,
    tasks,
    settings.notification,
    settings.reminderLeadMinutes,
    reminderRefresh,
  ]);
  useEffect(() => {
    if (!hydrated || !Capacitor.isNativePlatform()) return;
    const listener = onReminderAction((id) => {
      const task = taskSnapshot.current.find((t) => t.id === id);
      if (task) {
        setActiveTab("tasks");
        setTaskToEdit(task);
        setTaskInitial(undefined);
        setIsAddTaskOpen(true);
      }
    });
    return () => {
      void listener.then((x) => x.remove());
    };
  }, [hydrated]);

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
    return tasks.filter((t) => getDueCategory(t, now) === "today");
  }, [tasks, now]);

  const handleToggleTask = (id: string) => {
    toggle(id);
  };
  const handleDeleteTask = (id: string) => {
    const current = businessRef.current;
    const index = current.tasks.findIndex(task => task.id === id);
    if (index < 0) return;
    const task = current.tasks[index];
    const next = current.tasks.filter(item => item.id !== id);
    businessRef.current = { ...current, tasks: next };
    setTasks(next);
    recordDeletion(task.title, () => {
      const state = businessRef.current;
      if (state.tasks.some(item => item.id === id)) throw new Error('任务已经恢复');
      const linked = task.projectId ? state.projects.some(project => project.id === task.projectId) : state.projects.some(project => project.name === task.project);
      const value = linked ? task : { ...task, projectId: undefined, project: '' };
      const restored = restoreTask(state.tasks, value, index);
      businessRef.current = { ...state, tasks: restored };
      setTasks(restored);
    });
  };
  const recordDeletion = (title: string, undo: DeletionReceipt['undo']) => setDeletions(previous => [{ id: crypto.randomUUID(), title, undo }, ...previous]);
  const recordDeletedNote = (note: Note) => recordDeletion(note.title || '未命名笔记', async () => {
    if (getNotes().some(item => item.id === note.id)) throw new Error('笔记已经恢复');
    const projectId = businessRef.current.projects.some(project => project.id === note.projectId) ? note.projectId : undefined;
    await saveNote({ ...note, projectId, updatedAt: new Date().toISOString() });
  });
  const publishProjectChange = (result: { tasks: Task[]; projects: Project[]; notes: Note[] }) => {
    flushSync(() => {
      businessRef.current = { ...businessRef.current, tasks: result.tasks, projects: result.projects };
      setTasks(result.tasks); setProjects(sortProjects(result.projects));
      publishCommittedNotes(result.notes);
    });
  };
  const handleDeleteProject = async () => {
    if (!projectToDelete || batchLock.current) throw new Error('正在保存，请稍候');
    batchLock.current = true;
    try {
      const result = await removeProject(projectToDelete.id);
      await publishProjectChange(result);
      recordDeletion(`项目：${result.undo.project.name}`, async () => {
        if (batchLock.current) throw new Error('正在保存，请稍候');
        batchLock.current = true;
        try {
          const restored = await undoRemoveProject(result.undo);
          await publishProjectChange(restored);
          if (restored.skipped) showToast(`已恢复项目，${restored.skipped} 项已变化的内容保持当前归属`);
        } finally { batchLock.current = false; }
      });
      setProjectToDelete(null);
      setProjectDetail(current => current?.id === result.undo.project.id ? null : current);
    } finally { batchLock.current = false; }
  };
  const handleSaveTask = (value: Partial<Task>) => {
    saveTask(value);
    showToast(value.id ? "已保存修改" : "已添入待办清单");
  };

  // Open Edit Sheet
  const handleOpenEditTask = (task: Task) => {
    setTaskInitial(undefined);
    setTaskToEdit(task);
    setIsAddTaskOpen(true);
  };

  // Open Add Sheet
  const handleOpenAddTask = () => {
    setTaskInitial(undefined);
    setTaskToEdit(null);
    setIsAddTaskOpen(true);
  };

  const handleReorderTasks = (
    id: string,
    targetId: string,
    category?: import("./types/index.ts").DueCategory,
  ) => move(id, targetId, category);

  // Add Project
  const handleAddProject = (newProj: Partial<Project>) => {
    const nowIso = new Date().toISOString();
    const proj: Project = {
      id: crypto.randomUUID(),
      name: newProj.name || "新建项目",
      description: newProj.description || "",
      status: "active",
      statusLabel: "● 进行中",
      statusType: "sage",
      docCount: 0,
      docs: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    showToast("新项目创建成功");
    setProjects((prev) => [proj, ...sortProjects(prev)].map((p, order) => ({ ...p, order })));
  };
  const handleReorderProjects = async (id: string, target: string, after: boolean) => {
    if (batchLock.current) return;
    batchLock.current = true;
    try { const result = await reorderProject(id, target, after); setProjects(result.projects); }
    catch (error) { showToast((error as Error).message || '项目排序保存失败，请重试'); }
    finally { batchLock.current = false; }
  };

  // Add Review
  const handleAddReview = (newEntry: Partial<ReviewEntry>) => {
    const nowIso = new Date().toISOString();
    const entry: ReviewEntry = {
      id: crypto.randomUUID(),
      date: new Date().toLocaleDateString("zh-CN"),
      subDate: newEntry.subDate || "今日随感",
      time: newEntry.time || "刚刚",
      wordCount: [...(newEntry.content || "")].length,
      type: newEntry.type || "day",
      title: newEntry.title || "今日随感",
      content: newEntry.content || "",
      moods: newEntry.moods || ["平静"],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setReviews((prev) => [entry, ...prev]);
    showToast("复盘随感已收录于墨迹");
  };

  // Compatibility callback: no transport is registered in this release.
  const handleTriggerSync = () => showToast("电脑同步尚未接入");

  // Export Data JSON
  const handleExportData = async () => {
    if (exportBusy.current) return;
    exportBusy.current = true;
    const backup = createBackup(tasks, projects, reviews, settings);
    try {
      const result = await exportBackupFile(await createNotesBackup(backup));
      if (result.status === 'saved') {
        try { setLastBackupAt(recordBackupReceipt(result)); showToast('已保存完整备份（含图片 ZIP）'); }
        catch { showToast('文件已保存，但最近备份时间记录失败'); }
      } else showToast(result.status === 'cancelled' ? '已取消备份保存' : '已发起备份下载，请确认文件保存完成');
    } catch (error) { showToast(error instanceof Error ? error.message : '备份导出未完成，请重试'); }
    finally { exportBusy.current = false; }
  };

  // Import Data JSON
  const handleImportBackup = async (
    incoming: BackupData,
    mode: "overwrite" | "merge",
  ) => {
    const result = await restoreNotesBackup(
      incoming,
      { schemaVersion: 3, tasks, projects, reviews, devices, settings },
      mode === "merge",
    );
    setDeletions([]);
    setTasks(result.tasks);
    setProjects(sortProjects(result.projects));
    setReviews(result.reviews);
    if (result.settings)
      setSettings({
        ...result.settings,
        motion: "standard",
        motionEnabled: true,
      });
  };

  // Real review stats calculated purely from tasks
  const reviewStats = useMemo(() => {
    return calculateReviewStats(tasks, now, reviewPeriod);
  }, [tasks, now, reviewPeriod]);

  const pendingCountTotal = tasks.filter((t) => t.status === "pending").length;

  if (!hydrated)
    return (
      <div
        className="min-h-screen bg-[#F5F1E8] text-[#786E64] flex flex-col items-center justify-center gap-3"
        role="status"
      >
        {storageError || "正在读取本地数据…"}
        {(storageError || reminderError) && (
          <button onClick={() => location.reload()}>重新读取</button>
        )}
      </div>
    );

  return (
    <MotionProvider settings={settings} activePage={activeTab}>
      <div className="app-root min-h-screen bg-[#F5F1E8] dark:bg-[#1D1916] text-[#28231D] dark:text-[#EDE6DE] relative flex flex-col font-sans transition-colors duration-200">
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

        {(storageError || reminderError) && (
          <div
            role="alert"
            className="relative z-50 px-4 py-2 text-sm text-[#A55340]"
          >
            {storageError || reminderError}
          </div>
        )}
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative z-10">
          <AnimatePresence mode="popLayout" initial={false}>
            <PageTransition key={activeTab} page={activeTab}>
              {activeTab === "today" && (
                <TodayView
                  onOpenWrap={() => setWrapOpen(true)}
                  wrapCount={wrapTasks(tasks, now).length}
                  tasks={todayTasks}
                  onToggleTask={handleToggleTask}
                  onOpenAddTask={handleOpenAddTask}
                  onDeleteTask={handleDeleteTask}
                  onEditTask={handleOpenEditTask}
                  onReorderTasks={handleReorderTasks}
                />
              )}

              {activeTab === "tasks" && (
                <TasksView
                  onOpenWrap={() => setWrapOpen(true)}
                  tasks={tasks}
                  onToggleTask={handleToggleTask}
                  onDeleteTask={handleDeleteTask}
                  onEditTask={handleOpenEditTask}
                  onOpenAddTask={(values) => { handleOpenAddTask(); setTaskInitial(values); }}
                  onReorderTasks={handleReorderTasks}
                />
              )}

              {activeTab === "projects" && (
                <ProjectsView
                  projects={projects}
                  tasks={tasks}
                  onOpenDetail={setProjectDetail}
                  onAddProject={handleAddProject}
                  onReorderProject={handleReorderProjects}
                  onDeleteProject={setProjectToDelete}
                  onToggleTask={handleToggleTask}
                  onEditTask={handleOpenEditTask}
                />
              )}

              {activeTab === "review" && (
                <NotesView
                  projects={projects}
                  tasks={tasks}
                  onOpen={(note) => setNoteScreen({ note, editing: false })}
                  onNew={() =>
                    setNoteScreen({ note: newNote(), editing: true })
                  }
                />
              )}

              {activeTab === "more" && (
                <MoreView
                  lastBackupAt={lastBackupAt}
                  settings={settings}
                  onChangeReminder={(patch) =>
                    setSettings((s) => ({ ...s, ...patch }))
                  }
                  onRefreshReminders={() => setReminderRefresh((x) => x + 1)}
                  devices={devices}
                  tasksCount={tasks.length}
                  projectsCount={projects.length}
                  reviewsCount={notes.length}
                  onToggleTheme={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const origin = {
                      x: event.detail
                        ? event.clientX
                        : rect.left + rect.width / 2,
                      y: event.detail
                        ? event.clientY
                        : rect.top + rect.height / 2,
                    };
                    void revealTheme(
                      () => {
                        const theme =
                          settings.theme === "light" ? "dark" : "light";
                        document.documentElement.classList.toggle(
                          "dark",
                          theme === "dark",
                        );
                        setSettings((s) => ({ ...s, theme }));
                      },
                      origin,
                      settings.motion === "rich",
                      settings.motionEnabled,
                    );
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
            setProjectDetail(null);
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: "instant" });
          }}
          pendingCount={pendingCountTotal}
        />

        {/* Add / Edit Task Bottom Sheet */}
        <AddTaskSheet
          isOpen={isAddTaskOpen}
          initialValues={taskInitial}
          onOpenSourceNote={(id) => {
            const note = getNotes().find((n) => n.id === id);
            if (note) {
              setIsAddTaskOpen(false);
              setNoteScreen({ note, editing: false });
            } else showToast("来源笔记已删除");
          }}
          taskToEdit={taskToEdit}
          projects={projects}
          onClose={() => {
            setIsAddTaskOpen(false);
            setTaskToEdit(null);
            setTaskInitial(undefined);
          }}
          onSave={handleSaveTask}
        />

        {projectDetail && (
          <ProjectDetail
            project={projectDetail}
            tasks={tasks}
            onClose={() => setProjectDetail(null)}
            onNote={(note) => setNoteScreen({ note, editing: false })}
            onNewNote={() =>
              setNoteScreen({ note: newNote(projectDetail.id), editing: true })
            }
            onTask={handleOpenEditTask}
            onToggle={handleToggleTask}
          />
        )}
        <AnimatePresence>
          {noteScreen && (
            <NoteWorkspace
              key={noteScreen.note.id}
              note={noteScreen.note}
              editing={noteScreen.editing}
              projects={projects}
              onClose={() => setNoteScreen(null)}
              onUndo={recordDeletedNote}
              onTask={(note) => {
                setTaskToEdit(null);
                setTaskInitial({
                  title: note.title,
                  projectId: note.projectId,
                  project:
                    projects.find((p) => p.id === note.projectId)?.name || "",
                  sourceNoteId: note.id,
                });
                setIsAddTaskOpen(true);
              }}
            />
          )}
        </AnimatePresence>
        <DeletionStack entries={deletions} onRemove={id => setDeletions(previous => previous.filter(entry => entry.id !== id))} onDismiss={() => setDeletions([])} onError={showToast} />
        {projectToDelete && <DeleteProjectDialog project={projectToDelete}
          taskCount={tasks.filter(task => belongsToProject(task, projectToDelete)).length}
          noteCount={notes.filter(note => note.projectId === projectToDelete.id).length}
          onClose={() => setProjectToDelete(null)} onConfirm={handleDeleteProject} />}

        {/* Toast Notification */}
        <AnimatePresence>{wrapOpen && <WrapUpSheet tasks={tasks} onClose={() => setWrapOpen(false)}
          onApply={(ids, date) => persistBatch(current => arrangeTasks(current, ids, date))}
          onUndo={(records) => persistBatch(current => undoArrangement(current, records))}
          onComplete={async id => { await persistBatch(current => {
            const stamp = new Date().toISOString();
            let count = 0;
            const next = current.map(task => task.id === id && task.status === 'pending' ? (count++, { ...task, status: 'completed' as const, completedAt: stamp, updatedAt: stamp }) : task);
            return { tasks: next, count, skipped: count ? 0 : 1 };
          }); }} />}</AnimatePresence>
        {wrapError && <div role="alert" className="wrap-system-error">{wrapError}<button onClick={() => { const snapshot = businessRef.current; void saveStorageData(snapshot).then(() => mirrorWrapReminder(snapshot.tasks, snapshot.settings)).then(() => setWrapError('')).catch(error => setWrapError(error.message)); }}>重试</button></div>}
        {widgetError && !wrapError && <div role="alert" className="wrap-system-error">{widgetError}<button onClick={() => { const snapshot = businessRef.current; void saveStorageData(snapshot).then(() => mirrorTodayWidget(snapshot.tasks, snapshot.settings)).then(() => setWidgetError('')).catch(error => setWidgetError(error.message)); }}>重试</button></div>}
        <Toast message={toastMessage} />
      </div>
    </MotionProvider>
  );
}
