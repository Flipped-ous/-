import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from 'react';
import { magneticOffset, paperEase } from '../motion/physics.ts';
import { motion } from 'motion/react';
import type { Task, DueCategory } from '../types/index.ts';
import { useMotion } from '../motion/MotionProvider.tsx';
import {
  gestureIntent,
  releaseAction,
  type GestureIntent,
} from '../utils/gesture.ts';
import { formatDueLabel, getDueCategory } from '../utils/taskLogic.ts';

interface SwipeableTaskItemProps {
  task: Task;
  index: number;
  group?: string;
  isLast?: boolean;
  variant?: 'card' | 'row';
  showDetails?: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onEdit?: (task: Task) => void;
  onReorder?: (id: string, targetId: string, category?: DueCategory) => void;
}
export const SwipeableTaskItem: React.FC<SwipeableTaskItemProps> = ({
  task,
  index,
  group = 'tasks',
  isLast = false,
  variant = 'row',
  showDetails = false,
  onToggle,
  onDelete,
  onEdit,
  onReorder,
}) => {
  const config = useMotion();
  const [offsetX, setOffsetX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isSnappingBack, setIsSnappingBack] = useState(false);
  const [isCompletingLocally, setIsCompletingLocally] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const intent = useRef<GestureIntent>('idle');
  const start = useRef({ x: 0, y: 0, time: 0, grab: 0 });
  const point = useRef({ x: 0, y: 0 });
  const pointer = useRef<number | null>(null);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thresholdCrossed = useRef(false);
  const lastHover = useRef('');
  const magneticTarget = useRef<HTMLElement | null>(null);
  const [magnet, setMagnet] = useState({ x: 0, y: 0 });
  const busy = useRef(false);
  const clearMagnet = () => {
    if (magneticTarget.current) delete magneticTarget.current.dataset.magnetic;
    magneticTarget.current = null;
    setMagnet({ x: 0, y: 0 });
  };
  const mounted = useRef(true);
  const callbacks = useRef({
    task,
    onToggle,
    onDelete,
    onEdit,
    onReorder,
    group,
  });
  callbacks.current = { task, onToggle, onDelete, onEdit, onReorder, group };
  const isCompleted = task.status === 'completed';
  const category = getDueCategory(task);
  const badgeLabel = ['逾期', '今天', '本周六', '随时', '已完结'].includes(
    task.badgeLabel || '',
  )
    ? isCompleted
      ? '已完结'
      : category === 'overdue'
        ? '逾期'
        : category === 'none'
          ? '随时'
          : undefined
    : task.badgeLabel;
  const isEffectivelyCompleted = isCompleted || isCompletingLocally;
  const triggerHaptic = useCallback(
    (duration = 15) => {
      if (
        config.durations.tapFeedback &&
        typeof navigator !== 'undefined' &&
        navigator.vibrate
      )
        navigator.vibrate(duration);
    },
    [config],
  );
  const clearLongPress = () => {
    if (longPress.current) clearTimeout(longPress.current);
    longPress.current = null;
  };

  useEffect(() => {
    mounted.current = true;
    const preventScroll = (event: TouchEvent) => {
      if (intent.current === 'reorder' || intent.current === 'horizontal')
        event.preventDefault();
    };
    const node = containerRef.current;
    node?.addEventListener('touchmove', preventScroll, { passive: false });
    return () => {
      mounted.current = false;
      clearLongPress();
      if (magneticTarget.current)
        delete magneticTarget.current.dataset.magnetic;
      node?.removeEventListener('touchmove', preventScroll);
    };
  }, []);
  useLayoutEffect(() => {
    if (intent.current === 'reorder' && containerRef.current) {
      const next =
        point.current.y -
        containerRef.current.getBoundingClientRect().top -
        start.current.grab;
      if (Math.abs(next - dragY) > 0.5) setDragY(next);
    }
  });

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      event.button !== 0 ||
      !event.isPrimary ||
      busy.current ||
      pointer.current !== null
    )
      return;
    pointer.current = event.pointerId;
    start.current = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now(),
      grab: event.clientY - event.currentTarget.getBoundingClientRect().top,
    };
    point.current = { x: event.clientX, y: event.clientY };
    intent.current = 'idle';
    thresholdCrossed.current = false;
    lastHover.current = '';
    setIsSnappingBack(false);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (onReorder)
      longPress.current = setTimeout(() => {
        if (pointer.current !== null && intent.current === 'idle') {
          intent.current = 'reorder';
          setIsDragging(true);
          triggerHaptic(25);
        }
      }, 450);
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== event.pointerId) return;
    point.current = { x: event.clientX, y: event.clientY };
    const dx = event.clientX - start.current.x,
      dy = event.clientY - start.current.y;
    if (Math.hypot(dx, dy) > 9 && intent.current !== 'reorder')
      clearLongPress();
    if (intent.current === 'idle') intent.current = gestureIntent(dx, dy);
    if (intent.current === 'reorder') {
      let nearest:
        | {
            node: HTMLElement;
            offset: NonNullable<ReturnType<typeof magneticOffset>>;
          }
        | undefined;
      if (config.allowScaleEffects)
        for (const node of document.querySelectorAll<HTMLElement>(
          '[data-drop-category]',
        )) {
          const rect = node.getBoundingClientRect();
          if (rect.height < 1 || rect.bottom < 0 || rect.top > innerHeight)
            continue;
          const offset = magneticOffset(event.clientX, event.clientY, rect);
          if (offset && (!nearest || offset.distance < nearest.offset.distance))
            nearest = { node, offset };
        }
      if (magneticTarget.current !== nearest?.node) {
        if (magneticTarget.current)
          delete magneticTarget.current.dataset.magnetic;
        magneticTarget.current = nearest?.node || null;
        if (nearest) nearest.node.dataset.magnetic = 'true';
      }
      setMagnet(
        nearest ? { x: nearest.offset.x, y: nearest.offset.y } : { x: 0, y: 0 },
      );
      setDragY(
        event.clientY -
          (containerRef.current?.getBoundingClientRect().top || 0) -
          start.current.grab,
      );
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-task-id]');
      if (
        target?.dataset.taskGroup === callbacks.current.group &&
        target.dataset.taskId !== task.id &&
        target.dataset.taskId !== lastHover.current
      ) {
        lastHover.current = target.dataset.taskId!;
        callbacks.current.onReorder?.(task.id, target.dataset.taskId!);
      }
    } else if (intent.current === 'horizontal') {
      setIsSwiping(true);
      setOffsetX(dx);
      const crossed =
        Math.abs(dx) >= (containerRef.current?.offsetWidth || 340) * 0.45;
      if (crossed && !thresholdCrossed.current) triggerHaptic();
      thresholdCrossed.current = crossed;
    }
  };
  const finishAction = (action: 'complete' | 'delete') => {
    if (busy.current) return;
    if (config.durations.confirmedSwipe === 0) {
      (action === 'complete'
        ? callbacks.current.onToggle
        : callbacks.current.onDelete)();
      setOffsetX(0);
      setIsSwiping(false);
      return;
    }
    busy.current = true;
    setIsAnimatingOut(true);
    triggerHaptic(20);
    setOffsetX(
      config.allowScaleEffects
        ? (action === 'complete' ? 1 : -1) *
            ((containerRef.current?.offsetWidth || 340) + 24)
        : 0,
    );
    const callback =
      action === 'complete'
        ? callbacks.current.onToggle
        : callbacks.current.onDelete;
    setTimeout(() => {
      callback();
      busy.current = false;
      if (mounted.current) {
        setOffsetX(0);
        setIsAnimatingOut(false);
        setIsSwiping(false);
      }
    }, config.durations.confirmedSwipe);
  };
  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== event.pointerId) return;
    clearLongPress();
    pointer.current = null;
    const mode = intent.current;
    const cancelled =
      event.type === 'pointercancel' || event.type === 'lostpointercapture';
    intent.current = 'idle';
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (mode === 'reorder') {
      if (!cancelled) {
        const target =
          document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest<HTMLElement>('[data-drop-category]') ||
          magneticTarget.current;
        const category = target?.dataset.dropCategory as
          | DueCategory
          | undefined;
        const targetTask = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest<HTMLElement>('[data-task-id]');
        if (category && category !== getDueCategory(callbacks.current.task))
          callbacks.current.onReorder?.(
            task.id,
            targetTask?.dataset.taskId || task.id,
            category,
          );
      }
      clearMagnet();
      setIsDragging(false);
      setDragY(0);
      return;
    }
    const dx = event.clientX - start.current.x;
    const action = releaseAction(
      mode,
      dx,
      containerRef.current?.offsetWidth || 340,
      cancelled,
    );
    if (action !== 'cancel') {
      finishAction(action);
      return;
    }
    setIsSnappingBack(true);
    setOffsetX(0);
    setIsSwiping(false);
    if (
      !cancelled &&
      mode === 'idle' &&
      Math.hypot(dx, event.clientY - start.current.y) < 6 &&
      Date.now() - start.current.time < 400
    )
      callbacks.current.onEdit?.(callbacks.current.task);
  };
  // Calculate visual feedback linked directly to swipe progress
  const cardWidth = containerRef.current?.offsetWidth || 340;
  const threshold = cardWidth * 0.45;
  const absOffset = Math.abs(offsetX);
  // Progress from 0 to 1 at 45% threshold
  const rawProgress = Math.min(1, absOffset / cardWidth);

  // Background opacity begins gently around 12%, becoming clear by 40%
  const bgOpacity =
    rawProgress < 0.12 ? 0 : Math.min(0.95, (rawProgress - 0.12) / 0.3);

  // Icon opacity begins appearing around 20%, fully visible by 45%
  const iconOpacity =
    rawProgress < 0.2 ? 0 : Math.min(1, (rawProgress - 0.2) / 0.25);

  // Icon scale: 0.75 -> 1.05
  const iconScale = 0.75 + Math.min(1, rawProgress / 0.45) * 0.25;

  const isRightSwipe = offsetX > 0;
  const isLeftSwipe = offsetX < 0;
  const isPastThreshold = absOffset >= threshold;

  // Badge background and text colors
  const getBadgeStyle = (badgeType?: string) => {
    switch (badgeType) {
      case 'terracotta':
        return 'bg-[#FDEAE6] dark:bg-[#432722] text-[#A55340] dark:text-[#E08570]';
      case 'sage':
        return 'bg-[#EAF0EB] dark:bg-[#28372B] text-[#6C8271] dark:text-[#95B59C]';
      case 'amber':
        return 'bg-[#FBF1E2] dark:bg-[#403323] text-[#C88A3A] dark:text-[#E2A657]';
      case 'gray':
      default:
        return 'bg-[#EFEAE2] dark:bg-[#38322B] text-[#786E64] dark:text-[#A89E92]';
    }
  };

  // Transition style: NONE while dragging; smooth spring/ease on release
  const getCardTransition = () => {
    if (isDragging) return 'none';
    if (isSwiping && !isSnappingBack && !isAnimatingOut) {
      return 'none';
    }
    if (isAnimatingOut) {
      return `translate ${config.durations.confirmedSwipe}ms ${config.easings.decelerate}, opacity ${config.durations.confirmedSwipe}ms ease-out`;
    }
    if (isSnappingBack) {
      return `translate ${config.durations.cancelSwipe}ms ${config.easings.standard}`;
    }
    return `translate ${config.durations.listReflow}ms ${config.easings.spring}, box-shadow ${config.durations.smallTransition}ms ease, padding ${config.durations.smallTransition}ms ease`;
  };

  return (
    <motion.div
      layout={isDragging || !config.allowScaleEffects ? false : 'position'}
      layoutId={
        config.allowScaleEffects && !isDragging
          ? `task-surface-${task.id}`
          : undefined
      }
      initial={
        config.durations.smallTransition > 0 && index < 5
          ? {
              opacity: 0,
              y: config.allowScaleEffects ? 5 : 0,
              filter: config.allowScaleEffects ? 'blur(2px)' : 'blur(0px)',
            }
          : false
      }
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ height: 0, opacity: 0, marginBottom: 0, pointerEvents: 'none' }}
      transition={{
        duration: Math.min(160, config.durations.smallTransition) / 1000,
        delay: config.allowScaleEffects && index < 5 ? index * 0.02 : 0,
        layout: isDragging
          ? { duration: 0 }
          : { duration: config.durations.listReflow / 1000, ease: paperEase },
      }}
      ref={containerRef}
      data-task-index={index}
      data-task-id={task.id}
      data-task-group={group}
      role="listitem"
      tabIndex={0}
      aria-label={task.title}
      onKeyDown={(event) => {
        if (
          event.target === event.currentTarget &&
          (event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault();
          onEdit?.(task);
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onLostPointerCapture={handlePointerUp}
      style={{
        touchAction: 'pan-y',
        overflow: isDragging ? 'visible' : undefined,
        pointerEvents: isDragging ? 'none' : undefined,
      }}
      className={`relative overflow-hidden select-none ${
        variant === 'card'
          ? 'paper-card rounded-[14px] mb-2.5 transition-shadow'
          : !isLast
            ? 'border-b border-[#746B61]/8 dark:border-[#5E544A]/15'
            : ''
      } ${isDragging ? 'z-30' : 'z-10'}`}
    >
      {/* BACKGROUND UNDERLAY: Right Swipe Complete (Pale Sage Green) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center pl-4.5 pointer-events-none select-none bg-[#EAF0EB] dark:bg-[#203125]"
        style={{
          opacity: isRightSwipe ? bgOpacity : 0,
        }}
      >
        <div
          className={`flex items-center gap-2 text-[#6C8271] dark:text-[#98BBA0] transition-transform ${
            isPastThreshold ? 'font-bold' : 'font-medium'
          }`}
          style={{
            opacity: isRightSwipe ? iconOpacity : 0,
            transform: `scale(${isRightSwipe ? iconScale : 0.75})`,
            transformOrigin: 'left center',
          }}
        >
          <span className="material-symbols-outlined text-[21px] leading-none">
            {isCompleted ? 'undo' : 'check_circle'}
          </span>
          <span className="text-[13px] tracking-wide">
            {isCompleted ? '撤销完成' : '完成'}
          </span>
        </div>
      </div>

      {/* BACKGROUND UNDERLAY: Left Swipe Delete (Muted Terracotta Red) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-end pr-4.5 pointer-events-none select-none bg-[#FDEAE6] dark:bg-[#3B221E]"
        style={{
          opacity: isLeftSwipe ? bgOpacity : 0,
        }}
      >
        <div
          className={`flex items-center gap-1.5 text-[#A55340] dark:text-[#E2836E] transition-transform ${
            isPastThreshold ? 'font-bold' : 'font-medium'
          }`}
          style={{
            opacity: isLeftSwipe ? iconOpacity : 0,
            transform: `scale(${isLeftSwipe ? iconScale : 0.75})`,
            transformOrigin: 'right center',
          }}
        >
          <span className="text-[13px] tracking-wide">删除</span>
          <span className="material-symbols-outlined text-[20px] leading-none">
            delete
          </span>
        </div>
      </div>

      {/* FOREGROUND TASK SURFACE: Direct 1:1 Pointer Tracking */}
      <motion.div
        animate={{ scale: isDragging && config.allowScaleEffects ? 1.02 : 1 }}
        transition={
          config.allowScaleEffects
            ? { type: 'spring', stiffness: 420, damping: 36 }
            : { duration: 0 }
        }
        className={`relative bg-white dark:bg-[#27221E] flex items-start gap-3 select-none ${
          variant === 'card' ? 'p-3.5' : 'p-3 pl-3.5'
        } ${isEffectivelyCompleted ? 'opacity-70 is-completed' : ''}`}
        style={{
          translate: isDragging
            ? `${magnet.x}px ${dragY + magnet.y}px`
            : `${offsetX}px 0px`,
          transition: getCardTransition(),
          boxShadow: isDragging
            ? '0 12px 30px rgba(40, 35, 29, 0.18), 0 3px 8px rgba(40, 35, 29, 0.08)'
            : undefined,
          borderRadius: isDragging || variant === 'card' ? '14px' : undefined,
          opacity: isAnimatingOut ? 0.35 : undefined,
          paddingBottom:
            isCompletingLocally && config.allowScaleEffects ? 8 : undefined,
        }}
      >
        {/* Custom Checkbox button with SVG path drawing and spring linkage */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (busy.current) return;
            if (config.durations.smallTransition === 0) {
              callbacks.current.onToggle();
              return;
            }
            busy.current = true;
            triggerHaptic(12);
            if (!isCompleted) setIsCompletingLocally(true);
            const callback = callbacks.current.onToggle;
            setTimeout(
              () => {
                callback();
                busy.current = false;
                if (mounted.current) setIsCompletingLocally(false);
              },
              isCompleted ? 0 : config.durations.smallTransition,
            );
          }}
          aria-label={isEffectivelyCompleted ? '撤销完成' : '完成'}
          className={`task-checkbox relative w-[19px] h-[19px] mt-0.5 rounded-[5px] border-[1.5px] flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer ${
            isCompletingLocally ? 'checkbox-linked' : 'active:scale-90'
          } ${
            isEffectivelyCompleted
              ? 'bg-[#6C8271] border-[#6C8271]'
              : 'bg-white dark:bg-[#342E28] border-[#A89D91] dark:border-[#796F64] hover:border-[#A55340]'
          }`}
        >
          {isEffectivelyCompleted && (
            <svg
              className="w-3.5 h-3.5 text-white"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline
                points="3.2 8.5 6.5 11.8 12.8 4.5"
                className="checkmark-path"
              />
            </svg>
          )}
        </button>

        {/* Content Body - Clean without drag handles or trash buttons */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-start justify-between gap-1.5">
            <h4
              className={`title-line text-[14px] leading-snug break-words ${
                isEffectivelyCompleted
                  ? 'text-[#786E64] dark:text-[#A89E92]'
                  : 'text-[#28231D] dark:text-[#EDE6DE] font-medium'
              }`}
            >
              {task.title}
            </h4>

            {badgeLabel && (
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${getBadgeStyle(
                  task.badgeType,
                )}`}
              >
                {badgeLabel}
              </span>
            )}
          </div>

          {/* Optional task note (visible if showDetails or note present) */}
          {task.note && showDetails && (
            <p className="text-[12px] text-[#786E64] dark:text-[#A89E92] mt-1 leading-relaxed">
              {task.note}
            </p>
          )}

          {/* Tags row for list variant */}
          {!showDetails && task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
              {task.tags
                ?.filter(
                  (tag) => tag !== task.badgeLabel && tag !== `#${badgeLabel}`,
                )
                .map((tag) => (
                  <span
                    key={tag}
                    className="text-[#786E64] dark:text-[#A89E92] bg-[#F5F1E8] dark:bg-[#342E28] px-1.5 py-0.2 rounded"
                  >
                    {tag}
                  </span>
                ))}
            </div>
          )}

          {/* Time & Project footer for card view */}
          {(task.dueAt || task.project) && (
            <div className="flex items-center gap-2 mt-2 text-[11.5px] text-[#786E64] dark:text-[#A89E92]">
              {task.dueAt && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] leading-none">
                    schedule
                  </span>
                  {formatDueLabel(task)}
                </span>
              )}
              {task.dueAt && task.project && (
                <span className="text-[#D3C9BD] dark:text-[#5E544A] text-[10px]">
                  ·
                </span>
              )}
              {task.project && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] leading-none">
                    folder
                  </span>
                  {task.project}
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
