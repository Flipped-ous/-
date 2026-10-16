/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import type { Task, Project, ReviewEntry, SyncDevice, AppSettings } from './types/index.ts';
import {
  initialTodayTasks,
  initialTasksTasks,
  initialProjects,
  initialReviews,
  initialDevices,
  initialSettings,
} from './data/initialData.ts';
import { BottomNavigation, type NavTabId } from './components/BottomNavigation.tsx';
import { AddTaskSheet } from './components/AddTaskSheet.tsx';
import { Toast } from './components/Toast.tsx';
import { TodayView } from './views/TodayView.tsx';
import { TasksView } from './views/TasksView.tsx';
import { ProjectsView } from './views/ProjectsView.tsx';
import { ReviewView } from './views/ReviewView.tsx';
import { MoreView } from './views/MoreView.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('today');
  const [todayTasks, setTodayTasks] = useState<Task[]>(initialTodayTasks);
  const [allTasks, setAllTasks] = useState<Task[]>(initialTasksTasks);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [reviews, setReviews] = useState<ReviewEntry[]>(initialReviews);
  const [devices, setDevices] = useState<SyncDevice[]>(initialDevices);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Apply dark class to document body
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  // Toggle task in Today view
  const handleToggleTodayTask = (taskId: string) => {
    setTodayTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const isDone = t.status === 'completed';
          if (!isDone) showToast('已完成 1 项任务');
          return {
            ...t,
            status: isDone ? 'pending' : 'completed',
            completedAt: isDone ? undefined : '刚刚',
          };
        }
        return t;
      })
    );
  };

  // Toggle task in All Tasks view
  const handleToggleTask = (taskId: string) => {
    setAllTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const isDone = t.status === 'completed';
          if (!isDone) showToast('已完成 1 项任务');
          return {
            ...t,
            status: isDone ? 'pending' : 'completed',
            completedAt: isDone ? undefined : '刚刚',
          };
        }
        return t;
      })
    );
  };

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    setAllTasks((prev) => prev.filter((t) => t.id !== taskId));
    setTodayTasks((prev) => prev.filter((t) => t.id !== taskId));
    showToast('已移除该任务');
  };

  // Add new task
  const handleAddTask = (newTaskData: Partial<Task>) => {
    const id = `task-${Date.now()}`;
    const task: Task = {
      id,
      title: newTaskData.title || '',
      note: newTaskData.note,
      status: 'pending',
      priority: newTaskData.priority || 'normal',
      dueCategory: newTaskData.dueCategory || 'today',
      dueLabel: newTaskData.dueLabel || '今天',
      project: newTaskData.project || '今日有序',
      badgeLabel: newTaskData.badgeLabel,
      badgeType: newTaskData.badgeType,
      createdAt: new Date().toISOString(),
    };

    if (activeTab === 'today') {
      setTodayTasks((prev) => [task, ...prev]);
    }
    setAllTasks((prev) => [task, ...prev]);
    showToast('已添入待办清单');
  };

  // Add project
  const handleAddProject = (newProj: Partial<Project>) => {
    const proj: Project = {
      id: `proj-${Date.now()}`,
      name: newProj.name || '新建项目',
      description: newProj.description || '',
      status: 'active',
      statusLabel: '● 进行中',
      statusType: 'sage',
      pendingCount: 0,
      completedCount: 0,
      docCount: 0,
      innerTasks: [],
      docs: [],
    };
    setProjects((prev) => [proj, ...prev]);
    showToast('新项目创建成功');
  };

  // Toggle inner task of project
  const handleToggleProjectTask = (projId: string, innerTaskId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projId && p.innerTasks) {
          return {
            ...p,
            innerTasks: p.innerTasks.map((it) =>
              it.id === innerTaskId ? { ...it, completed: !it.completed } : it
            ),
          };
        }
        return p;
      })
    );
  };

  // Add review
  const handleAddReview = (newEntry: Partial<ReviewEntry>) => {
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
        pingMs: Math.floor(Math.random() * 5) + 2,
      }))
    );
  };

  // Export Data JSON
  const handleExportData = () => {
    const exportBlob = new Blob(
      [
        JSON.stringify(
          {
            todayTasks,
            allTasks,
            projects,
            reviews,
            exportedAt: new Date().toISOString(),
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(exportBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jinri-youxu-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已导出离线备份数据 (.json)');
  };

  // Dynamic overview stats for ReviewView
  const completedToday = todayTasks.filter((t) => t.status === 'completed').length;
  const delayedCount = allTasks.filter((t) => t.dueCategory === 'overdue' && t.status === 'pending').length;
  const reviewStats = {
    completed: completedToday + 2, // includes past linked items
    delayed: delayedCount,
    added: todayTasks.length,
    topProject: '今日有序 Android 客户端',
    hours: '3h',
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-[#1D1916] text-[#28231D] dark:text-[#EDE6DE] relative flex flex-col font-sans transition-colors duration-200">
      {/* 
        Extreme bottom-right corner subtle sage tint (as required: 
        "只允许在页面极右下角的非常小区域加入一丝极淡鼠尾草绿，约占5%~10%，非常柔和，像空气、水彩或自然光轻轻晕开")
      */}
      <div className="sage-ambient-corner" />

      {/* Subtle stationery watermark line drawing (bamboo & gentle gridlines, opacity 0.04) */}
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
            onToggleTask={handleToggleTodayTask}
            onOpenAddTask={() => setIsAddTaskOpen(true)}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksView
            tasks={allTasks}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onOpenAddTask={() => setIsAddTaskOpen(true)}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsView
            projects={projects}
            onAddProject={handleAddProject}
            onToggleProjectTask={handleToggleProjectTask}
          />
        )}

        {activeTab === 'review' && (
          <ReviewView
            reviews={reviews}
            stats={reviewStats}
            onAddReview={handleAddReview}
          />
        )}

        {activeTab === 'more' && (
          <MoreView
            settings={settings}
            devices={devices}
            onToggleTheme={() =>
              setSettings((s) => ({
                ...s,
                theme: s.theme === 'light' ? 'dark' : 'light',
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
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Floating Bottom Navigation (Today, Tasks, Projects, Review, More) */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        pendingCount={allTasks.filter((t) => t.status === 'pending').length}
      />

      {/* Add Task Bottom Sheet */}
      <AddTaskSheet
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onAdd={handleAddTask}
      />

      {/* Toast Notification */}
      <Toast message={toastMessage} />
    </div>
  );
}
