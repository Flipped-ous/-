import test from 'node:test';
import assert from 'node:assert/strict';
import { getMotionConfig } from './motionConfig.ts';
test('motion levels retain gesture timing while limiting decorative motion', () => {
  assert.equal(getMotionConfig('simple').allowScaleEffects, false);
  assert.equal(getMotionConfig('standard').allowParallax, false);
  assert.equal(getMotionConfig('rich').allowParallax, true);
  assert.ok(getMotionConfig().durations.confirmedSwipe >= 280);
  assert.ok(getMotionConfig().durations.confirmedSwipe <= 350);
});
test('disabling motion sets all time-based effects to zero', () => {
  assert.ok(
    Object.values(getMotionConfig('rich', false).durations).every(
      (value) => value === 0,
    ),
  );
  assert.equal(getMotionConfig('rich', false).allowParallax, false);
});
