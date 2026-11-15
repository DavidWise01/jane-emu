const assert=require('node:assert/strict');
const p=require('../dashboard/av078_impact.js');
const base={question_id:'q-078',rom:'game-1',context:'screen-1',button:'START',training_roots:['r1','r2','r3'],baseline:{predicted_pixel_bp:1000},revised:{predicted_pixel_bp:1200}};
const holdout={rom:'game-1',context:'screen-1',button:'START',source_root:'r4',pixel_change_bp:1250};
function check(name,fn){fn();console.log('PASS '+name)}
check('freeze independent-root models before test',()=>assert.equal(p.freeze(base).status,'FROZEN'));
check('duplicate training roots not independent',()=>assert.equal(p.freeze({...base,training_roots:['r1','r1','r2']}).status,'ABSTAIN'));
check('invalid revised model abstains',()=>assert.equal(p.freeze({...base,revised:null}).status,'ABSTAIN'));
check('held-out root cannot share ancestry',()=>assert.equal(p.score(p.freeze(base),{...holdout,source_root:'r2'}).status,'LEAKAGE_BLOCK'));
check('revised forecast reduces error on independent root',()=>{
 const v=p.score(p.freeze(base),holdout);
 assert.equal(v.status,'IMPROVED_PREDICTION');assert.equal(v.baseline_error_bp,250);assert.equal(v.revised_error_bp,50);assert.equal(v.error_reduction_bp,200);assert.equal(v.outcome,'UNLABELED');
});
check('worse revision is rejected as worse forecast',()=>assert.equal(p.score(p.freeze({...base,revised:{predicted_pixel_bp:0}}),holdout).status,'WORSE_PREDICTION'));
check('tie is explicitly represented',()=>assert.equal(p.score(p.freeze({...base,revised:{predicted_pixel_bp:1000}}),holdout).status,'TIED_PREDICTION'));
check('wrong cartridge or context abstains',()=>{
 assert.equal(p.score(p.freeze(base),{...holdout,rom:'other'}).status,'ABSTAIN');
 assert.equal(p.score(p.freeze(base),{...holdout,context:'screen-2'}).status,'ABSTAIN');
});
console.log('AV-078: 8 checks passed');