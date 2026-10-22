import { AnimatePresence, motion } from 'motion/react';
import { useMotion } from '../motion/MotionProvider.tsx';
import React, { useEffect } from 'react';

interface UndoSnackbarProps {
  visible: boolean;
  message?: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export const UndoSnackbar: React.FC<UndoSnackbarProps> = ({
  visible,
  message = '已删除任务',
  onUndo,
  onDismiss,
  duration = 5000,
}) => {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, onDismiss, message]);

  const config = useMotion();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          initial={{
            opacity: 0,
            y: config.allowScaleEffects ? 6 : 0,
            filter: config.allowScaleEffects ? 'blur(2px)' : 'blur(0px)',
          }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: config.allowScaleEffects ? 4 : 0 }}
          transition={{ duration: config.durations.smallTransition / 1000 }}
          className="fixed bottom-20 inset-x-0 mx-auto w-fit max-w-[320px] z-50 pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
        >
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#201B15]/95 dark:bg-[#EDE6DE]/95 text-[#F5F1E8] dark:text-[#28231D] shadow-[0_8px_24px_rgba(32,27,21,0.28)] backdrop-blur-md border border-white/10 dark:border-black/10 text-[13px] font-medium select-none">
            <span className="material-symbols-outlined text-[16px] text-[#A55340] dark:text-[#E08570]">
              delete
            </span>
            <span className="truncate max-w-[150px]">{message}</span>
            <span className="text-white/20 dark:text-black/20">|</span>
            <button
              type="button"
              onClick={onUndo}
              className="text-[#E08570] dark:text-[#A55340] font-bold text-[13px] hover:underline cursor-pointer active:scale-95 transition-transform"
            >
              撤销
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
