const assert=require('node:assert/strict');const p=require('../dashboard/av081_effect.js');function test(n,f){f();console.log('PASS '+n)}
const base={rom:'rom1',context:'title01',arm:'baseline',run_root:'run1',start_frame:100};
const planned=p.plan(base);
function done(arm,i,frames,context='title01',rom='rom1'){return p.close(p.plan({rom,context,arm,run_root:'run'+i,start_frame:100}),100+frames,true)}
test('predeclare metric and arm before life loss',()=>{assert.equal(planned.state,'ARMED');assert.equal(planned.criterion,'coached_median_minus_baseline_median_positive')});
test('must confirm death to record survival',()=>assert.equal(p.close(planned,200,false).state,'ABSTAIN'));
test('must observe positive frame duration',()=>assert.equal(p.close(planned,99,true).state,'ABSTAIN'));
test('preregistered coached attempt records frames not a reward',()=>{
 const v=done('coached',7,300);assert.equal(v.state,'COMPLETE');assert.equal(v.survival_frames,300);assert.equal(v.benefit,'NOT_VERIFIED_CAUSAL');
});
test('missing comparison attempts abstains',()=>assert.equal(p.assess([done('baseline',1,100)]).state,'INSUFFICIENT'));
test('same run repeated does not create independent attempts',()=>{
 const rows=[done('baseline',1,100),done('baseline',1,200),done('baseline',2,200),done('coached',3,300)];
 assert.equal(p.assess(rows).baseline,2);
});
test('three per arm: positive median gives only promising proxy',()=>{
 const rows=[done('baseline',1,80),done('baseline',2,100),done('baseline',3,120),
 done('coached',4,150),done('coached',5,200),done('coached',6,250)];
 const r=p.assess(rows);assert.equal(r.state,'PROMISING_PROXY');assert.equal(r.median_difference_frames,100);assert.equal(r.causal_claim,false);assert.equal(r.lesson_retained,false);
});
test('worse median does not retain teaching',()=>{
 const rows=[done('baseline',1,300),done('baseline',2,400),done('baseline',3,500),
 done('coached',4,100),done('coached',5,200),done('coached',6,300)];
 assert.equal(p.assess(rows).state,'WORSE_PROXY');
});
test('same session roots across two arms do not double count',()=>{
 const rows=[done('baseline',1,100),done('coached',1,200),done('baseline',2,100),done('coached',3,200)];
 assert.equal(p.assess(rows).state,'INSUFFICIENT');
});
test('mixed cartridges or starting contexts are refused',()=>{
 assert.equal(p.assess([done('baseline',1,100),done('coached',2,200,'another')]).state,'CONTESTED');
 assert.equal(p.assess([done('baseline',1,100),done('coached',2,200,'title01','other')]).state,'CONTESTED');
});
console.log('AV-081: 10 tests passed');