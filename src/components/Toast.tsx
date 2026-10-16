import React from 'react';

interface ToastProps {
  message: string | null;
  icon?: string;
}

export const Toast: React.FC<ToastProps> = ({ message, icon = 'task_alt' }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-20 inset-x-0 mx-auto w-fit max-w-[280px] z-50 pointer-events-none transition-all duration-300 transform translate-y-0 opacity-100">
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#201B15]/90 dark:bg-[#EDE6DE]/90 text-[#F5F1E8] dark:text-[#28231D] shadow-[0_6px_20px_rgba(32,27,21,0.22)] backdrop-blur-md border border-white/10 dark:border-black/10 text-[12.5px] font-medium">
        <span className="material-symbols-outlined text-[16px] text-[#A2C7A6] dark:text-[#4C6450]">
          {icon}
        </span>
        <span>{message}</span>
      </div>
    </div>
  );
};
