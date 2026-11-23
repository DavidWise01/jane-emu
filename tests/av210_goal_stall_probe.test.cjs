'use strict';
const assert=require('node:assert/strict');
const {create}=require('../dashboard/av208_adaptive_gameplay.js');
const p=create(),actions=['RIGHT','LEFT','A','B','START'];
const state=(frame,x=120,palette=0x30,actor='JANE',mode=1)=>({
 root:'run',rom:'homebrew',actor,frame,mode,x,palette,actions
});
for(let n=0;n<3;n++){
 const f=10+n*20,request=p.offer(state(f));
 assert.equal(request.button,'RIGHT');
 assert.equal(p.complete({...state(f+10),button:'RIGHT'}),false);
}
assert.equal(p.snapshot().probeNext,true,'three actual ineffective results justify ONE probe');
let probe=p.offer(state(72));
assert.equal(probe.button,'LEFT','opposite direction checks controller response');
assert.equal(p.snapshot().probes,1);
assert.equal(p.complete({...state(80,116),button:'LEFT'}),true,'probe can show real responsiveness');
assert.equal(p.snapshot().phase,0,'contrary probe cannot complete RIGHT objective');
assert.equal(p.snapshot().probeNext,false);
assert.equal(p.offer(state(90,116)).button,'RIGHT','return to original goal');
assert.equal(p.complete({...state(101,138),button:'RIGHT'}),true);
assert.equal(p.snapshot().phase,1,'goal only advances on actual X threshold');
assert.equal(p.offer(state(102,138)).button,'A');
assert.equal(p.complete({...state(111,138,0x16),button:'A'}),true);
assert.equal(p.snapshot().phase,2);
assert.equal(p.offer(state(120,138,0x16,'TOPH')).button,'RIGHT','owner resets goal');
assert.equal(p.snapshot().probes,0);
assert.equal(p.snapshot().streak,0);
assert.equal(p.offer(state(130,138,0x16,'TOPH',2)),null,'defeat disallows an offer');
const q=create();for(let n=0;n<3;n++){
 let f=10+20*n;
 assert.equal(q.offer(state(f)).button,'RIGHT');
 assert.equal(q.complete({...state(f+5),button:'RIGHT'}),false);
}
assert.equal(q.offer(state(70)).button,'LEFT');
assert.equal(q.complete({...state(80),button:'LEFT'}),false);
assert.equal(q.snapshot().phase,0,'even ineffective probe never advances objective');
assert.equal(q.offer(state(90)).button,'RIGHT');
console.log('AV-210 stalled-goal probe test PASS (synthetic RAM inputs, not browser gameplay)');
