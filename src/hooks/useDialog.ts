import { useEffect, useLayoutEffect, useRef } from "react";
import { navigationVisibility } from "../services/navigationVisibility.ts";
const dialogStack: string[] = [];
if (typeof window !== "undefined")
  window.addEventListener("popstate", () => {
    const token = history.state?.dialogToken;
    if (token && !dialogStack.includes(token)) history.back();
  });

/** Shared Escape/Back, focus and scroll handling; the existing sheet markup remains unchanged. */
export function useDialog(open: boolean, close: () => void, initialFocus?: string) {
  const closeRef = useRef(close);
  closeRef.current = close;
  const focusRef = useRef(initialFocus);
  focusRef.current = initialFocus;
  useLayoutEffect(() => {
    if (open) return navigationVisibility.holdDialog();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const viewport = () =>
      document.documentElement.style.setProperty(
        "--dialog-height",
        (window.visualViewport?.height || window.innerHeight) + "px",
      );
    viewport();
    window.visualViewport?.addEventListener("resize", viewport);
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const token = crypto.randomUUID();
    dialogStack.push(token);
    history.pushState({ ...history.state, dialogToken: token }, "");
    let popped = false;
    const pop = () => {
      if (history.state?.dialogToken === token || dialogStack.at(-1) !== token)
        return;
      popped = true;
      closeRef.current();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const dialog = [
          ...document.querySelectorAll<HTMLElement>('[role="dialog"]'),
        ].at(-1);
        const items = [
          ...(dialog?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input, textarea, select, [contenteditable="true"], [tabindex="0"]',
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
    const focus = requestAnimationFrame(() => {
      const dialog = [
        ...document.querySelectorAll<HTMLElement>('[role="dialog"]'),
      ].at(-1);
      dialog
        ?.querySelector<HTMLElement>(
          focusRef.current || 'textarea, input:not([type="hidden"]):not([type="file"]), [contenteditable="true"], button',
        )
        ?.focus({ preventScroll: true });
    });
    window.addEventListener("popstate", pop);
    document.addEventListener("keydown", keydown);
    return () => {
      const index = dialogStack.indexOf(token);
      if (index >= 0) dialogStack.splice(index, 1);
      cancelAnimationFrame(focus);
      window.visualViewport?.removeEventListener("resize", viewport);
      window.removeEventListener("popstate", pop);
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = overflow;
      if (!popped && history.state?.dialogToken === token) history.back();
      const remaining = [
        ...document.querySelectorAll<HTMLElement>('[role="dialog"]'),
      ]
        .filter((el) => el.getClientRects().length > 0)
        .at(-1);
      if (remaining)
        remaining
          .querySelector<HTMLElement>(
            'button, textarea, [contenteditable="true"]',
          )
          ?.focus({ preventScroll: true });
      else previous?.focus({ preventScroll: true });
    };
  }, [open]);
}
