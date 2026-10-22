import { reorderProject } from './projectRepository.ts';
import { moveProject, sortProjects } from '../utils/projectOrder.ts';
import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { removeProject, undoRemoveProject } from './projectRepository.ts';
import { saveStorageData, loadStorageData, openDB } from './storage.ts';
import { initializeNotes, getNotes, saveNote, publishCommittedNotes } from './notesRepository.ts';
import { newNote } from '../utils/notes.ts';
import { belongsToProject, detachProject, restoreProject } from '../utils/projectRelations.ts';
import { syncRepository } from './sync.ts';
import type { Project, Task } from '../types/index.ts';
const stamp = '2026-10-19T12:00:00.000Z';
const project: Project = { id: 'p1', name: '同名项目', description: '', status: 'active', createdAt: stamp, updatedAt: stamp };
const task = (id: string, projectId?: string): Task => ({ id, title: id, projectId, project: '同名项目', status: 'pending', priority: 'normal', createdAt: stamp, updatedAt: stamp });

test('project IDs take precedence over legacy names; deletion does not detach another same-named project', () => {
 const other = { ...project, id: 'p2' };
 assert.equal(belongsToProject(task('other', 'p2'), project), false);
 assert.equal(belongsToProject(task('legacy'), project), true);
 const result = detachProject([project, other], [task('own', 'p1'), task('other', 'p2'), task('legacy')], [], 'p1', stamp);
 assert.equal(result.tasks[0].projectId, undefined);
 assert.equal(result.tasks[1].projectId, 'p2');
 assert.equal(result.tasks[2].project, '同名项目');
 assert.equal(result.projects.length, 1);
});
test('undo restores original position but does not resurrect deleted contents or overwrite edits', () => {
 const detached = detachProject([project], [task('a', 'p1'), task('b', 'p1')], [], 'p1', stamp);
 const edited = [{ ...detached.tasks[0], title: '编辑后的内容' }];
 const restored = restoreProject([], edited, [], detached.undo, stamp);
 assert.equal(restored.projects[0].id, 'p1');
 assert.equal(restored.tasks.length, 1);
 assert.equal(restored.tasks[0].title, '编辑后的内容');
 assert.equal(restored.tasks[0].projectId, undefined);
 assert.equal(restored.skipped, 2);
});
test('project removal atomically retains task/note data, updates sync revisions and supports restoration', async () => {
 await saveStorageData({ schemaVersion: 3, tasks: [task('a', 'p1'), task('legacy')], projects: [project], reviews: [], devices: [], settings: null });
 await initializeNotes([]);
 const note = newNote('p1'); note.title = '保留正文'; note.document = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '知识内容保持不变' }] }] };
 await saveNote(note);
 const beforeNote = getNotes()[0];
 const deleted = await removeProject('p1'); publishCommittedNotes(deleted.notes);
 const stored = await loadStorageData();
 assert.equal(stored?.projects.length, 0);
 assert.equal(stored?.tasks.length, 2);
 assert.ok(stored?.tasks.every(task => !task.projectId && task.project === ''));
 assert.equal(deleted.notes[0].projectId, undefined);
 assert.deepEqual(deleted.notes[0].document, beforeNote.document);
 assert.ok(deleted.notes[0].revision > beforeNote.revision);
 const changes = await syncRepository.exportChanges();
 assert.equal(changes.records.find(row => row.id === 'projects:p1')?.deleted, true);
 assert.equal(changes.records.find(row => row.id === `notes:${note.id}`)?.deleted, false);
 const restored = await undoRemoveProject(deleted.undo); publishCommittedNotes(restored.notes);
 assert.equal(restored.tasks[0].projectId, 'p1');
 assert.equal(restored.tasks[1].project, '同名项目');
 assert.equal(restored.notes[0].projectId, 'p1');
 assert.equal(restored.skipped, 0);
 assert.equal((await syncRepository.exportChanges()).records.find(row => row.id === 'projects:p1')?.deleted, false);
});
test('an aborted deletion leaves project, tasks and notes intact and can be retried', async () => {
 const before = await loadStorageData();
 const db = await openDB(); const original = db.transaction.bind(db);
 db.transaction = ((stores: string | Iterable<string>, mode?: IDBTransactionMode) => {
   const tx = original(stores, mode);
   if (mode === 'readwrite' && Array.from(typeof stores === 'string' ? [stores] : stores).includes('projects')) queueMicrotask(() => tx.abort());
   return tx;
 }) as typeof db.transaction;
 try { await assert.rejects(removeProject('p1')); } finally { db.transaction = original; }
 const after = await loadStorageData();
 assert.deepEqual(after?.projects, before?.projects);
 assert.deepEqual(after?.tasks, before?.tasks);
 assert.deepEqual(after?.notes, before?.notes);
 const retried = await removeProject('p1');
 assert.equal(retried.projects.length, 0);
 await undoRemoveProject(retried.undo);
});

test('project ordering preserves hidden projects, supports both directions and ignores stale IDs',()=>{
 const rows=['a','hidden','b','c'].map((id,order)=>({...project,id,order,status:id==='hidden'?'paused' as const:'active' as const}));
 const moved=moveProject(rows,'a','c',true,stamp);
 assert.deepEqual(moved.map(p=>p.id),['hidden','b','c','a']);
 assert.equal(moved.find(p=>p.id==='hidden')?.status,'paused');
 assert.deepEqual(moveProject(moved,'a','b',false,stamp).map(p=>p.id),['hidden','a','b','c']);
 assert.deepEqual(moveProject(rows,'gone','a',false,stamp),rows);
 assert.deepEqual(sortProjects([...moved].reverse()).map(p=>p.id),moved.map(p=>p.id));
});
test('project drag order persists through reload and sync revisions; failed transaction changes nothing',async()=>{
 const rows=['a','b','c'].map((id,order)=>({...project,id,order}));
 await saveStorageData({schemaVersion:3,projects:rows,tasks:[],reviews:[],devices:[],settings:null});
 await reorderProject('a','c',true);
 assert.deepEqual((await loadStorageData())?.projects.map(p=>p.id),['b','c','a']);
 const change=(await syncRepository.exportChanges()).records.find(row=>row.id==='projects:a');
 assert.equal((change?.value as Project).order,2);
 const db=await openDB(),original=db.transaction.bind(db);
 db.transaction=((stores:string | Iterable<string>,mode?:IDBTransactionMode)=>{
   const tx=original(stores,mode);
   if(mode==='readwrite' && Array.from(typeof stores==='string'?[stores]:stores).includes('projects')) queueMicrotask(()=>tx.abort());
   return tx;
 }) as typeof db.transaction;
 try { await assert.rejects(reorderProject('a','b',false)); } finally { db.transaction=original; }
 assert.deepEqual((await loadStorageData())?.projects.map(p=>p.id),['b','c','a']);
});
