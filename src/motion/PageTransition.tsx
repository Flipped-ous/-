import React from 'react';
import { motion, useIsPresent } from 'motion/react';
import { StaticMotion, useMotion } from './MotionProvider.tsx';
import { getMotionConfig, isStaticPage } from './motionConfig.ts';

export const PageTransition = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; page?: string }
>(function PageTransition({ children, page }, ref) {
  const inherited = useMotion();
  const present = useIsPresent();
  const quiet = isStaticPage(page);
  const config = quiet ? getMotionConfig('simple', false) : inherited;
  return (
    <motion.div
      ref={ref}
      inert={!present}
      className="flex-1 flex flex-col page-transition"
      initial={
        config.durations.pageTransition
          ? { opacity: 0.65 }
          : false
      }
      animate={{ opacity: 1 }}
      exit={{ opacity: quiet ? 1 : 0, pointerEvents: 'none' }}
      transition={{
        duration: config.durations.pageTransition ? 0.16 : 0,
        ease: [0.2, 0.9, 0.3, 1],
      }}
    >
      {quiet ? <StaticMotion>{children}</StaticMotion> : children}
    </motion.div>
  );
});
