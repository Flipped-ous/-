import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useVelocity } from 'motion/react';
import { useNavigationMotion } from '../motion/MotionProvider.tsx';
import { useNavigationHidden } from '../hooks/useNavigationHidden.ts';

export type NavTabId = 'today' | 'tasks' | 'projects' | 'review' | 'more';
interface BottomNavigationProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  pendingCount?: number;
}
const tabs: { id: NavTabId; label: string; icon: string }[] = [
  { id: 'today', label: '今天', icon: 'today' },
  { id: 'tasks', label: '待办', icon: 'check_box' },
  { id: 'projects', label: '项目', icon: 'folder_open' },
  { id: 'review', label: '笔记', icon: 'auto_stories' },
  { id: 'more', label: '更多', icon: 'more_horiz' },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange, pendingCount = 0 }) => {
  const config = useNavigationMotion();
  const hidden = useNavigationHidden();
  const track = useRef<HTMLDivElement>(null);
  const measured = useRef(false);
  const [slotWidth, setSlotWidth] = useState(0);
  const target = useMotionValue(0);
  // Retarget this spring on rapid taps instead of restarting a fixed timeline.
  const x = useSpring(target, { stiffness: 520, damping: 38, mass: 0.8 });
  const velocity = useVelocity(x);
  const fluid = config.allowScaleEffects && config.durations.smallTransition > 0;
  const scaleX = useTransform(velocity, (v) => fluid ? 1 + Math.min(0.38, Math.abs(v) / 2400) : 1);
  const scaleY = useTransform(velocity, (v) => fluid ? 1 - Math.min(0.16, Math.abs(v) / 5400) : 1);
  const skewX = useTransform(velocity, (v) => fluid ? Math.max(-7, Math.min(7, -v / 180)) : 0);
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);

  useLayoutEffect(() => {
    const node = track.current;
    if (!node) return;
    const measure = () => {
      if (node.clientWidth > 12) setSlotWidth((node.clientWidth - 12) / tabs.length);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const next = activeIndex * slotWidth;
    if (!measured.current || config.durations.smallTransition === 0) {
      target.jump(next);
      x.jump(next);
    } else {
      target.set(next);
    }
    if (slotWidth > 0) measured.current = true;
  }, [activeIndex, slotWidth, config.durations.smallTransition, target, x]);

  return (
    <nav hidden={hidden} aria-label="底部主导航" className="fixed bottom-3 inset-x-4 z-40 max-w-sm mx-auto select-none pointer-events-auto">
      <div ref={track} className="relative flex items-center p-1.5 rounded-full paper-navigation shadow-[0_8px_30px_rgba(59,53,46,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
        style={{ backgroundColor: 'color-mix(in srgb, var(--bg-page) 82%, transparent)', border: '1px solid var(--border-pill)' }}>
        <div className="navigation-air" aria-hidden="true" />
        <motion.div aria-hidden="true" className="navigation-droplet absolute top-1.5 bottom-1.5 rounded-full pointer-events-none"
          style={{ left: 10, width: Math.max(0, slotWidth - 8), x, scaleX, scaleY, skewX, backgroundColor: 'color-mix(in srgb, var(--accent-terracotta) 14%, transparent)', visibility: slotWidth ? 'visible' : 'hidden' }} />
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button key={tab.id} type="button" onClick={() => onTabChange(tab.id)}
              aria-label={tab.label} title={tab.label} aria-current={active ? 'page' : undefined}
              className={`relative z-10 flex-1 h-11 min-w-0 flex items-center justify-center rounded-full cursor-pointer ${active ? 'text-[#A55340] dark:text-[#C76E59]' : 'text-[#786E64] dark:text-[#A89E92]'}`}>
              <span className="relative flex items-center justify-center">
                <span aria-hidden="true" className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
                {tab.id === 'tasks' && pendingCount > 0 && !active && (
                  <span aria-hidden="true" className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-1 bg-[#A55340] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{pendingCount > 9 ? '9+' : pendingCount}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
