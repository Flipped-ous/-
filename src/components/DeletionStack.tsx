import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useNavigationHidden } from '../hooks/useNavigationHidden.ts';

export interface DeletionReceipt { id: string; title: string; undo: () => Promise<void> | void }
export function DeletionStack({ entries, onRemove, onDismiss, onError }: {
  entries: DeletionReceipt[]; onRemove: (id: string) => void; onDismiss: () => void; onError: (message: string) => void;
}) {
  const current = entries[0];
  const [hover, setHover] = useState(false), [focus, setFocus] = useState(false), [busy, setBusy] = useState(false);
  const [background, setBackground] = useState(() => document.hidden);
  const lock = useRef(false);
  const dismiss = useRef(onDismiss); dismiss.current = onDismiss;
  const hidden = useNavigationHidden();
  const reduced = useReducedMotion();
  useEffect(() => { if (!current || hidden) { setHover(false); setFocus(false); } }, [!!current, hidden]);
  useEffect(() => { const update = () => setBackground(document.hidden); document.addEventListener('visibilitychange', update); return () => document.removeEventListener('visibilitychange', update); }, []);
  useEffect(() => {
    if (!current || hover || focus || busy || background || hidden) return;
    const timer = setTimeout(() => dismiss.current(), 3000);
    return () => clearTimeout(timer);
  }, [current?.id, entries.length, hover, focus, busy, background, hidden]);
  const undo = async () => {
    if (!current || lock.current) return;
    lock.current = true; setBusy(true);
    try { await current.undo(); onRemove(current.id); }
    catch (error) { onError((error as Error).message || '撤销失败，请重试'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <AnimatePresence>{current && !hidden && <motion.aside className="deletion-stack" role="status" aria-label="删除记录" initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : 5 }} transition={{ duration: reduced ? 0 : .16 }}
    onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} onFocusCapture={() => setFocus(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setFocus(false); }}>
    {entries.length > 2 && <span className="deletion-layer layer-back" aria-hidden="true" />}
    {entries.length > 1 && <span className="deletion-layer layer-middle" aria-hidden="true" />}
    <div className="deletion-front"><span className="material-symbols-outlined" aria-hidden="true">delete</span><div><strong>{entries.length > 1 ? `已删除 ${entries.length} 项` : '已删除'}</strong><small>{current.title}</small></div><button disabled={busy} aria-label={`撤销删除 ${current.title}`} onClick={() => void undo()}>{busy ? '恢复中' : '撤销'}</button><button disabled={busy} className="deletion-dismiss" aria-label="收起删除提示" onClick={onDismiss}>×</button></div>
  </motion.aside>}</AnimatePresence>;
}
