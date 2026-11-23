'use strict';
const assert=require('node:assert/strict');
const {create}=require('../dashboard/av213_fault_isolator.js');
const sample=(frame,nowMs,mode=1,extra={})=>({
 root:'one-NES',rom:'loss-rom',actor:'JANE',frame,nowMs,mode,...extra
});
const types=p=>p.snapshot().events.map(e=>e.kind);
const c=create();
c.ingest(sample(10,0));c.ingest(sample(10,2200));
assert.ok(types(c).includes('NES_FRAME_STALLED'),'clock stop identified from real-frame absence');
c.ingest(sample(11,2300));assert.equal(types(c).filter(x=>x==='NES_FRAME_STALLED').length,1,'no duplicate fault');
const start=create();
start.ingest(sample(10,0,0,{startPolicy:{pending:{evidenceId:'boot',armedFrame:10,attempts:1,completions:0}}}));
start.ingest(sample(131,2000,0,{startPolicy:{pending:{evidenceId:'boot',armedFrame:10,attempts:4,completions:0}}}));
assert.ok(types(start).includes('START_NOT_COMPLETED'),'offered START is not proof of completed START');
const completed=create();
completed.ingest(sample(10,0,0,{startPolicy:{pending:{evidenceId:'boot',armedFrame:10,attempts:1,completions:0}}}));
completed.ingest(sample(150,2100,0,{startPolicy:{pending:{evidenceId:'boot',armedFrame:10,attempts:1,completions:1}}}));
assert.ok(!types(completed).includes('START_NOT_COMPLETED'),'completion receipt suppresses absent receipt fault');
const action=create();
action.ingest(sample(10,0,1,{gameplay:{pending:{startFrame:10,button:'RIGHT',actor:'JANE'},history:[]}}));
action.ingest(sample(105,1900,1,{gameplay:{pending:{startFrame:10,button:'RIGHT',actor:'JANE'},history:[]}}));
assert.ok(types(action).includes('GAMEPLAY_RECEIPT_MISSING'));
const title=create();title.ingest(sample(10,0,0));title.ingest(sample(251,4200,0));
assert.ok(types(title).includes('TITLE_WITHOUT_START_REQUEST'));
const defeat=create();defeat.ingest(sample(300,0,1));defeat.ingest(sample(310,100,2));defeat.ingest(sample(440,2200,2));
assert.ok(types(defeat).includes('DEFEAT_WITHOUT_HANDOFF'));
const handoff=create();handoff.ingest(sample(300,0,1));
handoff.ingest(sample(310,100,2));handoff.ingest(sample(560,2600,2,{
 actor:'TOPH',monitor:{observations:[{kind:'AV202_REAL_DEFEAT_HANDOFF',frame:312,to:'TOPH'}]}
}));
assert.ok(types(handoff).includes('HANDOFF_WITHOUT_RESTART'));
assert.ok(!types(handoff).includes('DEFEAT_WITHOUT_HANDOFF'));
const wrong=create();wrong.ingest(sample(100,0));wrong.ingest(sample(90,100,1,{root:'different'}));
assert.equal(wrong.snapshot().events.length,0,'foreign session cannot inherit fault claims');
assert.equal(wrong.snapshot().readOnly,true);
console.log('AV-213 fault isolation regression passed: clock, START, action receipt, defeat, transfer (controlled observations)');
