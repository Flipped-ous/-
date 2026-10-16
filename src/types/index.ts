export type PriorityLevel = 'urgent' | 'important' | 'normal' | 'later';

export type DueCategory = 'overdue' | 'today' | 'future' | 'none';

export type TaskTagType = '�ص�' | 'Эͬ' | '�ճ�' | '���' | '�����' | string;

export interface Task {
  id: string;
  title: string;
  note?: string;
  status: 'pending' | 'completed';
  priority: PriorityLevel;
  dueAt?: string; // ISO datetime
  reminderAt?: string;
  dueCategory?: DueCategory; // Derived dynamically
  dueTime?: string;
  dueLabel?: string;
  projectId?: string; // Relation to Project.id
  project: string; // Project display title
  badgeLabel?: string;
  badgeType?: 'terracotta' | 'sage' | 'amber' | 'gray';
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  order?: number;
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
  statusLabel?: string;
  statusType?: 'terracotta' | 'sage' | 'amber' | 'gray';
  docs?: string[];
  docCount?: number;
  isExpanded?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReviewMood = 'ƽ��' | '����' | '�н�չ' | 'רע' | '����' | 'ƣ��' | '����';

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
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
  imageCaption?: string;
  stats?: {
    completed: number;
    delayed: number;
    added: number;
    topProject: string;
    hours?: string;
  };
}

export interface SyncDevice {
  id: string;
  name: string;
  os: string;
  status: 'connected' | 'offline';
  quality: '����' | '����' | '��ͨ';
  pingMs: number;
  lastSync: string;
  isCurrent?: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  motion: 'simple' | 'standard' | 'rich';
  motionEnabled: boolean;
  syncPaused?: boolean;
  notification: 'gentle' | 'important' | 'all' | 'off';
  dataSizeMb?: number;
}

export interface BackupData {
  schemaVersion: number;
  exportedAt: string;
  tasks: Task[];
  projects: Project[];
  reviews: ReviewEntry[];
  settings?: Partial<AppSettings>;
}
