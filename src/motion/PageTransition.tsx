import React from 'react';
import { motion } from 'motion/react';
import { StaticMotion, useMotion } from './MotionProvider.tsx';
import { getMotionConfig, isStaticPage } from './motionConfig.ts';

export const PageTransition = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; page?: string }
>(function PageTransition({ children, page }, ref) {
  const inherited = useMotion();
  const quiet = isStaticPage(page);
  const config = quiet ? getMotionConfig('simple', false) : inherited;
  return (
    <motion.div
      ref={ref}
      className="flex-1 flex flex-col page-transition"
      initial={
        config.durations.pageTransition
          ? { opacity: 0, x: config.allowScaleEffects ? 12 : 0 }
          : false
      }
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: quiet ? 1 : 0, x: config.allowScaleEffects ? -8 : 0 }}
      transition={{
        duration: config.durations.pageTransition / 1000,
        ease: [0.2, 0.9, 0.3, 1],
      }}
    >
      {quiet ? <StaticMotion>{children}</StaticMotion> : children}
    </motion.div>
  );
});
