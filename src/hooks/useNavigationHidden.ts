import { useEffect, useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';
import { NativeAppearance } from '../services/native.ts';
import { navigationVisibility } from '../services/navigationVisibility.ts';

function isTextEntry(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  const input = target.closest('input, textarea, [contenteditable="true"]');
  if (!input || input.matches(':disabled, [readonly]')) return false;
  return !input.matches('input[type="checkbox"], input[type="radio"], input[type="button"], input[type="submit"], input[type="reset"], input[type="file"], input[type="range"], input[type="color"], input[type="hidden"]');
}

export function useNavigationHidden() {
  const hidden = useSyncExternalStore(
    navigationVisibility.subscribe,
    navigationVisibility.getSnapshot,
    () => false,
  );
  useEffect(() => {
    let active = true;
    const focus = () => {
      if (active) navigationVisibility.setEditing(isTextEntry(document.activeElement));
    };
    const blur = () => queueMicrotask(focus);
    const pointer = (event: PointerEvent) => {
      if (isTextEntry(event.target)) navigationVisibility.setEditing(true);
    };
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', blur);
    document.addEventListener('pointerdown', pointer, true);
    focus();
    let cleanupKeyboard = () => {};
    if (Capacitor.isNativePlatform()) {
      const listener = NativeAppearance.addListener('keyboardVisibilityChange', ({ visible }) => {
        if (active) navigationVisibility.setKeyboardVisible(visible);
      },
      ).catch(() => null);
      cleanupKeyboard = () => {
        void listener.then((handle) => handle?.remove());
      };
    } else {
      const viewport = window.visualViewport;
      let fullHeight = window.innerHeight;
      const resize = () => {
        const height = viewport?.height ?? window.innerHeight;
        if (!isTextEntry(document.activeElement) && height >= fullHeight - 120)
          fullHeight = window.innerHeight;
        navigationVisibility.setKeyboardVisible(fullHeight - height > 120);
      };
      viewport?.addEventListener('resize', resize);
      window.addEventListener('resize', resize);
      cleanupKeyboard = () => {
        viewport?.removeEventListener('resize', resize);
        window.removeEventListener('resize', resize);
      };
    }
    return () => {
      active = false;
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', blur);
      document.removeEventListener('pointerdown', pointer, true);
      cleanupKeyboard();
      navigationVisibility.setEditing(false);
      navigationVisibility.setKeyboardVisible(false);
    };
  }, []);
  return hidden;
}
