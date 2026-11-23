'use strict';
/* AV-204 — cycle-scoped fail-closed recovery regression (synthetic inputs). */
const assert=require('node:assert/strict');
const {create}=require('../dashboard/av200_defeat_restart.js');
const gate=create(),root='one-NES-session',rom='av201-cartridge';
const base=(frame,extra={})=>({root,rom,frame,actor:frame<330?'JANE':frame<650?'TOPH':'PATRICIA',...extra});
const defeat=(frame,id)=>({source:'cartridge-observed',verified:true,gameOver:true,root,rom,frame,evidenceId:id});
const playing=frame=>({source:'cartridge-observed',verified:true,playing:true,root,rom,frame});
const action=(endFrame,source='nes-completed-action')=>({source,button:'START',root,rom,endFrame});
assert.equal(gate.observe(base(100,{manualLifeLost:true})).completedCount,0);
assert.equal(gate.observe(base(200,{defeat:defeat(200,'loss-1')})).defeat.frame,200);
assert.equal(gate.observe(base(240,{action:action(239)})).start.frame,239);
assert.equal(gate.observe(base(300,{playing:playing(300)})).completedCount,1);
// A distinct genuine loss after recovery must open a fresh episode.
let s=gate.observe(base(400,{defeat:defeat(400,'loss-2')}));
assert.equal(s.completedCount,1);
assert.equal(s.start,null);
assert.equal(s.resumed,null);
assert.equal(s.completed[0].defeat.evidenceId,'loss-1');
// Replayed, pre-defeat START is forbidden.
assert.equal(gate.observe(base(410,{action:action(239)})).start,null);
assert.equal(gate.observe(base(420,{action:action(419,'offered-action')})).start,null);
assert.equal(gate.observe(base(440,{action:action(439)})).start.frame,439);
assert.equal(gate.observe(base(500,{playing:playing(500)})).completedCount,2);
s=gate.observe(base(600,{defeat:defeat(600,'loss-3')}));
assert.equal(s.completedCount,2);
assert.equal(s.start,null);
assert.equal(gate.observe(base(630,{action:action(629)})).start.frame,629);
s=gate.observe(base(700,{playing:playing(700)}));
assert.equal(s.completedCount,3);
assert.equal(s.completed.length,2);
assert.deepEqual(s.events.filter(x=>x.kind==='DEFEAT_OBSERVED').map(x=>x.evidenceId),
 ['loss-1','loss-2','loss-3']);
assert.equal(gate.observe(base(701,{manualLifeLost:true})).completedCount,3);
console.log('AV-204: multi-cycle gate assertions passed (synthetic data; not browser gameplay)');
