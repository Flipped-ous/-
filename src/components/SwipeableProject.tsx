import React, { useEffect, useRef } from 'react';
import { animate, motion, useDragControls, useMotionValue, useReducedMotion, useTransform } from 'motion/react';

/** Reveal an action; dragging alone never deletes or opens the project. */
export function SwipeableProject({ name, open, onOpenChange, onDelete, children }: {
  name: string; open: boolean; onOpenChange: (open: boolean) => void;
  onDelete?: () => void; children: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null), action = useRef<HTMLButtonElement>(null);
  const controls = useDragControls(), x = useMotionValue(0), reduced = useReducedMotion();
  const revealOpacity = useTransform(x, [-84, -12, 0], [1, 1, 0]);
  const dragged = useRef(false), animation = useRef<ReturnType<typeof animate> | null>(null);
  const change = useRef(onOpenChange); change.current = onOpenChange;
  const move = (value: number) => {
    animation.current?.stop();
    animation.current = animate(x, value, { duration: reduced ? 0 : .18, ease: [.22, 1, .36, 1] });
  };
  useEffect(() => { move(open ? -84 : 0); return () => animation.current?.stop(); }, [open, reduced]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) change.current(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const settle = (next: boolean) => { move(next ? -84 : 0); onOpenChange(next); };
  return <div ref={root} className="project-swipe" data-open={open}
    onKeyDownCapture={event => {
      if (event.key === 'Escape' && open) { event.preventDefault(); settle(false); }
      if (onDelete && (event.target as HTMLElement).hasAttribute('data-project-swipe-handle') && ['ArrowLeft', 'Delete'].includes(event.key)) {
        event.preventDefault(); settle(true); requestAnimationFrame(() => action.current?.focus());
      }
    }}>
    {onDelete && <motion.button ref={action} type="button" className="project-swipe-delete" style={{ opacity: revealOpacity, pointerEvents: open ? 'auto' : 'none' }}
      aria-label={`删除项目 ${name}`} aria-hidden={!open} tabIndex={open ? 0 : -1}
      onClick={() => { settle(false); onDelete(); }}>
      <span className="material-symbols-outlined" aria-hidden="true">delete</span><span>删除</span>
    </motion.button>}
    <motion.div className="project-swipe-surface" style={{ x, touchAction: 'pan-y' }} drag={onDelete ? 'x' : false} dragControls={controls} dragListener={false} dragConstraints={{ left: -84, right: 0 }} dragElastic={0} dragMomentum={false}
      onPointerDownCapture={event => {
        if (!event.isPrimary || event.button !== 0) return;
        dragged.current = false;
        if (onDelete && (event.target as HTMLElement).closest('[data-project-swipe-handle]')) {
          animation.current?.stop(); controls.start(event);
        }
      }}
      onDrag={(_, info) => { if (Math.abs(info.offset.x) > 8) dragged.current = true; }}
      onDragEnd={() => settle(x.get() < -36)}
      onPointerCancel={() => { controls.stop(); settle(false); }}
      onClickCapture={event => {
        const wasDragged = dragged.current && event.detail !== 0;
        dragged.current = false;
        if (wasDragged || open) { event.preventDefault(); event.stopPropagation(); if (!wasDragged && open) settle(false); }
      }}>
      {children}
    </motion.div>
  </div>;
}
