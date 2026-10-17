import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import type { Note, Project, Task } from "../types/index.ts";
import { getNotes, subscribeNotes } from "../services/notesRepository.ts";
import { sortNotes } from "../utils/notes.ts";
import { NoteCard } from "./NotesView.tsx";
import { Icon } from "../components/NoteWorkspace.tsx";
import { SegmentedControl } from "../components/SegmentedControl.tsx";
import { formatDueLabel } from "../utils/taskLogic.ts";

export function ProjectDetail({
  project,
  tasks,
  onClose,
  onNote,
  onNewNote,
  onTask,
  onToggle,
}: {
  project: Project;
  tasks: Task[];
  onClose: () => void;
  onNote: (n: Note) => void;
  onNewNote: () => void;
  onTask: (t: Task) => void;
  onToggle: (id: string) => void;
}) {
  const [tab, setTab] = useState("notes");
  const close = useRef(onClose);
  close.current = onClose;
  useLayoutEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const previous = main.inert;
    main.inert = true;
    return () => {
      main.inert = previous;
    };
  }, []);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const token = crypto.randomUUID();
    history.pushState({ ...history.state, subpageToken: token }, "");
    let popped = false;
    const pop = () => {
      if (history.state?.subpageToken === token) return;
      popped = true;
      close.current();
    };
    window.addEventListener("popstate", pop);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("popstate", pop);
      if (
        !popped &&
        history.state?.subpageToken === token &&
        !history.state?.dialogToken
      )
        history.back();
    };
  }, []);
  const all = useSyncExternalStore(subscribeNotes, getNotes),
    notes = sortNotes(all.filter((n) => n.projectId === project.id));
  const rows = tasks.filter(
      (t) => t.projectId === project.id || t.project === project.name,
    ),
    done = rows.filter((t) => t.status === "completed").length;
  return createPortal(
    <div className="project-detail">
      <header className="note-topbar glass-control">
        <button aria-label="返回项目列表" onClick={onClose}>
          <Icon name="arrow_back" />
        </button>
        <h1>{project.name}</h1>
      </header>
      <div className="project-detail-content">
        <section className="project-overview">
          <p>{project.description}</p>
          <div>
            <span>
              {done} / {rows.length} 项完成
            </span>
            <strong>
              {rows.length ? Math.round((done / rows.length) * 100) : 0}%
            </strong>
          </div>
          <progress value={done} max={rows.length || 1} />
        </section>
        <SegmentedControl
          activeId={tab}
          onChange={setTab}
          options={[
            { id: "tasks", label: "待办任务", count: rows.length },
            { id: "notes", label: "相关笔记", count: notes.length },
          ]}
        />
        {tab === "notes" ? (
          <>
            <div className="project-note-heading">
              <h2>相关笔记 · {notes.length} 篇</h2>
              <button className="note-primary" onClick={onNewNote}>
                <Icon name="add" />
                新建笔记
              </button>
            </div>
            <div className="notes-list">
              {notes.map((n) => (
                <NoteCard key={n.id} note={n} onOpen={onNote} />
              ))}
            </div>
            {!notes.length && (
              <p className="notes-empty">把这个项目的知识与心得记在这里。</p>
            )}
          </>
        ) : (
          <div className="project-task-list">
            {rows.map((t) => (
              <div key={t.id}>
                <button
                  aria-label={`${t.status === "completed" ? "取消完成" : "完成"} ${t.title}`}
                  onClick={() => onToggle(t.id)}
                >
                  <Icon
                    name={
                      t.status === "completed"
                        ? "check_box"
                        : "check_box_outline_blank"
                    }
                  />
                </button>
                <button onClick={() => onTask(t)}>
                  <strong>{t.title}</strong>
                  <small>{formatDueLabel(t)}</small>
                </button>
              </div>
            ))}
            {!rows.length && <p className="notes-empty">这个项目还没有任务</p>}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
