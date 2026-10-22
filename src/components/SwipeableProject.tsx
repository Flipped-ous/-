import { projectDragLayout, type ProjectSlot } from '../utils/projectDrag.ts';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';

/** Horizontal reveal and long-press ordering share one gesture owner. */
export function SwipeableProject({ id, name, open, onOpenChange, onDelete, onReorder, shift = 0, sortActive = false, onSortStart, onSortPreview, onSortEnd, children }: {
  id: string; name: string; open: boolean; onOpenChange: (open: boolean) => void;
  onDelete?: () => void; onReorder?: (id: string, target: string, after: boolean) => void | Promise<void>;
  shift?: number; sortActive?: boolean; onSortStart?: (id: string) => void;
  onSortPreview?: (shifts: Record<string,number>) => void; onSortEnd?: () => void;
  children: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null), action = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0), y = useMotionValue(0), peerY = useMotionValue(0), reduced = useReducedMotion();
  const revealOpacity = useTransform(x, [-84, -12, 0], [1, 1, 0]);
  const animation = useRef<ReturnType<typeof animate> | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointer = useRef<number | null>(null), mode = useRef<'idle' | 'swipe' | 'scroll' | 'reorder'>('idle');
  const slots = useRef<ProjectSlot[]>([]), originScroll = useRef(0), lastPoint = useRef(0), frame = useRef(0), lastPreview = useRef(''), settling = useRef(false), alive = useRef(true);
  const start = useRef({ x: 0, y: 0, offset: 0 }), suppress = useRef(false);
  const [dragging, setDragging] = useState(false), [target, setTarget] = useState('');
  const latest = useRef({ onOpenChange, onReorder, onSortStart, onSortPreview, onSortEnd }); latest.current = { onOpenChange, onReorder, onSortStart, onSortPreview, onSortEnd };
  const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  const move = (value: number) => {
    animation.current?.stop();
    animation.current = animate(x, value, { duration: reduced ? 0 : .18, ease: [.22, 1, .36, 1] });
  };
  const settle = (next: boolean) => { move(next ? -84 : 0); latest.current.onOpenChange(next); };
  const neighbors = () => [...(root.current?.parentElement?.querySelectorAll<HTMLElement>('[data-project-id]') || [])];
  useLayoutEffect(() => {
    if (!sortActive) { peerY.set(0); return; }
    const animation=animate(peerY,shift,{duration:reduced?0:.16,ease:[.22,1,.36,1]});
    return ()=>animation.stop();
  },[shift,sortActive,reduced]);
  const updateDrag = () => {
    const dy=lastPoint.current-start.current.y+window.scrollY-originScroll.current;
    y.set(dy);
    const layout=projectDragLayout(slots.current,id,dy),key=JSON.stringify(layout.shifts);
    if(key!==lastPreview.current) {lastPreview.current=key;latest.current.onSortPreview?.(layout.shifts);}
  };
  const beginSort = () => {
    if(pointer.current===null || mode.current!=='idle') return;
    slots.current=neighbors().map(node=>({id:node.dataset.projectId!,top:node.getBoundingClientRect().top+window.scrollY,height:node.offsetHeight}));
    originScroll.current=window.scrollY;lastPreview.current='';mode.current='reorder';
    root.current?.setPointerCapture(pointer.current);setDragging(true);settle(false);latest.current.onSortStart?.(id);
    const tick=()=>{
      if(mode.current!=='reorder') return;
      const dy=lastPoint.current>innerHeight-105 ? Math.min(8,(lastPoint.current-innerHeight+105)/7) : lastPoint.current<70 ? -Math.min(8,(70-lastPoint.current)/7) : 0;
      if(dy) {window.scrollBy(0,dy);updateDrag();}
      frame.current=requestAnimationFrame(tick);
    };
    frame.current=requestAnimationFrame(tick);
  };
  useEffect(() => { move(open ? -84 : 0); return () => animation.current?.stop(); }, [open, reduced]);
  useEffect(() => {
    alive.current=true;
    const node = root.current;
    const prevent = (event: TouchEvent) => { if (mode.current === 'reorder' || mode.current === 'swipe') event.preventDefault(); };
    node?.addEventListener('touchmove', prevent, { passive: false });
    return () => { alive.current=false;cancelAnimationFrame(frame.current);clear(); node?.removeEventListener('touchmove', prevent); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) latest.current.onOpenChange(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const finish = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== event.pointerId) return;
    const previous = mode.current, cancelled = event.type !== 'pointerup';
    clear(); pointer.current = null; mode.current = 'idle'; suppress.current = cancelled || previous !== 'idle';
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (previous === 'reorder') {
      cancelAnimationFrame(frame.current);
      const dy=event.clientY-start.current.y+window.scrollY-originScroll.current;
      const layout=projectDragLayout(slots.current,id,dy);
      const next=!cancelled && Math.abs(dy)>8 ? layout.target : null;
      settling.current=true;
      if(!next) latest.current.onSortPreview?.({});
      void (async()=>{
        await animate(y,next?layout.top:0,{duration:reduced?0:.16,ease:[.22,1,.36,1]});
        if(!alive.current) return;
        try { if(next) await latest.current.onReorder?.(id,next.id,next.after); }
        finally { if(alive.current) {y.set(0);setDragging(false);setTarget('');settling.current=false;latest.current.onSortEnd?.();} }
      })();
    } else if (previous === 'swipe') settle(!cancelled && x.get() < -36);
  };
  return <motion.div ref={root} style={{y:peerY}} onContextMenu={event=>event.preventDefault()} className="project-swipe" data-project-id={id} data-open={open} data-reordering={dragging || undefined}
    onKeyDownCapture={event => {
      if (event.key === 'Escape' && open) { event.preventDefault(); settle(false); return; }
      if (!(event.target as HTMLElement).hasAttribute('data-project-swipe-handle')) return;
      if (onDelete && ['ArrowLeft', 'Delete'].includes(event.key)) { event.preventDefault(); settle(true); requestAnimationFrame(() => action.current?.focus()); }
      if (onReorder && event.altKey && ['ArrowUp','ArrowDown'].includes(event.key)) {
        event.preventDefault(); const rows=neighbors(), index=rows.findIndex(node=>node.dataset.projectId===id), down=event.key==='ArrowDown', next=rows[index+(down?1:-1)];
        if (next) onReorder(id,next.dataset.projectId!,down);
      }
    }}
    onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0 || pointer.current !== null || settling.current || !(event.target as HTMLElement).closest('[data-project-swipe-handle]')) return;
      suppress.current=false; pointer.current=event.pointerId; mode.current='idle'; start.current={ x:event.clientX,y:event.clientY,offset:x.get() };lastPoint.current=event.clientY;
      if (onReorder && !open) timer.current=setTimeout(beginSort,240);
    }}
    onPointerMove={event => {
      if(pointer.current!==event.pointerId) return;
      const dx=event.clientX-start.current.x,dy=event.clientY-start.current.y;lastPoint.current=event.clientY;
      if(mode.current==='idle' && event.pointerType==='mouse' && onReorder && !open && Math.abs(dy)>8 && Math.abs(dy)>Math.abs(dx)*1.15) {clear();beginSort();}
      if(mode.current==='idle' && Math.hypot(dx,dy)>8) { clear(); mode.current=Math.abs(dx)>Math.abs(dy)*1.15?'swipe':'scroll'; }
      if(mode.current==='swipe' && onDelete) { event.currentTarget.setPointerCapture(event.pointerId); animation.current?.stop(); x.set(Math.max(-84,Math.min(0,start.current.offset+dx))); }
      if(mode.current==='reorder') updateDrag();
    }} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}
    onClickCapture={event => { if((event.target as HTMLElement).closest('.project-swipe-delete')) return; if(suppress.current || open) {event.preventDefault();event.stopPropagation();suppress.current=false;if(open)settle(false);} }}>
    {onDelete && <motion.button ref={action} type="button" className="project-swipe-delete" style={{ opacity:revealOpacity,pointerEvents:open?'auto':'none' }} aria-label={`删除项目 ${name}`} aria-hidden={!open} tabIndex={open?0:-1} onClick={()=>{settle(false);onDelete();}}><span className="material-symbols-outlined" aria-hidden="true">delete</span><span>删除</span></motion.button>}
    <motion.div className="project-swipe-surface" style={{x,y,touchAction:'pan-y'}}>{children}</motion.div>
    {dragging && <motion.span style={{y}} className="project-order-hint" role="status">拖动排序 · {target || '松手放下'}</motion.span>}
  </motion.div>;
}
