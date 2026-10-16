export type PriorityLevel = 'urgent' | 'important' | 'normal' | 'later';

export type DueCategory = 'overdue' | 'today' | 'future' | 'none';

export type TaskTagType = '重点' | '协同' | '日常' | '灵感' | '已完结' | string;

export interface Task {
  id: string;
  title: string;
  note?: string;
  status: 'pending' | 'completed';
  priority: PriorityLevel;
  dueCategory: DueCategory;
  dueTime?: string;
  dueLabel?: string;
  project: string;
  badgeLabel?: string;
  badgeType?: 'terracotta' | 'sage' | 'amber' | 'gray';
  tags?: string[];
  createdAt: string;
  completedAt?: string;
}

export type ProjectStatus = 'active' | 'paused' | 'archived';

export interface ProjectDoc {
  id: string;
  name: string;
  size?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  statusLabel: string;
  statusType: 'terracotta' | 'sage' | 'amber' | 'gray';
  pendingCount: number;
  completedCount: number;
  docCount: number;
  isExpanded?: boolean;
  innerTasks?: {
    id: string;
    title: string;
    dueText: string;
    completed: boolean;
  }[];
  docs?: string[];
}

export type ReviewMood = '平静' | '心流' | '有进展' | '专注' | '洞察' | '疲惫' | '焦虑';

export interface ReviewEntry {
  id: string;
  date: string;
  subDate: string;
  title: string;
  content: string;
  moods: ReviewMood[];
  wordCount: number;
  time: string;
  type: 'day' | 'week' | 'month';
  imageUrl?: string;
  imageCaption?: string;
  stats?: {
    completed: number;
    delayed: number;
    added: number;
    topProject: string;
    hours: string;
  };
}

export interface SyncDevice {
  id: string;
  name: string;
  os: string;
  status: 'connected' | 'offline';
  quality: '极佳' | '良好' | '普通';
  pingMs: number;
  lastSync: string;
  isCurrent?: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  motion: 'simple' | 'standard' | 'rich';
  motionEnabled: boolean;
  notification: 'gentle' | 'important' | 'all' | 'off';
  dataSizeMb: number;
  pendingCountTotal: number;
  activeProjectsTotal: number;
  reviewsTotal: number;
}
