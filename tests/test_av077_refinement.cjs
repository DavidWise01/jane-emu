const assert=require('node:assert/strict');
const p=require('../dashboard/av077_refinement.js');
const q={state:'ARMED',rom:'test-rom',context:'screen-A',button:'START',word:'START'};
function rec(root,bp,context='screen-A',rom='test-rom'){
 return {kind:'experiment_feedback',source_root:root,pixel_change_bp:bp,rom,context,button:'START',status:'OBSERVED_UNLABELED'}
}
function check(name,fn){fn();console.log('PASS '+name)}
check('insufficient independent roots withholds forecast',()=>{
 const r=p.freeze(q,[rec('one',100),rec('one',200),rec('two',300)]);
 assert.equal(r.status,'UNTRAINED');assert.equal(r.root_count,2);
});
check('three independent roots produce frozen numeric range',()=>{
 const r=p.freeze(q,[rec('a',900),rec('b',1100),rec('c',1300)]);
 assert.equal(r.status,'FORECAST');assert.equal(r.predicted_pixel_bp,1100);
 assert.equal(r.prediction_low_bp,650);assert.equal(r.prediction_high_bp,1550);
});
check('duplicate replay and wrong cartridge or context excluded',()=>{
 const r=p.freeze(q,[rec('a',900),rec('a',1000),rec('b',1100),rec('c',1300),
   rec('wrong-rom',9000,'screen-A','different'),rec('wrong-screen',8000,'screen-B')]);
 assert.equal(r.root_count,3);assert.equal(r.predicted_pixel_bp,1100);
});
check('inside frozen band is observation not beneficial result',()=>{
 const r=p.freeze(q,[rec('a',900),rec('b',1100),rec('c',1300)]);
 const judgement=p.compare(r,1200,'distinct-new-root');assert.equal(judgement.status,'WITHIN_BAND');
 assert.equal(judgement.prediction_error_bp,100);
});
check('unanticipated pixel change requires model refinement',()=>{
 const r=p.freeze(q,[rec('a',900),rec('b',1100),rec('c',1300)]);
 assert.equal(p.compare(r,2500,'distinct-new-root').status,'BOUNDARY_MISS');
});
check('without forecast no accuracy can be claimed',()=>{
 const r=p.freeze(q,[rec('a',900),rec('b',1100)]);
 const z=p.compare(r,1200,'distinct-new-root');assert.equal(z.status,'NEEDS_ROOTS');assert.equal(z.prediction_error_bp,null);
});
check('invalid rooted response always abstains',()=>assert.equal(p.compare({status:'FORECAST'},-1,'root').status,'ABSTAIN'));
check('attach preserves unlabeled record and frozen metrics',()=>{
 const r=p.freeze(q,[rec('a',900),rec('b',1100),rec('c',1300)]),j=p.compare(r,1200,'distinct-new-root');
 const base={kind:'experiment_feedback',rom:'test-rom',status:'OBSERVED_UNLABELED'};
 const a=p.attach(base,r,j);
 assert.equal(a.prediction_error_bp,100);
 assert.equal(a.refinement_state,'WITHIN_BAND');assert.equal(a.outcome,undefined);
});
console.log('AV-077: 8 checks passed');
