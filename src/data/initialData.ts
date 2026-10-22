import type { Task, Project, ReviewEntry, SyncDevice, AppSettings } from '../types/index.ts';

// A new installation starts empty. Hydration always preserves existing local data.
export const initialTasks: Task[] = [];
export const initialProjects: Project[] = [];
export const initialReviews: ReviewEntry[] = [];
export const initialDevices: SyncDevice[] = [];
export const initialSettings: AppSettings = {
  theme: 'light', motion: 'standard', motionEnabled: true, notification: 'gentle',
  wrapReminderEnabled: true, wrapReminderTime: '21:00',
};
