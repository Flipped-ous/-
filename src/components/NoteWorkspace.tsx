import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { EditorContent } from "@tiptap/react";
import { motion, AnimatePresence } from "motion/react";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import type { Note, Project } from "../types/index.ts";
import {
  getNotes,
  subscribeNotes,
  saveNote,
  deleteNote,
} from "../services/notesRepository.ts";
import { isEmptyNote, noteTime, reviewTemplate } from "../utils/notes.ts";
import { useDialog } from "../hooks/useDialog.ts";
import { useNavigationMotion } from "../motion/MotionProvider.tsx";
import { NoteContent, useNoteEditor } from "./NoteContent.tsx";
import { NativeAppearance } from "../services/native.ts";

export function Icon({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="material-symbols-outlined">
      {name}
    </span>
  );
}
export function NoteWorkspace({
  note: initial,
  editing: initialEditing,
  projects,
  onClose,
  onTask,
  onUndo,
}: {
  note: Note;
  editing: boolean;
  projects: Project[];
  onClose: () => void;
  onTask: (note: Note) => void;
  onUndo: (note: Note) => void;
}) {
  const rows = useSyncExternalStore(subscribeNotes, getNotes);
  const note = rows.find((n) => n.id === initial.id) || initial;
  const [editing, setEditing] = useState(initialEditing);
  const [preview, setPreview] = useState("");
  const [menu, setMenu] = useState(false);
  const [font, setFont] = useState(17);
  const [error, setError] = useState("");
  const config = useNavigationMotion();
  useDialog(true, onClose);
  useLayoutEffect(() => {
    const backgrounds = [
      ...document.querySelectorAll<HTMLElement>(".app-root,.project-detail"),
    ];
    const previous = backgrounds.map((el) => el.inert);
    backgrounds.forEach((el) => (el.inert = true));
    return () => backgrounds.forEach((el, i) => (el.inert = previous[i]));
  }, []);
  async function change(patch: Partial<Note>) {
    try {
      await saveNote({
        ...note,
        ...patch,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      setError(String((e as Error).message));
    }
  }
  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="笔记阅读"
      className="note-screen"
      initial={{ opacity: 0.65 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, pointerEvents: "none" }}
      transition={{ duration: config.durations.smallTransition ? 0.16 : 0 }}
    >
      <div inert={editing || !!preview} className="note-reader">
        <header className="note-topbar glass-control">
          <button aria-label="返回笔记列表" onClick={onClose}>
            <Icon name="arrow_back" />
          </button>
          <div className="note-top-actions">
            <button className="note-primary" onClick={() => setEditing(true)}>
              <Icon name="edit" />
              编辑
            </button>
            <button
              aria-label="笔记更多操作"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Icon name="more_horiz" />
            </button>
          </div>
        </header>
        {menu && (
          <div className="note-menu">
            <button
              onClick={() => {
                void change({ pinned: !note.pinned });
                setMenu(false);
              }}
            >
              {note.pinned ? "取消置顶" : "置顶笔记"}
            </button>
            <button
              onClick={() => {
                onTask(note);
                setMenu(false);
              }}
            >
              转为待办
            </button>
            <button
              className="note-danger"
              onClick={async () => {
                try {
                  await deleteNote(note.id);
                  onUndo(note);
                  onClose();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              删除笔记
            </button>
          </div>
        )}
        <article
          className="note-article"
          style={{ "--note-font": font + "px" } as React.CSSProperties}
        >
          <h1>{note.title || "未命名笔记"}</h1>
          <div className="note-meta">
            <span>{note.kind === "review" ? "复盘" : "知识"}</span>
            <time>{noteTime(note.updatedAt)}</time>
          </div>
          {note.projectId && (
            <p className="note-project-label">
              <Icon name="folder_open" />
              {projects.find((p) => p.id === note.projectId)?.name ||
                "原关联项目"}
            </p>
          )}
          {note.sourceUrl && (
            <a
              className="note-source"
              href={note.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              来源：GPT 聊天／参考资料 ↗
            </a>
          )}
          <div className="note-review-line">
            <span>
              {note.needsReview
                ? "待复习"
                : note.reviewedAt
                  ? "已复习 · " + noteTime(note.reviewedAt)
                  : "留待日后回看"}
            </span>
            <button
              onClick={() =>
                void change(
                  note.needsReview
                    ? {
                        needsReview: false,
                        reviewedAt: new Date().toISOString(),
                      }
                    : { needsReview: true },
                )
              }
            >
              {note.needsReview ? "标记已复习" : "标记待复习"}
            </button>
          </div>
          {error && (
            <p role="alert" className="note-error">
              {error}
            </p>
          )}
          <NoteContent document={note.document} onPreview={setPreview} />
          {note.legacyReview && (
            <details className="note-legacy">
              <summary>原复盘信息</summary>
              <p>
                {note.legacyReview.date} · {note.legacyReview.subDate} ·{" "}
                {note.legacyReview.moods.join("、")}
              </p>
              {note.legacyReview.stats && (
                <p>
                  完成 {note.legacyReview.stats.completed} · 延期{" "}
                  {note.legacyReview.stats.delayed} · 新增{" "}
                  {note.legacyReview.stats.added}
                </p>
              )}
            </details>
          )}
        </article>
        <div className="note-reading-tools glass-control">
          <button
            aria-label="减小正文字号"
            disabled={font <= 15}
            onClick={() => setFont((v) => v - 1)}
          >
            A−
          </button>
          <button
            aria-label="增大正文字号"
            disabled={font >= 23}
            onClick={() => setFont((v) => v + 1)}
          >
            A＋
          </button>
          <button onClick={() => setEditing(true)}>
            <Icon name="edit" />
            编辑
          </button>
        </div>
      </div>
      <AnimatePresence>
        {editing && (
          <NoteEditor
            key={note.id}
            note={note}
            projects={projects}
            onDone={(saved) => {
              setEditing(false);
              if (!saved) onClose();
            }}
          />
        )}
      </AnimatePresence>
      {preview && <ImagePreview src={preview} onClose={() => setPreview("")} />}
    </motion.div>,
    document.body,
  );
}
function ImagePreview({ src, onClose }: { src: string; onClose: () => void }) {
  useDialog(true, onClose);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="查看笔记图片"
      className="note-image-preview"
    >
      <button aria-label="关闭图片" onClick={onClose}>
        <Icon name="close" />
      </button>
      <img src={src} alt="笔记图片大图" />
    </div>
  );
}
function NoteEditor({
  note,
  projects,
  onDone,
}: {
  note: Note;
  projects: Project[];
  onDone: (saved: boolean) => void;
}) {
  const config = useNavigationMotion();
  const [draft, setDraft] = useState(note);
  const latest = useRef(draft);
  latest.current = draft;
  const [status, setStatus] = useState("已保存");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(!!note.sourceUrl);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dirty = useRef(false),
    serial = useRef<Promise<unknown>>(Promise.resolve()),
    alive = useRef(true);
  const generation = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const patch = useCallback((value: Partial<Note>) => {
    generation.current++;
    dirty.current = true;
    setStatus("保存中…");
    setDraft((d) => ({ ...d, ...value, updatedAt: new Date().toISOString() }));
  }, []);
  const persist = useCallback(async () => {
    clearTimeout(timer.current);
    const value = structuredClone(latest.current);
    if (
      !dirty.current ||
      (isEmptyNote(value) && !getNotes().some((n) => n.id === value.id))
    )
      return;
    const savedGeneration = generation.current;
    const previous = serial.current;
    const work = previous.catch(() => {}).then(() => saveNote(value));
    serial.current = work;
    try {
      const saved = await work;
      if (alive.current && generation.current === savedGeneration) {
        dirty.current = false;
        latest.current = { ...latest.current, revision: saved.revision };
        setStatus("已保存");
        setError("");
      }
    } catch (e) {
      if (alive.current) {
        setStatus("保存失败");
        setError((e as Error).message);
      }
      throw e;
    }
  }, []);
  async function done() {
    if (closing || uploading) return;
    setClosing(true);
    try {
      await persist();
      await serial.current;
      onDone(
        !isEmptyNote(latest.current) ||
          getNotes().some((n) => n.id === note.id),
      );
    } catch {
      setClosing(false);
    }
  }
  useDialog(true, () => void done());
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (dirty.current) {
      timer.current = setTimeout(() => void persist().catch(() => {}), 400);
    }
    return () => clearTimeout(timer.current);
  }, [draft, persist]);
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden") void persist().catch(() => {});
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    const native = Capacitor.isNativePlatform()
      ? NativeApp.addListener("appStateChange", ({ isActive }) => {
          if (!isActive) void persist().catch(() => {});
        })
      : null;
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
      void native?.then((x) => x.remove());
    };
  }, [persist]);
  const { editor, insertImages } = useNoteEditor(
    note.document,
    (document) => patch({ document }),
    setError,
    setUploading,
  );
  const [viewport, setViewport] = useState(() => ({
    height: window.visualViewport?.height || window.innerHeight,
    top: window.visualViewport?.offsetTop || 0,
  }));
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const listener = NativeAppearance.addListener(
        "keyboardVisibilityChange",
        ({ visible }) => setKeyboardOpen(visible),
      );
      return () => {
        void listener.then((x) => x.remove());
      };
    }
    const initial = window.innerHeight;
    const update = () =>
      setKeyboardOpen(
        initial - (window.visualViewport?.height || window.innerHeight) > 120,
      );
    window.visualViewport?.addEventListener("resize", update);
    return () => window.visualViewport?.removeEventListener("resize", update);
  }, []);
  useEffect(() => {
    const update = () =>
      setViewport({
        height: window.visualViewport?.height || window.innerHeight,
        top: window.visualViewport?.offsetTop || 0,
      });
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.isFocused)
      requestAnimationFrame(() => editor.commands.scrollIntoView());
  }, [viewport, editor]);
  const tool = (
    label: string,
    icon: string,
    command: () => void,
    active = false,
  ) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onPointerDown={(e) => e.preventDefault()}
      onClick={command}
    >
      <Icon name={icon} />
    </button>
  );
  return (
    <motion.section
      role="dialog"
      aria-modal="true"
      aria-label="编辑笔记"
      className="note-screen note-editor"
      style={
        {
          height: viewport.height,
          top: viewport.top,
          "--note-tool-bottom": keyboardOpen
            ? "6px"
            : "max(6px,var(--note-safe-bottom))",
        } as React.CSSProperties
      }
      initial={{ opacity: 0.65 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, pointerEvents: "none" }}
      transition={{ duration: config.durations.smallTransition ? 0.16 : 0 }}
    >
      <header className="note-topbar glass-control">
        <button
          aria-label="保存并返回"
          disabled={closing || uploading}
          onClick={() => void done()}
        >
          <Icon name="arrow_back" />
        </button>
        <span role="status">{uploading ? "图片保存中…" : status}</span>
        <button
          className="note-primary"
          disabled={closing || uploading}
          onClick={() => void done()}
        >
          {closing ? "保存中…" : "完成"}
        </button>
      </header>
      {error && (
        <div role="alert" className="note-error">
          {error}
          <button onClick={() => void persist().catch(() => {})}>
            重试保存
          </button>
        </div>
      )}
      <div className="note-editor-scroll">
        <div className="note-editor-meta">
          <label>
            <Icon name="folder_open" />
            <select
              aria-label="关联项目"
              value={draft.projectId || ""}
              onChange={(e) =>
                patch({ projectId: e.target.value || undefined })
              }
            >
              <option value="">不关联项目</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => setSourceOpen(!sourceOpen)}>
            <Icon name="link" />
            来源链接
          </button>
          <button
            onClick={() => {
              if (!window.confirm("将复盘模板追加到正文末尾？现有内容会保留。"))
                return;
              editor
                ?.chain()
                .focus("end")
                .insertContent(reviewTemplate.content!)
                .run();
              patch({ kind: "review" });
            }}
          >
            复盘模板
          </button>
          <label className="note-kind">
            类型
            <select
              aria-label="笔记类型"
              value={draft.kind}
              onChange={(e) => patch({ kind: e.target.value as Note["kind"] })}
            >
              <option value="knowledge">知识</option>
              <option value="review">复盘</option>
            </select>
          </label>
        </div>
        {sourceOpen && (
          <input
            className="note-source-input"
            aria-label="来源链接"
            type="url"
            placeholder="https://chatgpt.com/…"
            value={draft.sourceUrl || ""}
            onChange={(e) => patch({ sourceUrl: e.target.value })}
          />
        )}
        <textarea
          className="note-title-input"
          aria-label="笔记标题"
          rows={2}
          placeholder="给这篇笔记起个名字"
          value={draft.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
        <EditorContent editor={editor} />
      </div>
      <div
        className="note-format-tools glass-control"
        role="toolbar"
        aria-label="正文格式工具"
      >
        {tool(
          "二级标题",
          "title",
          () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
          editor?.isActive("heading"),
        )}
        {tool(
          "加粗",
          "format_bold",
          () => editor?.chain().focus().toggleBold().run(),
          editor?.isActive("bold"),
        )}
        {tool(
          "无序列表",
          "format_list_bulleted",
          () => editor?.chain().focus().toggleBulletList().run(),
          editor?.isActive("bulletList"),
        )}
        {tool(
          "引用",
          "format_quote",
          () => editor?.chain().focus().toggleBlockquote().run(),
          editor?.isActive("blockquote"),
        )}
        {tool(
          "代码块",
          "code",
          () => editor?.chain().focus().toggleCodeBlock().run(),
          editor?.isActive("codeBlock"),
        )}
        {tool("添加图片", "add_photo_alternate", () => input.current?.click())}
        {tool("撤销", "undo", () => editor?.chain().focus().undo().run())}
        {tool("重做", "redo", () => editor?.chain().focus().redo().run())}
      </div>
      <input
        hidden
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = "";
          if (files.length) void insertImages(files);
        }}
      />
    </motion.section>
  );
}
