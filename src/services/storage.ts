import { migrateStorageData, type StoredData } from './migration.ts';

const DB_NAME = 'jinri_youxu_db';
const DB_VERSION = 2;
const FALLBACK_KEY = 'jy_snapshot_v2';
const stores = ['tasks', 'projects', 'reviews', 'settings', 'devices', 'meta'];
let connection: Promise<IDBDatabase> | null = null;
let writes: Promise<void> = Promise.resolve();
let lastSavedMs = 0;

function openDB(): Promise<IDBDatabase> {
  if (connection) return connection;
  connection = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined')
      return reject(new Error('IndexedDB 不可用'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of stores)
        if (!db.objectStoreNames.contains(name))
          db.createObjectStore(name, {
            keyPath: name === 'settings' || name === 'meta' ? 'key' : 'id',
          });
    };
    request.onblocked = () => reject(new Error('请关闭其他旧版页面后重新打开'));
    request.onerror = () =>
      reject(request.error || new Error('无法打开本地数据库'));
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        connection = null;
      };
      resolve(request.result);
    };
  }).catch((error) => {
    connection = null;
    throw error;
  });
  return connection!;
}

function fallbackRead(): StoredData | null {
  try {
    localStorage.getItem(FALLBACK_KEY);
  } catch {
    return null;
  }
  const saved = localStorage.getItem(FALLBACK_KEY);
  if (saved !== null) return migrateStorageData(JSON.parse(saved));
  const names = ['tasks', 'projects', 'reviews', 'settings', 'devices'];
  const old = Object.fromEntries(
    names.map((name) => [name, localStorage.getItem('jy_' + name)]),
  );
  if (Object.values(old).every((value) => value === null)) return null;
  return migrateStorageData(
    Object.fromEntries(
      Object.entries(old).map(([name, value]) => [
        name,
        value === null ? (name === 'settings' ? null : []) : JSON.parse(value),
      ]),
    ),
  );
}

/** A single readonly transaction gives a consistent snapshot, including intentionally empty stores. */
export async function loadStorageData(): Promise<StoredData | null> {
  let db: IDBDatabase;
  try {
    db = await openDB();
  } catch (error) {
    const fallback = fallbackRead();
    if (fallback) return fallback;
    // A supported database that failed to open must not be overwritten with seed data.
    if (typeof indexedDB !== 'undefined') throw error;
    return null;
  }
  const raw = await new Promise<any>((resolve, reject) => {
    const tx = db.transaction(stores, 'readonly');
    const result: Record<string, any> = {};
    for (const name of stores) {
      const req = tx.objectStore(name).getAll();
      req.onsuccess = () => {
        result[name] = req.result;
      };
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = tx.onabort = () =>
      reject(tx.error || new Error('读取本地数据失败'));
  });
  const meta = raw.meta.find((row: any) => row.key === 'snapshot');
  const settings =
    raw.settings.find((row: any) => row.key === 'appSettings')?.value || null;
  if (
    !meta &&
    !settings &&
    ['tasks', 'projects', 'reviews', 'devices'].every(
      (name) => raw[name].length === 0,
    )
  )
    return fallbackRead();
  const snapshot = migrateStorageData({
    ...raw,
    schemaVersion: meta?.schemaVersion || 1,
    settings,
  });
  // A previously unavailable IndexedDB may have left a newer, complete fallback snapshot.
  let fallbackRaw: string | null = null;
  try {
    fallbackRaw = localStorage.getItem(FALLBACK_KEY);
  } catch {}
  if (fallbackRaw) {
    const fallback = JSON.parse(fallbackRaw);
    if (fallback.savedAt > (meta?.savedAt || ''))
      return migrateStorageData(fallback);
  }
  return snapshot;
}

/** Serialize writes; all stores commit atomically. Resolve only on transaction completion. */
export function saveStorageData(data: StoredData): Promise<void> {
  lastSavedMs = Math.max(Date.now(), lastSavedMs + 1);
  const snapshot = structuredClone({
    ...data,
    schemaVersion: 2,
    savedAt: new Date(lastSavedMs).toISOString(),
  });
  const operation = writes
    .catch(() => {})
    .then(async () => {
      try {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(stores, 'readwrite');
          for (const name of [
            'tasks',
            'projects',
            'reviews',
            'devices',
          ] as const) {
            const store = tx.objectStore(name);
            store.clear();
            for (const item of snapshot[name]) store.put(item);
          }
          tx.objectStore('settings').put({
            key: 'appSettings',
            value: snapshot.settings,
          });
          tx.objectStore('meta').put({
            key: 'snapshot',
            schemaVersion: 2,
            savedAt: snapshot.savedAt,
          });
          tx.oncomplete = () => resolve();
          tx.onerror = tx.onabort = () =>
            reject(tx.error || new Error('本地保存失败'));
        });
        // A completed IndexedDB commit supersedes its fallback.
        try {
          localStorage.removeItem(FALLBACK_KEY);
        } catch {}
      } catch (error) {
        try {
          localStorage.setItem(FALLBACK_KEY, JSON.stringify(snapshot));
        } catch {
          throw new Error('本地保存失败，请导出备份并检查设备存储空间', {
            cause: error,
          });
        }
      }
    });
  writes = operation;
  return operation;
}
