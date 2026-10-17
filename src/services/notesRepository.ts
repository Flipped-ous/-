import type { Note, NoteAttachment } from "../types/index.ts";
import { openDB } from "./storage.ts";
import { attachmentIds, isEmptyNote, validateNote } from "../utils/notes.ts";

let snapshot: Note[] = [];
const listeners = new Set<() => void>();
let pending: Promise<unknown> = Promise.resolve();
export const subscribeNotes = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const getNotes = () => snapshot;
function publish(rows: Note[]) {
  snapshot = rows;
  listeners.forEach((fn) => fn());
}
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.catch(() => {}).then(operation);
  pending = result;
  return result;
}
export async function transaction<T>(
  names: string[],
  mode: IDBTransactionMode,
  run: (tx: IDBTransaction, result: (value: T) => void) => void,
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(names, mode);
    let value: T;
    try {
      run(tx, (v) => {
        value = v;
      });
    } catch (error) {
      tx.abort();
      reject(error);
      return;
    }
    tx.oncomplete = () => resolve(value!);
    tx.onerror = tx.onabort = () =>
      reject(tx.error || new Error("本地保存失败，请检查存储空间并重试"));
  });
}
export async function initializeNotes(seed?: Note[]) {
  // Seed only after the main loader has distinguished first run from explicit emptiness.
  if (seed !== undefined)
    await transaction<void>(
      ["notes", "meta", "syncMeta"],
      "readwrite",
      (tx) => {
        const req = tx.objectStore("meta").get("notes-initialized");
        req.onsuccess = () => {
          if (!req.result) {
            for (const n of seed) {
              tx.objectStore("notes").put(n);
              tx.objectStore("syncMeta").put({
                id: `notes:${n.id}`,
                entity: "notes",
                entityId: n.id,
                revision: Math.max(1, n.revision),
                updatedAt: n.updatedAt,
                deleted: false,
                value: n,
              });
            }
            tx.objectStore("meta").put({
              key: "notes-initialized",
              value: true,
            });
          }
        };
      },
    );
  const rows = await transaction<Note[]>(
    ["notes"],
    "readonly",
    (tx, result) => {
      tx.objectStore("notes").getAll().onsuccess = (e) =>
        result((e.target as IDBRequest).result);
    },
  );
  publish(rows);
}
export const saveNote = (value: Note) =>
  serialize(async () => {
    if (!validateNote(value)) throw new Error("笔记格式无效，请检查来源链接");
    if (isEmptyNote(value) && !snapshot.some((n) => n.id === value.id))
      return value;
    for (const id of attachmentIds(value.document))
      if (!(await readAttachment(id)))
        throw new Error("图片尚未保存，请重新选择图片");
    const saved = await transaction<Note>(
      ["notes", "syncMeta"],
      "readwrite",
      (tx, result) => {
        const req = tx.objectStore("syncMeta").get(`notes:${value.id}`);
        req.onsuccess = () => {
          const note = {
            ...value,
            revision: Math.max(value.revision, req.result?.revision || 0) + 1,
          };
          tx.objectStore("notes").put(note);
          tx.objectStore("syncMeta").put({
            id: `notes:${note.id}`,
            entity: "notes",
            entityId: note.id,
            revision: note.revision,
            updatedAt: note.updatedAt,
            deleted: false,
            value: note,
          });
          result(note);
        };
      },
    );
    publish([saved, ...snapshot.filter((n) => n.id !== saved.id)]);
    return saved;
  });
export const deleteNote = (id: string) =>
  serialize(async () => {
    await transaction<void>(["notes", "syncMeta"], "readwrite", (tx) => {
      tx.objectStore("notes").delete(id);
      const req = tx.objectStore("syncMeta").get(`notes:${id}`);
      req.onsuccess = () =>
        tx
          .objectStore("syncMeta")
          .put({
            id: `notes:${id}`,
            entity: "notes",
            entityId: id,
            revision: (req.result?.revision || 0) + 1,
            updatedAt: new Date().toISOString(),
            deleted: true,
          });
    });
    publish(snapshot.filter((n) => n.id !== id));
  });
export async function hashBytes(bytes: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
}
export async function addAttachment(
  file: Blob & { name?: string },
): Promise<NoteAttachment> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("请选择 JPEG、PNG 或 WebP 图片");
  if (file.size > 50 * 1024 * 1024) throw new Error("单张图片请小于 50 MB");
  const bytes = await file.arrayBuffer();
  const b = new Uint8Array(bytes);
  const valid =
    file.type === "image/png"
      ? b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71
      : file.type === "image/jpeg"
        ? b[0] === 255 && b[1] === 216 && b[2] === 255
        : new TextDecoder().decode(b.slice(0, 4)) === "RIFF" &&
          new TextDecoder().decode(b.slice(8, 12)) === "WEBP";
  if (!valid) throw new Error("图片格式与文件内容不符");
  const id = await hashBytes(bytes);
  const existing = await readAttachment(id);
  if (existing) return existing;
  const attachment = {
    id,
    name: file.name || "图片",
    mime: file.type,
    size: file.size,
    blob: new Blob([bytes], { type: file.type }),
  };
  await transaction<void>(["attachments"], "readwrite", (tx) => {
    tx.objectStore("attachments").put(attachment);
  });
  return attachment;
}
export function readAttachment(id: string) {
  return transaction<NoteAttachment | undefined>(
    ["attachments"],
    "readonly",
    (tx, result) => {
      tx.objectStore("attachments").get(id).onsuccess = (e) =>
        result((e.target as IDBRequest).result);
    },
  );
}
export async function allAttachments(ids: string[]) {
  const rows: NoteAttachment[] = [];
  for (const id of new Set(ids)) {
    const row = await readAttachment(id);
    if (!row) throw new Error("备份所需图片缺失：" + id.slice(0, 8));
    rows.push(row);
  }
  return rows;
}
export function flushNotes() {
  return pending;
}
export async function replaceNotes(
  notes: Note[],
  attachments: NoteAttachment[],
  merge: boolean,
) {
  await serialize(async () => {
    const rows = merge
      ? new Map(snapshot.map((n) => [n.id, n]))
      : new Map<string, Note>();
    for (const n of notes)
      if (!rows.has(n.id) || rows.get(n.id)!.updatedAt <= n.updatedAt)
        rows.set(n.id, n);
    await transaction<void>(["notes", "attachments"], "readwrite", (tx) => {
      tx.objectStore("notes").clear();
      for (const n of rows.values()) tx.objectStore("notes").put(n);
      for (const a of attachments) tx.objectStore("attachments").put(a);
    });
    publish([...rows.values()]);
  });
}
