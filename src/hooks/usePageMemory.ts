import { useLayoutEffect, useState, type Dispatch, type SetStateAction } from 'react';
const memory = new Map<string, unknown>();
const scroll = new Map<string, number>();
/** UI-only session state: never exported in backups or sync. */
export function usePageMemory<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => memory.has(key) ? memory.get(key) as T : initial);
  const update: Dispatch<SetStateAction<T>> = next => setValue(before => {
    const after = typeof next === 'function' ? (next as (value: T) => T)(before) : next;
    memory.set(key, after); return after;
  });
  return [value, update];
}
export function usePageScroll(key: string) {
  useLayoutEffect(() => {
    window.scrollTo(0, scroll.get(key) || 0);
    const save = () => scroll.set(key, window.scrollY);
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, [key]);
}
