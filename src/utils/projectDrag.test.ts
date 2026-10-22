import test from 'node:test';
import assert from 'node:assert/strict';
import { projectDragLayout } from './projectDrag.ts';
const slots=[{id:'a',top:100,height:120},{id:'b',top:232,height:180},{id:'c',top:424,height:100}];
test('drag preview shifts peers while keeping geometry stable and computes the final slot',()=>{
 assert.deepEqual(projectDragLayout(slots,'a',20).shifts,{});
 const down=projectDragLayout(slots,'a',340);
 assert.deepEqual(down.target,{id:'c',after:true});assert.deepEqual(down.shifts,{b:-132,c:-132});
 assert.equal(down.top,304);
 const up=projectDragLayout(slots,'c',-360);
 assert.deepEqual(up.target,{id:'a',after:false});assert.deepEqual(up.shifts,{a:112,b:112});assert.equal(up.top,-324);
});
test('a stationary or missing project never commits a new position; isolated slots stay in place',()=>{
 assert.equal(projectDragLayout(slots,'b',0).target,null);
 assert.equal(projectDragLayout(slots,'missing',100).target,null);
 assert.equal(projectDragLayout([slots[0]],'a',300).target,null);
 assert.equal(projectDragLayout(slots.map(s=>({...s,top:s.top+500})),'a',340).top,304);
});
