import React, { useMemo, useState, useSyncExternalStore } from "react";
import type { Note, Project, Task } from "../types/index.ts";
import { subscribeNotes, getNotes } from "../services/notesRepository.ts";
import { documentText, noteTime, sortNotes } from "../utils/notes.ts";
import { SegmentedControl } from "../components/SegmentedControl.tsx";
import { Icon } from "../components/NoteWorkspace.tsx";
import { useDialog } from "../hooks/useDialog.ts";
import { calculateReviewStats } from "../utils/taskLogic.ts";

export function NoteCard({
  note,
  project,
  onOpen,
}: {
  note: Note;
  project?: Project;
  onOpen: (note: Note) => void;
}) {
  return (
    <button className="note-card" onClick={() => onOpen(note)}>
      <div className="note-card-labels">
        <span>
          {note.pinned && "⌖ "}
          {note.kind === "review" ? "复盘" : "知识"}
        </span>
        {project && (
          <span className="note-card-project">
            <Icon name="folder_open" />
            {project.name}
          </span>
        )}
        {note.needsReview && <span className="note-sage">待复习</span>}
      </div>
      <h2>{note.title || "未命名笔记"}</h2>
      <p className="note-excerpt">
        {documentText(note.document).trim() || "图片笔记"}
      </p>
      <time>
        <Icon name="schedule" />
        {noteTime(note.updatedAt)}
      </time>
    </button>
  );
}
export function NotesView({
  projects,
  tasks,
  onOpen,
  onNew,
}: {
  projects: Project[];
  tasks: Task[];
  onOpen: (note: Note) => void;
  onNew: () => void;
}) {
  const notes = useSyncExternalStore(subscribeNotes, getNotes, getNotes);
  const [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [reviewOnly, setReviewOnly] = useState(false),
    [stats, setStats] = useState(false);
  const rows = useMemo(
    () =>
      sortNotes(
        notes.filter(
          (n) =>
            (filter === "all" || n.kind === filter) &&
            (!reviewOnly || n.needsReview) &&
            (!query ||
              `${n.title}\n${documentText(n.document)}\n${projects.find((p) => p.id === n.projectId)?.name || ""}`
                .toLocaleLowerCase()
                .includes(query.toLocaleLowerCase())),
        ),
      ),
    [notes, projects, filter, reviewOnly, query],
  );
  return (
    <div className="notes-home">
      <header className="notes-header">
        <div>
          <h1>笔记</h1>
          <p>留住所得，常看常新</p>
        </div>
        <button className="note-primary" onClick={onNew}>
          <Icon name="add" />
          新建笔记
        </button>
      </header>
      <label className="notes-search">
        <Icon name="search" />
        <input
          aria-label="搜索笔记"
          placeholder="搜索笔记、内容或项目"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button aria-label="清空笔记搜索" onClick={() => setQuery("")}>
            <Icon name="close" />
          </button>
        )}
      </label>
      <SegmentedControl
        activeId={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "全部", count: notes.length },
          {
            id: "knowledge",
            label: "知识",
            count: notes.filter((n) => n.kind === "knowledge").length,
          },
          {
            id: "review",
            label: "复盘",
            count: notes.filter((n) => n.kind === "review").length,
          },
        ]}
      />
      <div className="notes-secondary">
        <button
          aria-pressed={reviewOnly}
          className={reviewOnly ? "note-sage" : ""}
          onClick={() => setReviewOnly(!reviewOnly)}
        >
          <Icon name="school" />
          待复习 · {notes.filter((n) => n.needsReview).length}
        </button>
        <button onClick={() => setStats(true)}>
          复盘统计
          <Icon name="chevron_right" />
        </button>
      </div>
      <div className="notes-list">
        {rows.map((n) => (
          <NoteCard
            key={n.id}
            note={n}
            project={projects.find((p) => p.id === n.projectId)}
            onOpen={onOpen}
          />
        ))}
      </div>
      {!rows.length && (
        <div className="notes-empty">
          <Icon name="auto_stories" />
          <h2>
            {query || reviewOnly
              ? "没有符合条件的笔记"
              : "留住一个值得记住的想法"}
          </h2>
          <p>
            {query || reviewOnly
              ? "试试其他关键词或筛选条件"
              : "粘贴聊天总结，或者记录今天的心得。"}
          </p>
          {!query && !reviewOnly && (
            <button className="note-primary" onClick={onNew}>
              写第一篇笔记
            </button>
          )}
        </div>
      )}
      {stats && (
        <ReviewStatistics tasks={tasks} onClose={() => setStats(false)} />
      )}
    </div>
  );
}
function ReviewStatistics({
  tasks,
  onClose,
}: {
  tasks: Task[];
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  useDialog(true, onClose);
  const stats = calculateReviewStats(tasks, new Date(), period);
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label="复盘统计"
      className="note-screen note-statistics"
    >
      <header className="note-topbar glass-control">
        <button aria-label="关闭复盘统计" onClick={onClose}>
          <Icon name="arrow_back" />
        </button>
        <h1>复盘统计</h1>
      </header>
      <div className="note-statistics-content">
        <SegmentedControl
          activeId={period}
          onChange={(v) => setPeriod(v as "week" | "month")}
          options={[
            { id: "week", label: "本周" },
            { id: "month", label: "本月" },
          ]}
        />
        <div className="note-stat-grid">
          {[
            ["已完成", stats.completed],
            ["延期", stats.delayed],
            ["新增", stats.added],
          ].map(([label, value]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p>主要项目：{stats.topProject || "暂无"}</p>
        <p className="note-meta">根据已保存的任务时间计算。</p>
      </div>
    </section>
  );
}
