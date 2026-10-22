import React from 'react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { useNavigationMotion } from './MotionProvider.tsx';

const FilterPanel = React.forwardRef<HTMLDivElement, {
  children: React.ReactNode;
  direction: number;
  enabled: boolean;
  distance: number;
}>(function FilterPanel({ children, direction, enabled, distance }, ref) {
  const present = useIsPresent();
  return (
    <motion.div
      ref={ref}
      className="filter-panel"
      aria-hidden={!present || undefined}
      inert={!present}
      initial={{ opacity: enabled ? 0 : 1, x: direction * distance }}
      animate={{ opacity: 1, x: 0 }}
      variants={{
        leave: (nextDirection: number) => ({
          opacity: enabled ? 0 : 1,
          x: -nextDirection * distance,
        }),
      }}
      exit="leave"
      transition={{ duration: enabled ? 0.2 : 0, ease: [0.22, 1, 0.36, 1] }}
      style={{ pointerEvents: present ? 'auto' : 'none' }}
    >
      {children}
    </motion.div>
  );
});

/** Only changing the filter key starts an effect; task edits keep the panel mounted. */
export function FilterTransition({
  value,
  direction,
  children,
}: {
  value: string;
  direction: number;
  children: React.ReactNode;
}) {
  const config = useNavigationMotion();
  const enabled = config.durations.smallTransition > 0;
  return (
    <div className="relative filter-transition">
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <FilterPanel key={value} direction={direction} enabled={enabled}
          distance={enabled && config.allowScaleEffects ? 8 : 0}>
          {children}
        </FilterPanel>
      </AnimatePresence>
    </div>
  );
}
