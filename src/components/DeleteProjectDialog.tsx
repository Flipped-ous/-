import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Project } from '../types/index.ts';
import { useDialog } from '../hooks/useDialog.ts';
export function DeleteProjectDialog({ project, taskCount, noteCount, onClose, onConfirm }: { project: Project; taskCount: number; noteCount: number; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  useDialog(true, () => { if (!lock.current) onClose(); }, '[data-cancel-project]');
  return createPortal(<div className="project-delete-backdrop"><section role="dialog" aria-modal="true" aria-label="删除项目" className="project-delete-dialog" aria-busy={busy}>
    <h2>删除这个项目？</h2><strong className="project-delete-name">{project.name}</strong>
    <p>{taskCount} 项任务和 {noteCount} 篇笔记会保留，解除项目归属。删除后可在提示中撤销。</p>
    {error && <p className="agenda-error" role="alert">{error}</p>}
    <footer><button type="button" data-cancel-project disabled={busy} onClick={onClose}>取消</button><button type="button" className="agenda-primary" disabled={busy} onClick={async () => { if (lock.current) return; lock.current = true; setBusy(true); setError(''); try { await onConfirm(); } catch (e) { setError((e as Error).message); } finally { lock.current = false; setBusy(false); } }}>{busy ? '正在删除…' : '删除项目'}</button></footer>
  </section></div>, document.body);
}
