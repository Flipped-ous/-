import React from 'react';

export type NavTabId = 'today' | 'tasks' | 'projects' | 'review' | 'more';

interface BottomNavigationProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  pendingCount?: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  pendingCount = 0,
}) => {
  const tabs: { id: NavTabId; label: string; icon: string }[] = [
    { id: 'today', label: '今天', icon: 'today' },
    { id: 'tasks', label: '待办', icon: 'check_box' },
    { id: 'projects', label: '项目', icon: 'folder_open' },
    { id: 'review', label: '复盘', icon: 'auto_stories' },
    { id: 'more', label: '更多', icon: 'more_horiz' },
  ];

  const activeIndex = tabs.findIndex((t) => t.id === activeTab);

  return (
    <nav
      aria-label="底部主导航"
      className="fixed bottom-3 inset-x-4 z-40 max-w-sm mx-auto select-none pointer-events-auto"
    >
      <div
        className="relative flex items-center justify-between p-1.5 rounded-full backdrop-blur-xl transition-colors duration-300 shadow-[0_8px_30px_rgba(59,53,46,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
        style={{
          backgroundColor: 'var(--bg-card, rgba(255, 251, 247, 0.92))',
          border: '1px solid var(--border-pill, rgba(255, 255, 255, 0.75))',
        }}
      >
        {/* Dynamic sliding spring pill behind active tab */}
        <div
          className="absolute top-1.5 bottom-1.5 rounded-full pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            left: `calc(20% * ${activeIndex} + 3px)`,
            width: `calc(20% - 6px)`,
            backgroundColor: 'rgba(165, 83, 64, 0.12)',
          }}
        />

        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative z-10 flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'text-[#A55340] dark:text-[#C76E59] -translate-y-0.5'
                  : 'text-[#786E64] dark:text-[#A89E92] hover:text-[#28231D] dark:hover:text-[#EDE6DE]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <span
                  className="material-symbols-outlined text-[20px] transition-transform"
                  style={{
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {tab.icon}
                </span>
                {tab.id === 'tasks' && pendingCount > 0 && !isActive && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-1 bg-[#A55340] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 ${
                  isActive ? 'font-semibold' : 'font-normal'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
