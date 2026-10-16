import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { LayoutGroup } from 'motion/react';
import type { AppSettings } from '../types/index.ts';
import { getMotionConfig, type MotionConfig } from './motionConfig.ts';

const Context = createContext<MotionConfig>(getMotionConfig());
export const useMotion = () => useContext(Context);

export function MotionProvider({
  settings,
  children,
}: {
  settings: AppSettings;
  children: React.ReactNode;
}) {
  const [reduced, setReduced] = useState(
    () =>
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const config = useMemo(
    () =>
      getMotionConfig(
        reduced ? 'simple' : settings.motion,
        settings.motionEnabled,
      ),
    [settings.motion, settings.motionEnabled, reduced],
  );
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = !settings.motionEnabled ? 'off' : config.level;
    const durations = config.durations;
    for (const [key, value] of Object.entries(durations))
      root.style.setProperty('--motion-' + key, value + 'ms');
    const scroll = () =>
      root.style.setProperty(
        '--ambient-shift',
        config.allowParallax
          ? Math.min(10, window.scrollY * 0.015) + 'px'
          : '0px',
      );
    scroll();
    if (config.allowParallax)
      window.addEventListener('scroll', scroll, { passive: true });
    return () => window.removeEventListener('scroll', scroll);
  }, [config, settings.motionEnabled]);
  return (
    <Context.Provider value={config}>
      <LayoutGroup id="jinri-youxu">{children}</LayoutGroup>
    </Context.Provider>
  );
}
