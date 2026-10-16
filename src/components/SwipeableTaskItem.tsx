import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Task } from '../types/index.ts';

interface SwipeableTaskItemProps {
  task: Task;
  index: number;
  isLast?: boolean;
  variant?: 'card' | 'row';
  showDetails?: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onEdit?: (task: Task) => void;
  onReorder?: (dragIndex: number, hoverIndex: number) => void;
}

export const SwipeableTaskItem: React.FC<SwipeableTaskItemProps> = ({
  task,
  index,
  isLast = false,
  variant = 'row',
  showDetails = false,
  onToggle,
  onDelete,
  onEdit,
  onReorder,
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isSnappingBack, setIsSnappingBack] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isPointerDownRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureIntentRef = useRef<'idle' | 'horizontal' | 'vertical' | 'reorder'>('idle');
  const hasCrossedThresholdRef = useRef(false);
  const [isCompletingLocally, setIsCompletingLocally] = useState(false);

  const isCompleted = task.status === 'completed';
  const isEffectivelyCompleted = isCompleted || isCompletingLocally;

  // Keep ref in sync
  currentOffsetRef.current = offsetX;

  // Gentle haptic feedback helper
  const triggerHaptic = useCallback((duration = 15) => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(duration);
      }
    } catch {
      // ignore in environments without vibration hardware
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };
  }, []);

  // POINTER DOWN: Start gesture tracking only on primary click/touch
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary mouse button (button === 0) or touch/pen
    if (e.button !== 0) return;
    if (isAnimatingOut) return;

    isPointerDownRef.current = true;
    startPosRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    gestureIntentRef.current = 'idle';
    hasCrossedThresholdRef.current = false;
    setIsSnappingBack(false);

    // Start 450ms long-press timer for reorder mode
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      // If pointer is still held down and movement was under 10px, activate reorder mode
      if (isPointerDownRef.current && gestureIntentRef.current === 'idle') {
        gestureIntentRef.current = 'reorder';
        setIsDragging(true);
        triggerHaptic(30);
      }
    }, 450);

    // Global window listeners to ensure smooth continuous 1:1 tracking
    const handleGlobalPointerMove = (moveEvt: PointerEvent) => {
      if (!isPointerDownRef.current) return;

      const deltaX = moveEvt.clientX - startPosRef.current.x;
      const deltaY = moveEvt.clientY - startPosRef.current.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const dist = Math.hypot(deltaX, deltaY);

      // Cancel long press if movement exceeds 9px before 450ms fires
      if (dist > 9 && gestureIntentRef.current !== 'reorder') {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }

      // Determine gesture direction on initial movement
      if (gestureIntentRef.current === 'idle' && dist > 8) {
        if (absY > absX) {
          // Vertical movement priority -> allow native page scroll
          gestureIntentRef.current = 'vertical';
        } else {
          // Horizontal movement priority -> enter horizontal swipe
          gestureIntentRef.current = 'horizontal';
          setIsSwiping(true);
        }
      }

      // 1. REORDER MODE
      if (gestureIntentRef.current === 'reorder') {
        if (onReorder) {
          const el = document.elementFromPoint(moveEvt.clientX, moveEvt.clientY);
          const targetItem = el?.closest('[data-task-index]') as HTMLElement | null;
          if (targetItem && targetItem.dataset.taskIndex !== undefined) {
            const hoverIdx = parseInt(targetItem.dataset.taskIndex, 10);
            if (!isNaN(hoverIdx) && hoverIdx !== index) {
              triggerHaptic(12);
              onReorder(index, hoverIdx);
            }
          }
        }
        return;
      }

      // 2. HORIZONTAL SWIPE: Direct continuous 1:1 proportional tracking
      if (gestureIntentRef.current === 'horizontal') {
        const cardWidth = containerRef.current?.offsetWidth || 340;
        const threshold = cardWidth * 0.45;

        // Directly follow pointer (no CSS transitions active while dragging)
        setOffsetX(deltaX);

        // Threshold crossing haptic feedback (trigger only once per threshold transition)
        const isBeyondThreshold = absX >= threshold;
        if (isBeyondThreshold && !hasCrossedThresholdRef.current) {
          triggerHaptic(deltaX > 0 ? 15 : 20);
          hasCrossedThresholdRef.current = true;
        } else if (!isBeyondThreshold && hasCrossedThresholdRef.current) {
          hasCrossedThresholdRef.current = false;
        }
      }
    };

    const handleGlobalPointerUp = (upEvt: PointerEvent) => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);

      if (!isPointerDownRef.current) return;
      isPointerDownRef.current = false;

      // Clear long-press timer if still pending
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // Reorder mode release
      if (gestureIntentRef.current === 'reorder') {
        setIsDragging(false);
        gestureIntentRef.current = 'idle';
        return;
      }

      // Click to edit recognition (movement < 6px and duration < 400ms)
      if (gestureIntentRef.current === 'idle') {
        const elapsed = Date.now() - startPosRef.current.time;
        const totalDist = Math.hypot(
          upEvt.clientX - startPosRef.current.x,
          upEvt.clientY - startPosRef.current.y
        );
        if (totalDist < 6 && elapsed < 400) {
          onEdit?.(task);
        }
        return;
      }

      // Horizontal swipe release
      if (gestureIntentRef.current === 'horizontal') {
        const cardWidth = containerRef.current?.offsetWidth || 340;
        const threshold = cardWidth * 0.45;
        const finalX = currentOffsetRef.current;

        if (finalX >= threshold) {
          // Confirmed RIGHT SWIPE (Complete) - release beyond 45%
          setIsAnimatingOut(true);
          triggerHaptic(20);
          setOffsetX(cardWidth + 24);

          setTimeout(() => {
            onToggle();
            setOffsetX(0);
            setIsSwiping(false);
            setIsAnimatingOut(false);
            hasCrossedThresholdRef.current = false;
          }, 300);
        } else if (finalX <= -threshold) {
          // Confirmed LEFT SWIPE (Delete) - release beyond 45%
          setIsAnimatingOut(true);
          triggerHaptic(25);
          setOffsetX(-cardWidth - 24);

          setTimeout(() => {
            onDelete();
            setOffsetX(0);
            setIsSwiping(false);
            setIsAnimatingOut(false);
            hasCrossedThresholdRef.current = false;
          }, 300);
        } else {
          // Cancelled (released below 45% or dragged back before release)
          // Smoothly return card to x = 0 (240ms duration)
          setIsSnappingBack(true);
          setOffsetX(0);
          hasCrossedThresholdRef.current = false;

          setTimeout(() => {
            setIsSwiping(false);
            setIsSnappingBack(false);
          }, 250);
        }
      }

      gestureIntentRef.current = 'idle';
    };

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
    window.addEventListener('pointerup', handleGlobalPointerUp, { passive: true });
    window.addEventListener('pointercancel', handleGlobalPointerUp, { passive: true });
  };

  // Calculate visual feedback linked directly to swipe progress
  const cardWidth = containerRef.current?.offsetWidth || 340;
  const threshold = cardWidth * 0.45;
  const absOffset = Math.abs(offsetX);
  // Progress from 0 to 1 at 45% threshold
  const rawProgress = Math.min(1.2, absOffset / threshold);

  // Background opacity begins gently around 12%, becoming clear by 40%
  const bgOpacity =
    rawProgress < 0.12
      ? 0
      : Math.min(0.95, (rawProgress - 0.12) / 0.75);

  // Icon opacity begins appearing around 20%, fully visible by 45%
  const iconOpacity =
    rawProgress < 0.2
      ? 0
      : Math.min(1, (rawProgress - 0.2) / 0.65);

  // Icon scale: 0.75 -> 1.05
  const iconScale = 0.75 + Math.min(1, rawProgress) * 0.3;

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
    if (isSwiping && !isSnappingBack && !isAnimatingOut) {
      return 'none';
    }
    if (isAnimatingOut) {
      return 'transform 300ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 280ms ease-out';
    }
    if (isSnappingBack) {
      return 'transform 250ms cubic-bezier(0.25, 1, 0.5, 1)';
    }
    return 'transform 250ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 250ms ease';
  };

  return (
    <div
      ref={containerRef}
      data-task-index={index}
      onPointerDown={handlePointerDown}
      style={{ touchAction: 'pan-y' }}
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
      <div
        className={`relative bg-white dark:bg-[#27221E] flex items-start gap-3 select-none ${
          variant === 'card' ? 'p-3.5' : 'p-3 pl-3.5'
        } ${isEffectivelyCompleted ? 'opacity-70 is-completed' : ''}`}
        style={{
          transform: isDragging
            ? 'scale(1.02)'
            : `translateX(${offsetX}px)`,
          transition: getCardTransition(),
          boxShadow: isDragging
            ? '0 12px 30px rgba(40, 35, 29, 0.18), 0 3px 8px rgba(40, 35, 29, 0.08)'
            : undefined,
          borderRadius: isDragging || variant === 'card' ? '14px' : undefined,
          opacity: isAnimatingOut ? 0.35 : undefined,
        }}
      >
        {/* Custom Checkbox button with SVG path drawing and spring linkage */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (isCompleted) {
              triggerHaptic(12);
              onToggle();
            } else {
              triggerHaptic(16);
              setIsCompletingLocally(true);
              setTimeout(() => {
                onToggle();
                setIsCompletingLocally(false);
              }, 260);
            }
          }}
          aria-label={isEffectivelyCompleted ? '撤销完成' : '完成'}
          className={`w-[19px] h-[19px] mt-0.5 rounded-[5px] border-[1.5px] flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer ${
            isCompletingLocally ? 'scale-90' : 'active:scale-90'
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

            {task.badgeLabel && (
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${getBadgeStyle(
                  task.badgeType
                )}`}
              >
                {task.badgeLabel}
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
                ?.filter((tag) => tag !== task.badgeLabel && tag !== `#${task.badgeLabel}`)
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
          {showDetails && (task.dueTime || task.project) && (
            <div className="flex items-center gap-2 mt-2 text-[11.5px] text-[#786E64] dark:text-[#A89E92]">
              {task.dueTime && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] leading-none">
                    schedule
                  </span>
                  {task.dueTime}
                </span>
              )}
              {task.dueTime && task.project && (
                <span className="text-[#D3C9BD] dark:text-[#5E544A] text-[10px]">·</span>
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
      </div>
    </div>
  );
};
