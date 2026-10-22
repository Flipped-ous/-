import type { Project } from '../types/index.ts';
export function sortProjects(projects: Project[]) {
  return projects.map((project, index) => ({ project, index })).sort((a, b) =>
    (Number.isFinite(a.project.order) ? a.project.order! : a.index) - (Number.isFinite(b.project.order) ? b.project.order! : b.index) || a.index - b.index
  ).map(row => row.project);
}
export function moveProject(projects: Project[], id: string, targetId: string, after: boolean, stamp: string) {
  const rows = sortProjects(projects), from = rows.findIndex(p => p.id === id);
  if (id === targetId || from < 0 || !rows.some(p => p.id === targetId)) return rows;
  const [project] = rows.splice(from, 1);
  rows.splice(rows.findIndex(p => p.id === targetId) + Number(after), 0, project);
  return rows.map((p, order) => p.order === order ? p : { ...p, order, updatedAt: stamp });
}
