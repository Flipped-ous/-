import React, { useLayoutEffect } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { AnimatedNumber } from './AnimatedNumber.tsx';
import { useNavigationMotion } from '../motion/MotionProvider.tsx';

interface SegmentOption<T extends string> {
  id: T;
  label: string;
  count?: number;
  motionId?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  activeId,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  const config = useNavigationMotion();
  const activeIndex = Math.max(0, options.findIndex((option) => option.id === activeId));
  const position = useSpring(activeIndex, { stiffness: 420, damping: 36, mass: 0.8 });
  const x = useTransform(position, (index) => `${index * 100}%`);
  useLayoutEffect(() => {
    if (config.durations.smallTransition === 0) position.jump(activeIndex);
    else position.set(activeIndex);
  }, [activeIndex, config.durations.smallTransition, position]);

  return (
    <div
      role="group"
      aria-label="筛选选项"
      className={`relative w-full bg-[#EBE4D6] dark:bg-[#342E28] p-1 rounded-full flex items-center select-none ${className}`}
    >
      <div aria-hidden="true" className="absolute inset-1 pointer-events-none">
        <motion.div className="segmented-indicator h-full rounded-full bg-white dark:bg-[#433B34] shadow-[0_1px_3px_rgba(60,50,40,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
          style={{ width: `${100 / options.length}%`, x }} />
      </div>
      {options.map((opt) => {
        const isActive = opt.id === activeId;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(opt.id)}
            className={`relative z-10 flex-1 h-7 rounded-full text-[12px] font-medium flex items-center justify-center transition-colors cursor-pointer ${
              isActive
                ? 'text-[#A55340] dark:text-[#C76E59] font-semibold'
                : 'text-[#786E64] dark:text-[#A89E92] hover:text-[#28231D] dark:hover:text-[#EDE6DE]'
            }`}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span className="ml-1 text-[11px] opacity-80 inline-flex items-center">
                (<AnimatedNumber value={opt.count} sharedId={opt.motionId} />)
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
