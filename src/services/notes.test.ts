import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, unzipSync, strFromU8, strToU8 } from "fflate";
import {
  newNote,
  reviewToNote,
  textDocument,
  documentText,
  attachmentIds,
} from "../utils/notes.ts";
import { migrateStorageData } from "./migration.ts";
import {
  initializeNotes,
  saveNote,
  getNotes,
  deleteNote,
  addAttachment,
  readAttachment,
  transaction,
} from "./notesRepository.ts";
import {
  createNotesBackup,
  parseNotesBackup,
  restoreNotesBackup,
} from "./notesBackup.ts";
import { syncRepository } from "./sync.ts";
import { initialReviews } from "../data/legacyDemoData.ts";
import { initialSettings } from "../data/initialData.ts";

Object.defineProperty(globalThis, "localStorage", {
  value: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  configurable: true,
});
const blank = {
  schemaVersion: 3,
  tasks: [],
  projects: [],
  reviews: [],
  devices: [],
  settings: initialSettings,
};

test("v3 review migration is lossless, idempotent and respects explicitly empty notes", () => {
  const old = { ...blank, schemaVersion: 2, reviews: initialReviews };
  const migrated = migrateStorageData(old);
  assert.equal(migrated.notes?.length, initialReviews.length);
  assert.deepEqual(migrated.notes?.[0].legacyReview, initialReviews[0]);
  assert.deepEqual(migrateStorageData(migrated), migrated);
  assert.deepEqual(migrateStorageData({ ...old, notes: [] }).notes, []);
  assert.ok(
    documentText(reviewToNote(initialReviews[0]).document).includes(
      initialReviews[0].content.split("\n")[0],
    ),
  );
});
test("notes persist, attachments deduplicate, archives round trip, corrupt imports preserve current data", async () => {
  await initializeNotes([]);
  const png = Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  const a = await addAttachment(new Blob([png], { type: "image/png" }));
  const b = await addAttachment(new Blob([png], { type: "image/png" }));
  assert.equal(a.id, b.id);
  assert.ok(await readAttachment(a.id));
  const note = {
    ...newNote(),
    title: "离线知识",
    document: textDocument("知识正文"),
  };
  note.document.content!.push({
    type: "image",
    attrs: { attachmentId: a.id, alt: "测试图" },
  });
  const saved = await saveNote(note);
  assert.equal(saved.revision, 1);
  await initializeNotes();
  assert.equal(getNotes()[0].title, "离线知识");
  const zip = await createNotesBackup({
    ...blank,
    exportedAt: new Date().toISOString(),
  });
  const imported = await parseNotesBackup(new Blob([zip.slice().buffer]));
  await deleteNote(saved.id);
  assert.equal(getNotes().length, 0);
  await restoreNotesBackup(imported, blank, false);
  assert.equal(getNotes()[0].title, "离线知识");
  assert.deepEqual(attachmentIds(getNotes()[0].document), [a.id]);
  const files = unzipSync(zip);
  files[`attachments/${a.id}`] = new Uint8Array([1, 2, 3]);
  await assert.rejects(
    parseNotesBackup(new Blob([zipSync(files).slice().buffer])),
    /校验失败/,
  );
  assert.equal(getNotes()[0].title, "离线知识");
  const current = getNotes()[0];
  const method = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function () {
    throw new DOMException("full", "QuotaExceededError");
  } as typeof method;
  try {
    await assert.rejects(saveNote({ ...current, title: "失败修改" }));
  } finally {
    IDBDatabase.prototype.transaction = method;
  }
  assert.equal(getNotes()[0].title, "离线知识");
  await assert.rejects(
    addAttachment(new Blob(["not a picture"], { type: "image/png" })),
    /格式/,
  );
});
test("legacy JSON remains importable and unsupported future schemas are rejected", async () => {
  const old = {
    ...blank,
    schemaVersion: 2,
    reviews: initialReviews,
    exportedAt: new Date().toISOString(),
  };
  const imported = await parseNotesBackup(new Blob([JSON.stringify(old)]));
  assert.equal(
    migrateStorageData(imported).notes?.length,
    initialReviews.length,
  );
  await assert.rejects(
    parseNotesBackup(
      new Blob([JSON.stringify({ ...old, schemaVersion: 999 })]),
    ),
    /不支持/,
  );
});
test("local sync contract exposes revisions, deletion markers and extension fields without settings", async () => {
  const saved = await saveNote({
    ...newNote(),
    title: "同步契约",
    extensions: { desktopOnly: { planDate: "2026-10-18" } },
  });
  const first = await syncRepository.exportChanges();
  assert.equal(syncRepository.validateIncoming(first).valid, true);
  const row = first.records.find((r) => r.entityId === saved.id)!;
  assert.equal("settings" in first, false);
  assert.deepEqual((row.value as any).extensions, saved.extensions);
  assert.equal(
    (
      await syncRepository.exportChanges({ [row.id]: row.revision })
    ).records.some((r) => r.entityId === saved.id),
    false,
  );
  await deleteNote(saved.id);
  const deleted = (await syncRepository.exportChanges()).records.find(
    (r) => r.entityId === saved.id,
  )!;
  assert.equal(deleted.deleted, true);
  assert.ok(deleted.revision > row.revision);
  const restored = await saveNote({
    ...saved,
    updatedAt: new Date().toISOString(),
  });
  assert.ok(restored.revision > deleted.revision);
  assert.equal(
    syncRepository.validateIncoming({ protocolVersion: 999, records: [] })
      .valid,
    false,
  );
  assert.equal(
    syncRepository.validateIncoming({
      ...first,
      records: [{ ...row, entityId: "wrong" }],
    }).valid,
    false,
  );
});
