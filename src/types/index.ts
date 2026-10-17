export type PriorityLevel = "urgent" | "important" | "normal" | "later";

export type DueCategory = "overdue" | "today" | "future" | "none";

export type TaskTagType = "重点" | "协同" | "日常" | "灵感" | "已完结" | string;

export interface Task {
  sourceNoteId?: string;
  id: string;
  title: string;
  note?: string;
  status: "pending" | "completed";
  priority: PriorityLevel;
  dueAt?: string; // ISO datetime
  reminderAt?: string;
  dueCategory?: DueCategory; // Derived dynamically
  dueTime?: string;
  dueLabel?: string;
  projectId?: string; // Relation to Project.id
  project: string; // Project display title
  badgeLabel?: string;
  badgeType?: "terracotta" | "sage" | "amber" | "gray";
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  order?: number;
}

export type ProjectStatus = "active" | "paused" | "archived";

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
  statusType?: "terracotta" | "sage" | "amber" | "gray";
  docs?: string[];
  docCount?: number;
  isExpanded?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReviewMood =
  "平静" | "心流" | "有进展" | "专注" | "洞察" | "疲惫" | "焦虑";

export interface ReviewEntry {
  id: string;
  date: string;
  subDate: string;
  title: string;
  content: string;
  moods: ReviewMood[];
  wordCount: number;
  time: string;
  type: "day" | "week" | "month";
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
  status: "connected" | "offline";
  quality: "极佳" | "良好" | "普通";
  pingMs: number;
  lastSync: string;
  isCurrent?: boolean;
}

export interface AppSettings {
  reminderLeadMinutes?: number;
  theme: "light" | "dark";
  motion: "simple" | "standard" | "rich";
  motionEnabled: boolean;
  syncPaused?: boolean;
  notification: "gentle" | "important" | "all" | "off";
  dataSizeMb?: number;
}

export interface BackupData {
  notes?: Note[];
  schemaVersion: number;
  exportedAt: string;
  tasks: Task[];
  projects: Project[];
  reviews: ReviewEntry[];
  settings?: Partial<AppSettings>;
}

export interface NoteDocument {
  type: string;
  text?: string;
  attrs?: Record<string, any>;
  marks?: { type: string; attrs?: Record<string, any> }[];
  content?: NoteDocument[];
}
export interface Note {
  id: string;
  kind: "knowledge" | "review";
  title: string;
  document: NoteDocument;
  projectId?: string;
  sourceUrl?: string;
  pinned: boolean;
  needsReview: boolean;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  legacyReview?: ReviewEntry;
  extensions?: Record<string, unknown>;
}
export interface NoteAttachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  blob: Blob;
}
