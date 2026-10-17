import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useLayoutEffect,
} from 'react';
import { LayoutGroup } from 'motion/react';
import type { AppSettings } from '../types/index.ts';
import {
  getMotionConfig,
  getPageMotionConfig,
  isStaticPage,
  type MotionConfig,
} from './motionConfig.ts';

const Context = createContext<MotionConfig>(getMotionConfig());
export const useMotion = () => useContext(Context);
const NavigationContext = createContext<MotionConfig>(getMotionConfig());
export const useNavigationMotion = () => useContext(NavigationContext);
const staticConfig = getMotionConfig('simple', false);

export function StaticMotion({ children }: { children: React.ReactNode }) {
  return <Context.Provider value={staticConfig}>{children}</Context.Provider>;
}

export function MotionProvider({
  settings,
  children,
  activePage,
}: {
  settings: AppSettings;
  children: React.ReactNode;
  activePage?: string;
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
      getPageMotionConfig(
        settings.motion,
        settings.motionEnabled,
        activePage,
        reduced,
      ),
    [settings.motion, settings.motionEnabled, reduced, activePage],
  );
  const navigationConfig = useMemo(
    () => getMotionConfig(settings.motion, settings.motionEnabled && !reduced),
    [settings.motion, settings.motionEnabled, reduced],
  );
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.motion =
      config.durations.smallTransition === 0 ? 'off' : config.level;
    root.dataset.staticPage = String(isStaticPage(activePage));
    const durations = config.durations;
    for (const [key, value] of Object.entries(durations))
      root.style.setProperty('--motion-' + key, value + 'ms');
    const scroll = () =>
      root.style.setProperty(
        '--ambient-shift',
        config.allowParallax && activePage !== 'more'
          ? Math.min(4, window.scrollY * 0.008) + 'px'
          : '0px',
      );
    scroll();
    if (config.allowParallax)
      window.addEventListener('scroll', scroll, { passive: true });
    return () => window.removeEventListener('scroll', scroll);
  }, [config, settings.motionEnabled, activePage]);
  return (
    <Context.Provider value={config}>
      <NavigationContext.Provider value={navigationConfig}>
        <LayoutGroup id="jinri-youxu">{children}</LayoutGroup>
      </NavigationContext.Provider>
    </Context.Provider>
  );
}
