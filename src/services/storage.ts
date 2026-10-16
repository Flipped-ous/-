import type { Task, Project, ReviewEntry, AppSettings, SyncDevice, BackupData } from '../types/index.ts';
import { mergeEntities } from '../utils/taskLogic.ts';

const DB_NAME = 'jinri_youxu_db';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('tasks')) {
        db.createObjectStore('tasks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('reviews')) {
        db.createObjectStore('reviews', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('devices')) {
        db.createObjectStore('devices', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Loads all persistent data from IndexedDB, with localStorage fallback.
 */
export async function loadStorageData(): Promise<{
  tasks: Task[];
  projects: Project[];
  reviews: ReviewEntry[];
  settings: AppSettings | null;
  devices: SyncDevice[];
} | null> {
  try {
    const db = await openDB();

    const readStore = <T>(storeName: string): Promise<T[]> => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    };

    const tasks = await readStore<Task>('tasks');
    const projects = await readStore<Project>('projects');
    const reviews = await readStore<ReviewEntry>('reviews');
    const devices = await readStore<SyncDevice>('devices');

    let settings: AppSettings | null = null;
    const settingsRows = await readStore<{ key: string; value: AppSettings }>('settings');
    const settingsItem = settingsRows.find((r) => r.key === 'appSettings');
    if (settingsItem) {
      settings = settingsItem.value;
    }

    // If IndexedDB has no tasks, check if localStorage has fallback or return null
    if (tasks.length === 0 && projects.length === 0) {
      const lsBackup = loadLocalStorageFallback();
      if (lsBackup) return lsBackup;
      return null;
    }

    return {
      tasks,
      projects,
      reviews,
      settings,
      devices,
    };
  } catch (err) {
    console.warn('IndexedDB read failed, trying localStorage fallback:', err);
    return loadLocalStorageFallback();
  }
}

/**
 * Saves tasks to IndexedDB.
 */
export async function saveTasksToStorage(tasks: Task[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    await clearStore(store);
    for (const t of tasks) {
      store.put(t);
    }
  } catch {
    // Fallback to localStorage
    try {
      localStorage.setItem('jy_tasks', JSON.stringify(tasks));
    } catch {}
  }
}

/**
 * Saves projects to IndexedDB.
 */
export async function saveProjectsToStorage(projects: Project[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    await clearStore(store);
    for (const p of projects) {
      store.put(p);
    }
  } catch {
    try {
      localStorage.setItem('jy_projects', JSON.stringify(projects));
    } catch {}
  }
}

/**
 * Saves reviews to IndexedDB.
 */
export async function saveReviewsToStorage(reviews: ReviewEntry[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('reviews', 'readwrite');
    const store = tx.objectStore('reviews');
    await clearStore(store);
    for (const r of reviews) {
      store.put(r);
    }
  } catch {
    try {
      localStorage.setItem('jy_reviews', JSON.stringify(reviews));
    } catch {}
  }
}

/**
 * Saves settings to IndexedDB.
 */
export async function saveSettingsToStorage(settings: AppSettings): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    store.put({ key: 'appSettings', value: settings });
  } catch {
    try {
      localStorage.setItem('jy_settings', JSON.stringify(settings));
    } catch {}
  }
}

/**
 * Saves sync devices to IndexedDB.
 */
export async function saveDevicesToStorage(devices: SyncDevice[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('devices', 'readwrite');
    const store = tx.objectStore('devices');
    await clearStore(store);
    for (const d of devices) {
      store.put(d);
    }
  } catch {
    try {
      localStorage.setItem('jy_devices', JSON.stringify(devices));
    } catch {}
  }
}

function clearStore(store: IDBObjectStore): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function loadLocalStorageFallback() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const rawTasks = localStorage.getItem('jy_tasks');
    const rawProjects = localStorage.getItem('jy_projects');
    const rawReviews = localStorage.getItem('jy_reviews');
    const rawSettings = localStorage.getItem('jy_settings');
    const rawDevices = localStorage.getItem('jy_devices');

    if (!rawTasks && !rawProjects) return null;

    return {
      tasks: rawTasks ? JSON.parse(rawTasks) : [],
      projects: rawProjects ? JSON.parse(rawProjects) : [],
      reviews: rawReviews ? JSON.parse(rawReviews) : [],
      settings: rawSettings ? JSON.parse(rawSettings) : null,
      devices: rawDevices ? JSON.parse(rawDevices) : [],
    };
  } catch {
    return null;
  }
}
