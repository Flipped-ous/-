import React, { useEffect, useState, useRef } from 'react';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  className = '',
  prefix = '',
  suffix = '',
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [direction, setDirection] = useState<'up' | 'down' | 'none'>('none');
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      const nextDir = value > prevValueRef.current ? 'up' : 'down';
      setDirection(nextDir);
      setIsAnimating(true);
      setDisplayValue(value);
      prevValueRef.current = value;

      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 240);
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <span className={`inline-flex items-baseline overflow-hidden select-none ${className}`}>
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
    </span>
  );
};
