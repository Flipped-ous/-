import test from 'node:test';
import assert from 'node:assert/strict';
import { NavigationVisibility } from './navigationVisibility.ts';

test('navigation stays hidden until every dialog has closed, including duplicate cleanup', () => {
  const state = new NavigationVisibility();
  const closeTask = state.holdDialog();
  const closeReview = state.holdDialog();
  assert.equal(state.getSnapshot(), true);
  closeTask();
  closeTask();
  assert.equal(state.getSnapshot(), true);
  closeReview();
  assert.equal(state.getSnapshot(), false);
});

test('typing hides navigation immediately and IME dismissal restores it even with retained DOM focus', () => {
  const state = new NavigationVisibility();
  state.setEditing(true);
  assert.equal(state.getSnapshot(), true);
  state.setKeyboardVisible(true);
  state.setKeyboardVisible(false);
  assert.equal(state.getSnapshot(), false);
  state.setEditing(true);
  assert.equal(state.getSnapshot(), true);
  state.setEditing(false);
  assert.equal(state.getSnapshot(), false);
});

test('IME dismissal cannot reveal navigation underneath an open dialog', () => {
  const state = new NavigationVisibility();
  const close = state.holdDialog();
  state.setEditing(true);
  state.setKeyboardVisible(true);
  state.setKeyboardVisible(false);
  assert.equal(state.getSnapshot(), true);
  close();
  assert.equal(state.getSnapshot(), false);
});

test('keyboard observers receive dismissal even while another dialog keeps navigation hidden',()=>{
 const state=new NavigationVisibility(),values:boolean[]=[];const close=state.holdDialog();
 const unsubscribe=state.subscribeKeyboard(()=>values.push(state.isKeyboardVisible()));
 state.setEditing(true);state.setKeyboardVisible(true);state.setKeyboardVisible(true);state.setKeyboardVisible(false);
 assert.deepEqual(values,[true,false]);assert.equal(state.getSnapshot(),true);
 unsubscribe();state.setKeyboardVisible(true);assert.deepEqual(values,[true,false]);close();
});
