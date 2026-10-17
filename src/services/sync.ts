import type { Task, Project, Note, NoteAttachment } from "../types/index.ts";
import { transaction, readAttachment, getNotes } from "./notesRepository.ts";
import { validateNote } from "../utils/notes.ts";

export type SyncEntity = "tasks" | "projects" | "notes";
export interface SyncRecord {
  id: string;
  entity: SyncEntity;
  entityId: string;
  revision: number;
  updatedAt: string;
  deleted: boolean;
  value?: Task | Project | Note;
  extensions?: Record<string, unknown>;
}
export interface SyncExchange {
  protocolVersion: 1;
  capabilities: string[];
  records: SyncRecord[];
  requiresFullExchange: boolean;
}
export interface SyncTransport {
  connect(peer: { address: string; pairingToken: string }): Promise<void>;
  exchange(data: SyncExchange): Promise<SyncExchange>;
  readAttachment(id: string): Promise<NoteAttachment>;
  disconnect(): Promise<void>;
}
export interface SyncRepository {
  readEntities(): Promise<{
    tasks: Task[];
    projects: Project[];
    notes: Note[];
  }>;
  exportChanges(knownRevisions?: Record<string, number>): Promise<SyncExchange>;
  readAttachment(id: string): Promise<NoteAttachment | undefined>;
  validateIncoming(data: unknown): { valid: boolean; error?: string };
}
export const syncRepository: SyncRepository = {
  async readEntities() {
    return transaction(
      ["tasks", "projects", "notes"],
      "readonly",
      (tx, result) => {
        const rows: any = {};
        let count = 0;
        for (const kind of ["tasks", "projects", "notes"])
          tx.objectStore(kind).getAll().onsuccess = (e) => {
            rows[kind] = (e.target as IDBRequest).result;
            if (++count === 3) result(rows);
          };
      },
    );
  },
  async exportChanges(known = {}) {
    const entries = await transaction<any[]>(
      ["syncMeta"],
      "readonly",
      (tx, result) => {
        tx.objectStore("syncMeta").getAll().onsuccess = (e) =>
          result((e.target as IDBRequest).result);
      },
    );
    return {
      protocolVersion: 1,
      capabilities: [
        "tasks",
        "projects",
        "notes",
        "image-sha256",
        "tombstones",
        "extensions",
      ],
      requiresFullExchange: entries.some((x) => x.requiresFullExchange),
      records: entries.filter(
        (x) =>
          ["tasks", "projects", "notes"].includes(x.entity) &&
          x.revision > (known[x.id] || 0),
      ),
    };
  },
  readAttachment,
  validateIncoming(data: any) {
    const fail = (error: string) => ({ valid: false, error });
    if (
      !data ||
      data.protocolVersion !== 1 ||
      !Array.isArray(data.records) ||
      !Array.isArray(data.capabilities)
    )
      return fail("不支持的同步协议");
    for (const row of data.records) {
      if (
        !["tasks", "projects", "notes"].includes(row.entity) ||
        typeof row.entityId !== "string" ||
        row.id !== `${row.entity}:${row.entityId}` ||
        !Number.isSafeInteger(row.revision) ||
        row.revision < 1 ||
        typeof row.deleted !== "boolean" ||
        !Number.isFinite(Date.parse(row.updatedAt))
      )
        return fail("同步记录无效");
      if (!row.deleted && (!row.value || row.value.id !== row.entityId))
        return fail("同步实体标识不一致");
      if (!row.deleted && row.entity === "notes" && !validateNote(row.value))
        return fail("同步笔记格式无效");
      if (
        !row.deleted &&
        row.entity === "tasks" &&
        (typeof row.value.title !== "string" ||
          !["pending", "completed"].includes(row.value.status))
      )
        return fail("同步任务格式无效");
      if (
        !row.deleted &&
        row.entity === "projects" &&
        (typeof row.value.name !== "string" ||
          !["active", "paused", "archived"].includes(row.value.status))
      )
        return fail("同步项目格式无效");
    }
    return { valid: true };
  },
};
// No transport or remote-apply is supplied until the office desktop's field mapping and conflict rules are confirmed.
export const syncStatus = {
  available: false,
  message: "电脑同步尚未接入",
} as const;
