import test from 'node:test';
import assert from 'node:assert/strict';
import { revealTheme } from './themeTransition.ts';

test('supported rich theme transition clips the new-theme snapshot from the click origin', async () => {
  const previous = {
    document: globalThis.document,
    matchMedia: globalThis.matchMedia,
    innerWidth: globalThis.innerWidth,
    innerHeight: globalThis.innerHeight,
  };
  let applied = 0;
  let frames: any;
  let options: any;
  try {
    Object.assign(globalThis, {
      innerWidth: 390,
      innerHeight: 844,
      matchMedia: () => ({ matches: false }),
      document: {
        startViewTransition: (apply: () => void) => {
          apply();
          return { ready: Promise.resolve(), skipTransition() {} };
        },
        documentElement: {
          animate: (f: any, o: any) => {
            frames = f;
            options = o;
            return { finished: Promise.resolve() };
          },
        },
      },
    });
    await revealTheme(() => applied++, { x: 100, y: 200 }, true, true);
    assert.equal(applied, 1);
    assert.equal(frames.clipPath[0], 'circle(0px at 100px 200px)');
    assert.equal(options.pseudoElement, '::view-transition-new(root)');
    assert.equal(options.duration, 420);
  } finally {
    Object.assign(globalThis, previous);
  }
});

test('reduced motion applies the theme without starting reveal or opacity animation', async () => {
  const previous = {
    document: globalThis.document,
    matchMedia: globalThis.matchMedia,
  };
  let applied = false;
  try {
    Object.assign(globalThis, {
      matchMedia: () => ({ matches: true }),
      document: {
        startViewTransition() {
          throw new Error('reveal must be disabled');
        },
        querySelector() {
          throw new Error('animation must be disabled');
        },
      },
    });
    await revealTheme(
      () => {
        applied = true;
      },
      { x: 0, y: 0 },
      true,
      true,
    );
    assert.equal(applied, true);
  } finally {
    Object.assign(globalThis, previous);
  }
});
