'use strict';
/* AV-205: a single owner, a single bounded START offer; synthetic-policy test.
 * Actual NES button delivery remains a separate Chromium acceptance gate.
 */
const assert=require('node:assert/strict');
const {create}=require('../dashboard/av205_priority_start.js');
const p=create({maxAttempts:4,gapFrames:48,holdFrames:12});
const ctx=(frame,mode,actor='JANE')=>({root:'root',rom:'loss-rom',actor,frame,mode});
const first={...ctx(12,0),evidenceId:'boot'};
assert.equal(p.offer(ctx(12,0)),null);
assert.equal(p.arm(first).ok,true);
assert.equal(p.offer(ctx(12,0)).button,'START');
assert.equal(p.offer(ctx(25,0)),null,'one action per frame window');
assert.equal(p.offer(ctx(60,0)).button,'START');
assert.equal(p.offer(ctx(110,0)).button,'START');
assert.equal(p.offer(ctx(165,0)).button,'START');
assert.equal(p.offer(ctx(220,0)),null,'attempts are bounded');
assert.equal(p.snapshot().pending.attempts,4);
assert.equal(p.snapshot().pending.completions,0,'offers are not completed actions');
assert.equal(p.completed({...ctx(170,0),button:'A'}),false,'A is not START');
assert.equal(p.completed({...ctx(170,0),button:'START'}),true,'actual START receipt accepted');
assert.equal(p.snapshot().pending.completions,1,'exactly one receipt recorded');
assert.equal(p.completed({...ctx(171,0,'TOPH'),button:'START'}),false,'other owner cannot complete');

assert.equal(p.offer(ctx(230,1)),null,'playing RAM stops retries');
assert.equal(p.snapshot().pending,null);
assert.equal(p.arm({...ctx(300,2,'TOPH'),evidenceId:'death1'}).ok,true);
assert.equal(p.offer(ctx(300,2,'TOPH')).button,'START');
assert.equal(p.offer(ctx(310,2,'PATRICIA')),null,'old owner loses authority');
assert.equal(p.snapshot().pending,null);
assert.equal(p.arm({...ctx(400,2,'PATRICIA'),evidenceId:'death2'}).ok,true);
assert.equal(p.offer(ctx(400,1,'PATRICIA')),null,'recovered scene cancels START');
assert.equal(p.snapshot().pending,null);
assert.equal(p.arm({...ctx(500,2),evidenceId:'death3'}).ok,true);
assert.equal(p.offer(ctx(500,0)),null,'unexpected title-state change cancels');
assert.equal(p.snapshot().history.filter(x=>x.event==='START_OFFER').length,5);
console.log('AV-206 START offer/completion separation regression passed; no live browser gameplay certified');
