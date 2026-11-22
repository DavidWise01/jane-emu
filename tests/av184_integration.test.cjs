'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {evaluate,REQUIRED,SCHEMA}=require('../dashboard/av184_integration.js');
const ctx={root:'run-1',rom:'test.rom',frame:1000,actor:'JANE'};
let a=evaluate({context:ctx,now:'2026-11-22T00:00:00Z'});
assert.equal(a.verdict,'INCOMPLETE');
assert.equal(a.phaseGateVerified,false);
assert.equal(a.phaseProgress,87.5);
assert.deepEqual(a.missing,REQUIRED);
const play={latest:{root:'run-1',rom:'test.rom'},events:[{kind:'operator_start_sent',root:'run-1',rom:'test.rom'}]};
const e={root:'run-1',rom:'test.rom',advanced:800,clockFrozen:false};
const handoff={events:[
 {kind:'frame_continuity_observed',root:'run-1',rom:'test.rom',from:'JANE',to:'TOPH'},
 {kind:'frame_continuity_observed',root:'run-1',rom:'test.rom',from:'TOPH',to:'PATRICIA'}
]};
const endurance={session:e,threePlayerCycleSeen:true};
const recovery={events:[
 {kind:'start_recovery_requested',root:'run-1',rom:'test.rom'},
 {kind:'recovery_observed',root:'run-1',rom:'test.rom'}
]};
a=evaluate({context:ctx,playability:play,handoff,endurance,recovery});
assert.equal(a.observedSignals,5);
assert.equal(a.allSignalsObserved,true);
assert.equal(a.verdict,'READY_FOR_LIVE_REVIEW');
assert.equal(a.phaseGateVerified,false,'local observations never auto-graduate to 100%');
assert.equal(a.phaseProgress,87.5);
a=evaluate({context:{...ctx,rom:'other.rom'},playability:play,handoff,endurance,recovery});
assert.equal(a.verdict,'INCOMPLETE','cannot borrow evidence from another cartridge');
a=evaluate({context:ctx,playability:play,handoff,endurance,
 recovery:{events:[{kind:'start_recovery_requested',root:'run-2',rom:'test.rom'},
 {kind:'recovery_observed',root:'run-2',rom:'test.rom'}]}});
assert.equal(a.checks.recoveryEpisode.observed,false,'cannot borrow recovery from another session');
a=evaluate({context:ctx,playability:play,handoff:{events:[...handoff.events,{kind:'continuity_timeout',root:'run-1',rom:'test.rom'}]},endurance,recovery});
assert.equal(a.checks.threePlayerContinuity.observed,false,'timeout invalidates continuity');
a=evaluate({context:ctx,playability:play,handoff,endurance:{...endurance,session:{...e,advanced:30}},recovery});
assert.equal(a.checks.frameProgress.observed,false,'60 frames are not endurance');
const html=fs.readFileSync(path.join(__dirname,'../dashboard/arena.html'),'utf8');
assert.ok(html.includes('<script src="./av184_integration.js"></script>'));
assert.ok(html.includes('<iframe id="game"'));
assert.ok(html.includes('setInterval(sample,500);renderPlayers();init()'));
assert.ok(html.includes('jane-handoff-accepted'));
assert.ok(html.includes('srcdoc=html'));
new vm.Script(fs.readFileSync(path.join(__dirname,'../dashboard/av184_integration.js'),'utf8'));
console.log('AV-184 integration evidence isolation, fail-closed verdict, and emulator preservation passed');
