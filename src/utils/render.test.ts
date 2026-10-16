import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { TodayView } from '../views/TodayView.tsx';
import { TasksView } from '../views/TasksView.tsx';
import { ProjectsView } from '../views/ProjectsView.tsx';
import { ReviewView } from '../views/ReviewView.tsx';
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
    React.createElement(ReviewView, {
      reviews: initialReviews,
      onAddReview: noop,
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
  for (const screen of screens) assert.ok(renderToString(screen).length > 100);
});
