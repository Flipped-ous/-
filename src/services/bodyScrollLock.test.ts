import test from 'node:test';
import assert from 'node:assert/strict';
import { createScrollLock } from './bodyScrollLock.ts';

test('nested scroll locks restore the original style in either closing order', () => {
  for (const parentFirst of [true, false]) {
    const style = { overflow: 'auto' };
    const hold = createScrollLock(style);
    const parent = hold(), child = hold();
    const first = parentFirst ? parent : child;
    const last = parentFirst ? child : parent;
    first();
    first(); // React cleanup or repeated dismissal must be idempotent.
    assert.equal(style.overflow, 'hidden');
    last();
    assert.equal(style.overflow, 'auto');
    const next = hold();
    next();
    assert.equal(style.overflow, 'auto');
  }
});
