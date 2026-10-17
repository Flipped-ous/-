import test from 'node:test';
import assert from 'node:assert/strict';
import { getMotionConfig, getPageMotionConfig } from './motionConfig.ts';
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

test('today and tasks stay static in every motion tier without changing other pages', () => {
  for (const level of ['simple', 'standard', 'rich'] as const) {
    for (const page of ['today', 'tasks']) {
      const config = getPageMotionConfig(level, true, page);
      assert.ok(Object.values(config.durations).every((value) => value === 0));
      assert.equal(config.allowParallax, false);
      assert.equal(config.allowScaleEffects, false);
    }
    assert.equal(
      getPageMotionConfig(level, true, 'projects'),
      getMotionConfig(level),
    );
  }
});
