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
  message = '��ɾ������',
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

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 inset-x-0 mx-auto w-fit max-w-[320px] z-50 pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
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
          ����
        </button>
      </div>
    </div>
  );
};
