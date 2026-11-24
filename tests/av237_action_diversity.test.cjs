'use strict';
const assert=require('node:assert/strict');
const {create}=require('../dashboard/av190_gameplay.js');
const p=create(),b={root:'r',rom:'test.nes',actor:'JANE',stage:'playing',actions:['RIGHT','LEFT']};
for(const f of [1,19,37]){assert.equal(p.offer({...b,actions:['RIGHT'],frame:f}),'RIGHT');assert.equal(p.result({...b,frame:f+1,button:'RIGHT',delta:0,completed:true}),true);}
assert.equal(p.snapshot().zeroChangeStreak,3);
assert.equal(p.offer({...b,frame:55,bias:{RIGHT:2,LEFT:-4}}),'LEFT');
assert.equal(p.result({...b,frame:56,button:'LEFT',delta:2,completed:true}),true);
assert.equal(p.snapshot().zeroChangeStreak,0);
assert.equal(p.offer({...b,frame:57,actions:['RIGHT']}),'RIGHT','cached choice must remain legal');
assert.equal(p.offer({...b,frame:73,stage:'title menu'}),null);
assert.equal(p.offer({...b,frame:73,actor:'TOPH'}),'RIGHT');
assert.equal(p.snapshot().zeroChangeStreak,0);
console.log('AV-237 bounded zero-change probe, legal cache and owner isolation PASS');
