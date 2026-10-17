import type { Note, NoteDocument, ReviewEntry } from "../types/index.ts";

export const emptyDocument = (): NoteDocument => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});
export function textDocument(text: string): NoteDocument {
  return {
    type: "doc",
    content: text
      .split("\n")
      .map((line) => ({
        type: "paragraph",
        ...(line ? { content: [{ type: "text", text: line }] } : {}),
      })),
  };
}
export function documentText(node: NoteDocument): string {
  if (node.type === "text") return node.text || "";
  if (node.type === "image")
    return node.attrs?.alt ? String(node.attrs.alt) : "";
  return (node.content || [])
    .map(documentText)
    .join(
      ["doc", "bulletList", "orderedList", "table", "tableRow"].includes(
        node.type,
      )
        ? "\n"
        : "",
    );
}
export function attachmentIds(doc: NoteDocument): string[] {
  const ids = new Set<string>();
  const walk = (n: NoteDocument) => {
    if (n.type === "image" && typeof n.attrs?.attachmentId === "string")
      ids.add(n.attrs.attachmentId);
    n.content?.forEach(walk);
  };
  walk(doc);
  return [...ids];
}
export function isEmptyNote(note: Note) {
  return (
    !note.title.trim() &&
    !documentText(note.document).trim() &&
    !attachmentIds(note.document).length &&
    !JSON.stringify(note.document).includes('"type":"image"')
  );
}
export function reviewToNote(review: ReviewEntry): Note {
  const document = textDocument(review.content);
  if (review.imageUrl)
    document.content!.push({
      type: "image",
      attrs: { src: review.imageUrl, alt: review.imageCaption || "复盘图片" },
    });
  return {
    id: `review-${review.id}`,
    kind: "review",
    title: review.title,
    document,
    pinned: false,
    needsReview: false,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    revision: 1,
    legacyReview: review,
  };
}
export function newNote(projectId?: string): Note {
  const stamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    kind: "knowledge",
    title: "",
    document: emptyDocument(),
    projectId,
    pinned: false,
    needsReview: false,
    revision: 0,
    createdAt: stamp,
    updatedAt: stamp,
  };
}
export const reviewTemplate = textDocument(
  "今天完成了什么\n\n遇到的问题\n\n获得的经验\n\n下一步\n",
);
export function sortNotes(notes: Note[]) {
  return [...notes].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      b.updatedAt.localeCompare(a.updatedAt),
  );
}
export function noteTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
const nodes = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "hardBreak",
  "horizontalRule",
  "image",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
]);
export function validateDocument(doc: unknown, depth = 0): doc is NoteDocument {
  if (!doc || typeof doc !== "object" || depth > 60) return false;
  const n = doc as NoteDocument;
  if (
    !nodes.has(n.type) ||
    (n.text !== undefined && typeof n.text !== "string")
  )
    return false;
  if (n.type === "image") {
    const a = n.attrs;
    if (
      !a ||
      !(
        (typeof a.attachmentId === "string" &&
          /^[a-f0-9]{64}$/.test(a.attachmentId)) ||
        (typeof a.src === "string" && /^https?:\/\//i.test(a.src))
      )
    )
      return false;
  }
  if (
    n.marks &&
    (!Array.isArray(n.marks) ||
      n.marks.some(
        (m) =>
          !["bold", "italic", "strike", "underline", "code", "link"].includes(
            m.type,
          ) ||
          (m.type === "link" &&
            !/^(https?:|mailto:)/i.test(String(m.attrs?.href || ""))),
      ))
  )
    return false;
  return (
    n.content === undefined ||
    (Array.isArray(n.content) &&
      n.content.every((c) => validateDocument(c, depth + 1)))
  );
}
export function validateNote(n: any): n is Note {
  return (
    n &&
    typeof n.id === "string" &&
    !!n.id &&
    typeof n.title === "string" &&
    ["knowledge", "review"].includes(n.kind) &&
    n.document?.type === "doc" &&
    validateDocument(n.document) &&
    typeof n.pinned === "boolean" &&
    typeof n.needsReview === "boolean" &&
    [n.createdAt, n.updatedAt].every(
      (t) => typeof t === "string" && Number.isFinite(Date.parse(t)),
    ) &&
    (n.projectId === undefined || typeof n.projectId === "string") &&
    (n.sourceUrl === undefined ||
      !n.sourceUrl ||
      /^https?:\/\//i.test(n.sourceUrl)) &&
    Number.isSafeInteger(n.revision) &&
    n.revision >= 0
  );
}
