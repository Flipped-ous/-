import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { TodayView } from '../views/TodayView.tsx';
import { TasksView } from '../views/TasksView.tsx';
import { ProjectsView } from '../views/ProjectsView.tsx';
import { NotesView } from '../views/NotesView.tsx';
import { PageTransition } from '../motion/PageTransition.tsx';
import { MoreView } from '../views/MoreView.tsx';
import {
  initialTasks,
  initialProjects,
  initialReviews,
  initialDevices,
  initialSettings,
} from '../data/initialData.ts';
const noop = () => {};
test('all five populated screens render without undefined references', () => {
  const screens = [
    React.createElement(TodayView, {
      tasks: initialTasks,
      onToggleTask: noop,
      onOpenAddTask: noop,
    }),
    React.createElement(TasksView, {
      tasks: initialTasks,
      onToggleTask: noop,
      onDeleteTask: noop,
      onOpenAddTask: noop,
    }),
    React.createElement(ProjectsView, {
      tasks: initialTasks,
      projects: initialProjects,
      onAddProject: noop,
      onToggleTask: noop,
    }),
    React.createElement(NotesView, {
      projects: initialProjects,
      tasks: initialTasks,
      onOpen: noop,
      onNew: noop,
    }),
    React.createElement(MoreView, {
      settings: initialSettings,
      devices: initialDevices,
      tasksCount: 1,
      projectsCount: 1,
      reviewsCount: 1,
      onToggleTheme: noop,
      onChangeMotionLevel: noop,
      onToggleMotion: noop,
      onTriggerSync: noop,
      onExportData: noop,
      onImportBackup: noop,
      onShowToast: noop,
    }),
  ];
  for (const screen of screens) {
    const html=renderToString(screen);
    assert.ok(html.length > 100);
    assert.equal(html.includes('动效系统等级'),false);
  }
});
test('page transitions fade without translating content horizontally',()=>{
  const html=renderToString(React.createElement(PageTransition,{page:'review',children:'笔记'}));
  assert.equal(/translate|matrix\(/.test(html),false);
});
