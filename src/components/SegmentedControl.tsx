import React from 'react';
import { AnimatedNumber } from './AnimatedNumber.tsx';

interface SegmentOption<T extends string> {
  id: T;
  label: string;
  count?: number;
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
  const activeIndex = options.findIndex((o) => o.id === activeId);
  const widthPercent = 100 / options.length;

  return (
    <div
      className={`relative w-full bg-[#EBE4D6] dark:bg-[#342E28] p-1 rounded-full flex items-center select-none ${className}`}
    >
      {/* Sliding white pill indicator */}
      <div
        className="absolute top-1 bottom-1 rounded-full bg-white dark:bg-[#433B34] shadow-[0_1px_3px_rgba(60,50,40,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{
          left: `calc(${widthPercent * activeIndex}% + 3px)`,
          width: `calc(${widthPercent}% - 6px)`,
        }}
      />

      {options.map((opt) => {
        const isActive = opt.id === activeId;
        return (
          <button
            key={opt.id}
            type="button"
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
                (<AnimatedNumber value={opt.count} />)
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
