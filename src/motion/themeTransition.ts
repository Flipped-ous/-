import { flushSync } from 'react-dom';
import { revealRadius } from './physics.ts';

let activeTransition: ViewTransition | undefined;

export async function revealTheme(
  apply: () => void,
  origin: { x: number; y: number },
  rich: boolean,
  enabled: boolean,
) {
  activeTransition?.skipTransition();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || !enabled || reduced) {
    flushSync(apply);
    if (enabled && !reduced)
      document
        .querySelector('.app-root')
        ?.animate([{ opacity: 0.92 }, { opacity: 1 }], { duration: 180 });
    return;
  }
  const transition = document.startViewTransition(() => flushSync(apply));
  activeTransition = transition;
  try {
    await transition.ready;
    if (rich) {
      const { x, y } = origin;
      const radius = revealRadius(x, y, innerWidth, innerHeight);
      await document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 420,
          easing: 'cubic-bezier(0.22,1,0.36,1)',
          pseudoElement: '::view-transition-new(root)',
        },
      ).finished;
    } else {
      await document.documentElement.animate(
        { opacity: [0, 1] },
        { duration: 190, pseudoElement: '::view-transition-new(root)' },
      ).finished;
    }
  } catch {
    /* An interrupted transition has already applied the selected theme. */
  } finally {
    if (activeTransition === transition) activeTransition = undefined;
  }
}
