import type { Note, Project, Task } from '../types/index.ts';

export function belongsToProject(task: Task, project: Project) {
  return task.projectId ? task.projectId === project.id : task.project === project.name;
}
export interface ProjectDeletion {
  project: Project;
  index: number;
  tasks: { before: Task; after: Task }[];
  notes: { before: Note; after: Note }[];
}
export function detachProject(projects: Project[], tasks: Task[], notes: Note[], id: string, stamp: string) {
  const index = projects.findIndex(project => project.id === id);
  if (index < 0) throw new Error('项目已经删除');
  const project = projects[index];
  const duplicateName = projects.some(p => p.id !== id && p.name === project.name);
  const undo: ProjectDeletion = { project, index, tasks: [], notes: [] };
  const nextTasks = tasks.map(task => {
    if (task.projectId !== id && (task.projectId || duplicateName || task.project !== project.name)) return task;
    const after = { ...task, projectId: undefined, project: '', updatedAt: stamp };
    undo.tasks.push({ before: task, after }); return after;
  });
  const nextNotes = notes.map(note => {
    if (note.projectId !== id) return note;
    const after = { ...note, projectId: undefined, updatedAt: stamp };
    undo.notes.push({ before: note, after }); return after;
  });
  return { projects: projects.filter(p => p.id !== id), tasks: nextTasks, notes: nextNotes, undo };
}
export function restoreProject(projects: Project[], tasks: Task[], notes: Note[], undo: ProjectDeletion, stamp: string) {
  if (projects.some(project => project.id === undo.project.id)) throw new Error('项目已存在，无需重复撤销');
  const nextProjects = [...projects];
  nextProjects.splice(Math.min(undo.index, nextProjects.length), 0, { ...undo.project, updatedAt: stamp });
  const links = new Map(undo.tasks.map(link => [link.before.id, link]));
  const noteLinks = new Map(undo.notes.map(link => [link.before.id, link]));
  let skipped = undo.tasks.filter(link => !tasks.some(t => t.id === link.before.id)).length + undo.notes.filter(link => !notes.some(n => n.id === link.before.id)).length;
  const nextTasks = tasks.map(task => {
    const link = links.get(task.id);
    if (!link) return task;
    if (JSON.stringify(task) !== JSON.stringify(link.after)) { skipped++; return task; }
    return { ...task, projectId: link.before.projectId, project: link.before.project, updatedAt: stamp };
  });
  const nextNotes = notes.map(note => {
    const link = noteLinks.get(note.id);
    if (!link) return note;
    if (JSON.stringify(note) !== JSON.stringify(link.after)) { skipped++; return note; }
    return { ...note, projectId: link.before.projectId, updatedAt: stamp };
  });
  return { projects: nextProjects, tasks: nextTasks, notes: nextNotes, skipped };
}
