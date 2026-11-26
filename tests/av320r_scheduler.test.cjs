'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../dashboard/av320_scheduler.js');
test('callback intervals reconcile previous work plus outside gap',()=>{
 const p=create();assert.equal(p.begin(0),false);p.enable(true);
 for(let i=0;i<1000;i++){assert.equal(p.begin(i*20),true);assert.equal(p.end(i*20+4),true)}
 const s=p.status();assert.equal(s.callbacks,1000);assert.equal(s.intervals,999);
 assert.equal(s.intervalMs,19980);assert.equal(s.executionMs,4000);assert.equal(s.gapMs,15984);
 assert.equal(s.intervalMs,s.executionMs-4+s.gapMs);
 assert.equal(s.maxGapMs,16);assert.equal(s.invalid,0);
 p.enable(false);assert.equal(p.status().callbacks,0);assert.equal(p.begin(0),false);
});
test('invalid clock samples do not produce negative durations',()=>{
 const p=create();p.enable(true);p.begin(10);assert.equal(p.end(9),false);
 assert.equal(p.status().invalid,1);assert.equal(p.status().executionMs,0);
});
