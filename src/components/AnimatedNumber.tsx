import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';

import { useMotion } from '../motion/MotionProvider.tsx';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  sharedId?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  className = '',
  prefix = '',
  suffix = '',
  sharedId,
}) => {
  const config = useMotion();
  const [displayValue, setDisplayValue] = useState(value);
  const [direction, setDirection] = useState<'up' | 'down' | 'none'>('none');
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      const nextDir = value > prevValueRef.current ? 'up' : 'down';
      setDirection(nextDir);
      setIsAnimating(config.durations.smallTransition > 0);
      setDisplayValue(value);
      prevValueRef.current = value;

      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, config.durations.smallTransition);
      return () => clearTimeout(timer);
    }
  }, [value, config]);

  return (
    <motion.span
      layoutId={config.level === 'rich' ? sharedId : undefined}
      layout={sharedId && config.allowScaleEffects ? 'position' : false}
      transition={{ duration: config.durations.pageTransition / 1000 }}
      className={`inline-flex items-baseline overflow-hidden select-none ${className}`}
    >
      {prefix && <span>{prefix}</span>}
      <span
        key={displayValue}
        className={`inline-block ${
          isAnimating
            ? direction === 'up'
              ? 'animate-number-roll-up'
              : 'animate-number-roll-down'
            : ''
        }`}
      >
        {displayValue}
      </span>
      {suffix && <span>{suffix}</span>}
    </motion.span>
  );
};
