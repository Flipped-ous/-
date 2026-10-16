import React from 'react';
import { motion } from 'motion/react';
import { useMotion } from './MotionProvider.tsx';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const config = useMotion();
  return (
    <motion.div
      className="flex-1 flex flex-col page-transition"
      initial={{ opacity: 0, y: config.allowScaleEffects ? 6 : 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: config.allowParallax ? -4 : 0 }}
      transition={{
        duration: config.durations.pageTransition / 1000,
        ease: [0.2, 0.9, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
