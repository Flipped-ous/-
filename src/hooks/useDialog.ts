import { useEffect, useRef } from 'react';

/** Shared Escape/Back, focus and scroll handling; the existing sheet markup remains unchanged. */
export function useDialog(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const viewport = () =>
      document.documentElement.style.setProperty(
        '--dialog-height',
        (window.visualViewport?.height || window.innerHeight) + 'px',
      );
    viewport();
    window.visualViewport?.addEventListener('resize', viewport);
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const token = crypto.randomUUID();
    history.pushState({ ...history.state, dialogToken: token }, '');
    let popped = false;
    const pop = () => {
      popped = true;
      closeRef.current();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === 'Tab') {
        const dialog = [
          ...document.querySelectorAll<HTMLElement>('[role="dialog"]'),
        ].at(-1);
        const items = [
          ...(dialog?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input, textarea, select, [tabindex="0"]',
          ) || []),
        ].filter((el) => el.getClientRects().length > 0);
        if (!items.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const focus = requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>(
          '[role="dialog"] input, [role="dialog"] textarea, [role="dialog"] button',
        )
        ?.focus(),
    );
    window.addEventListener('popstate', pop);
    document.addEventListener('keydown', keydown);
    return () => {
      cancelAnimationFrame(focus);
      window.visualViewport?.removeEventListener('resize', viewport);
      window.removeEventListener('popstate', pop);
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = overflow;
      if (!popped && history.state?.dialogToken === token) history.back();
      previous?.focus();
    };
  }, [open]);
}
