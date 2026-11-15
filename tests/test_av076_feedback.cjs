const assert=require('node:assert/strict');
const engine=require('../dashboard/av076_feedback.js');
function test(label,fn){fn();console.log('PASS '+label)}
const proposal={state:'PROPOSE',question_id:'q-test-001',rom:'rom123',context:'screen01',word:'START',button:'START',frame:90,missing_roots:3};
const frozen=engine.freeze(proposal);
const trial={rom:'rom123',preHash:'state-before',button:'START',startFrame:91,endFrame:100,delta:.125};
test('freeze accepted only before observation',()=>{assert.equal(frozen.state,'ARMED');assert.equal(frozen.missing_roots,3)});
test('unconfirmed word cannot freeze',()=>{assert.equal(engine.freeze({...proposal,word:'UNKNOWN',state:'READ'}).state,'ABSTAIN')});
test('missing context cannot freeze',()=>{assert.equal(engine.freeze({...proposal,context:''}).state,'ABSTAIN')});
test('matching action closes into observed-only evidence',()=>{
 const out=engine.close(frozen,trial);
 assert.equal(out.state,'OBSERVED');assert.equal(out.pixel_change_bp,1250);assert.equal(out.missing_roots_after,3);
 assert.equal(out.benefit,'UNKNOWN');assert.equal(out.semantic_gain,'UNPROVEN');
 const event=engine.event(out,'state-root-001');assert.equal(event.status,'OBSERVED_UNLABELED');assert.equal(event.kind,'experiment_feedback');assert.equal(event.outcome,undefined);
});
test('a different action does not close successfully',()=>assert.equal(engine.close(frozen,{...trial,button:'A'}).state,'MISMATCH'));
test('another cartridge cannot borrow the question',()=>assert.equal(engine.close(frozen,{...trial,rom:'different'}).state,'MISMATCH'));
test('old frame cannot count as new witness',()=>assert.equal(engine.close(frozen,{...trial,startFrame:90}).state,'MISMATCH'));
test('unrooted trial cannot count',()=>assert.equal(engine.close(frozen,{...trial,preHash:''}).state,'ABSTAIN'));
test('invalid pixel delta is not evidence',()=>assert.equal(engine.close(frozen,{...trial,delta:NaN}).state,'ABSTAIN'));
test('invalid end frame is not evidence',()=>assert.equal(engine.close(frozen,{...trial,endFrame:80}).state,'ABSTAIN'));
console.log('AV-076: 10 checks defined');
