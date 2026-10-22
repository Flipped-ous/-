import test from 'node:test';
import assert from 'node:assert/strict';
import { readBackupReceipt, recordBackupReceipt } from './backupReceipt.ts';
function memory() { let value: string | null=null; return { getItem:()=>value,setItem:(_key:string,next:string)=>{value=next;} }; }
test('cancelled export and unconfirmed browser download never replace a successful backup receipt',()=>{
 const storage=memory(),stamp=new Date('2026-10-23T00:00:00Z');
 assert.equal(readBackupReceipt(storage),undefined);
 assert.equal(recordBackupReceipt({status:'saved'},storage,stamp),stamp.toISOString());
 assert.equal(recordBackupReceipt({status:'cancelled'},storage),undefined);
 assert.equal(recordBackupReceipt({status:'download-started'},storage),undefined);
 assert.equal(readBackupReceipt(storage),stamp.toISOString());
});
test('invalid or unavailable device receipts are not displayed as successful backups',()=>{
 assert.equal(readBackupReceipt({getItem:()=> 'bad',setItem:()=>{}}),undefined);
 const broken={getItem:()=>{throw Error('unavailable');},setItem:()=>{throw Error('full');}};
 assert.equal(readBackupReceipt(broken),undefined);
 assert.throws(()=>recordBackupReceipt({status:'saved'},broken),/full/);
});
