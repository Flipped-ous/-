import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import type { BackupData, NoteAttachment, Note } from "../types/index.ts";
import {
  allAttachments,
  flushNotes,
  getNotes,
  hashBytes,
  transaction,
  initializeNotes,
} from "./notesRepository.ts";
import { attachmentIds, validateNote } from "../utils/notes.ts";
import { validateBackupData } from "../utils/taskLogic.ts";
import { migrateStorageData, type StoredData } from "./migration.ts";
import { flushStorageData } from "./storage.ts";

const prepared = new WeakMap<BackupData, NoteAttachment[]>();
export async function createNotesBackup(data: BackupData): Promise<Uint8Array> {
  await flushNotes();
  await flushStorageData();
  const notes = getNotes();
  const attachments = await allAttachments(
    notes.flatMap((n) => attachmentIds(n.document)),
  );
  const manifest = {
    ...data,
    schemaVersion: 3,
    notes,
    attachments: attachments.map(({ blob, ...meta }) => meta),
  };
  const files: Record<string, Uint8Array> = {
    "data.json": strToU8(JSON.stringify(manifest)),
  };
  for (const a of attachments)
    files[`attachments/${a.id}`] = new Uint8Array(await a.blob.arrayBuffer());
  return zipSync(files, { level: 0 });
}
export async function parseNotesBackup(file: Blob): Promise<BackupData> {
  if (file.size > 200 * 1024 * 1024) throw new Error("备份文件请小于 200 MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let files: Record<string, Uint8Array> = {};
  const zipped = bytes[0] === 80 && bytes[1] === 75;
  if (zipped) {
    let total = 0;
    files = unzipSync(bytes, {
      filter: (entry) => {
        total += entry.originalSize;
        if (total > 200 * 1024 * 1024 || entry.originalSize > 50 * 1024 * 1024)
          throw new Error("备份解压后超过安全读取上限");
        if (
          entry.name !== "data.json" &&
          !/^attachments\/[a-f0-9]{64}$/.test(entry.name)
        )
          throw new Error("备份包含无效文件路径");
        return true;
      },
    });
    if (!files["data.json"]) throw new Error("备份缺少 data.json");
  }
  const data = JSON.parse(strFromU8(zipped ? files["data.json"] : bytes));
  const validation = validateBackupData(data);
  if (!validation.valid) throw new Error(validation.error);
  const attachments: NoteAttachment[] = [];
  if (data.schemaVersion === 3) {
    if (
      !Array.isArray(data.notes) ||
      !data.notes.every(validateNote) ||
      new Set(data.notes.map((n: Note) => n.id)).size !== data.notes.length
    )
      throw new Error("笔记内容格式无效");
    if (!Array.isArray(data.attachments)) throw new Error("图片清单格式无效");
    for (const meta of data.attachments) {
      const bytes = files[`attachments/${meta.id}`];
      if (
        !bytes ||
        bytes.length !== meta.size ||
        !["image/png", "image/jpeg", "image/webp"].includes(meta.mime) ||
        (await hashBytes(bytes.slice().buffer)) !== meta.id
      )
        throw new Error("备份图片缺失或校验失败");
      attachments.push({
        ...meta,
        blob: new Blob([bytes.slice().buffer], { type: meta.mime }),
      });
    }
    const ids = new Set(attachments.map((a) => a.id));
    if (
      data.notes.some((n: Note) =>
        attachmentIds(n.document).some((id) => !ids.has(id)),
      )
    )
      throw new Error("笔记引用的图片不在备份中");
  }
  prepared.set(data, attachments);
  return data;
}
export async function restoreNotesBackup(
  incoming: BackupData,
  current: StoredData,
  merge: boolean,
): Promise<StoredData> {
  const valid = validateBackupData(incoming);
  if (!valid.valid) throw new Error(valid.error);
  await flushNotes();
  await flushStorageData();
  const migrated = migrateStorageData(incoming);
  const combine = <T extends { id: string; updatedAt: string }>(
    a: T[],
    b: T[],
  ) => {
    const rows = new Map(a.map((x) => [x.id, x]));
    for (const x of b)
      if (!rows.has(x.id) || rows.get(x.id)!.updatedAt <= x.updatedAt)
        rows.set(x.id, x);
    return [...rows.values()];
  };
  const result: StoredData = {
    ...migrated,
    devices: current.devices,
    settings: { ...current.settings!, ...migrated.settings },
    tasks: merge ? combine(current.tasks, migrated.tasks) : migrated.tasks,
    projects: merge
      ? combine(current.projects, migrated.projects)
      : migrated.projects,
    reviews: merge
      ? combine(current.reviews, migrated.reviews)
      : migrated.reviews,
    notes: merge
      ? combine(getNotes(), migrated.notes || [])
      : migrated.notes || [],
  };
  const images = prepared.get(incoming) || [];
  const imageIds = new Set(images.map((a) => a.id));
  await allAttachments(
    result
      .notes!.flatMap((n) => attachmentIds(n.document))
      .filter((id) => !imageIds.has(id)),
  );
  // All entities and attachments commit together. Keep the previous state and its retained image objects.
  await transaction<void>(
    [
      "tasks",
      "projects",
      "reviews",
      "notes",
      "attachments",
      "settings",
      "meta",
      "syncMeta",
    ],
    "readwrite",
    (tx) => {
      tx.objectStore("meta").put({
        key: "before-import-v3",
        value: { ...current, notes: getNotes() },
        savedAt: new Date().toISOString(),
      });
      for (const kind of ["tasks", "projects", "reviews", "notes"] as const) {
        tx.objectStore(kind).clear();
        for (const row of result[kind] || []) tx.objectStore(kind).put(row);
      }
      for (const a of images) tx.objectStore("attachments").put(a);
      tx.objectStore("settings").put({
        key: "appSettings",
        value: result.settings,
      });
      tx.objectStore("meta").put({
        key: "snapshot",
        schemaVersion: 3,
        savedAt: new Date().toISOString(),
      });
      tx.objectStore("meta").put({ key: "notes-initialized", value: true });
      // An import changes the local generation; an eventual desktop adapter must negotiate a new baseline.
      tx.objectStore("syncMeta").clear();
      tx.objectStore("syncMeta").put({
        id: "baseline",
        requiresFullExchange: true,
        updatedAt: new Date().toISOString(),
      });
    },
  );
  try {
    localStorage.removeItem("jy_snapshot_v2");
  } catch {}
  await initializeNotes();
  return result;
}
