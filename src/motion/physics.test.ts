import test from 'node:test';
import assert from 'node:assert/strict';
import { magneticOffset, revealRadius } from './physics.ts';

test('magnetic assistance is local, bounded, and leaves distant pointers alone', () => {
  const target = { left: 100, top: 100, right: 300, bottom: 160 };
  assert.equal(magneticOffset(40, 120, target), null);
  const near = magneticOffset(80, 120, target)!;
  assert.ok(near.x > 0 && near.x <= 4);
  assert.equal(near.y, 0);
  const inside = magneticOffset(150, 120, target)!;
  assert.equal(inside.x, 0);
  assert.equal(inside.y, 0);
});

test('theme reveal reaches every corner from either edge or keyboard origin', () => {
  for (const [x, y] of [
    [0, 0],
    [390, 844],
    [190, 420],
  ]) {
    const radius = revealRadius(x, y, 390, 844);
    for (const [cx, cy] of [
      [0, 0],
      [390, 0],
      [0, 844],
      [390, 844],
    ])
      assert.ok(radius >= Math.hypot(x - cx, y - cy));
  }
});
