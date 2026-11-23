'use strict';
/* AV-220 — static implementation/evidence freeze, NOT browser gameplay proof. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const freeze=JSON.parse(read('data/phase8-freeze.json'));
const progress=JSON.parse(read('data/phase8-progress.json'));
const prior=JSON.parse(read('data/phase7-freeze.json'));
const arena=read('dashboard/arena.html');
assert.equal(freeze.schema,'jane.phase8.av213-220.freeze.v1');
assert.equal(freeze.implementation.implementedTurns,8);
assert.equal(freeze.implementation.percent,100);
assert.equal(progress.phase,8);
assert.equal(progress.turnsImplemented,8);
assert.equal(progress.implementationPercent,100);
assert.equal(freeze.liveGameplayAcceptance.earnedPercent,0);
assert.equal(progress.liveGameplayAcceptance.earnedPercent,0);
assert.equal(freeze.gates.length,8);
assert.ok(freeze.gates.every(x=>x.verified===false),
 'no uninspected browser test may earn acceptance');
assert.deepEqual(freeze.gates.map(x=>x.step),
 ['AV-213','AV-214','AV-215','AV-216','AV-217','AV-218','AV-219','AV-220']);
assert.equal(prior.implementation.percent,100);
assert.equal((arena.match(/<iframe\b/g)||[]).length,1);
assert.ok(arena.includes('id="game"'));
assert.ok(arena.includes('av186-pane-play')&&arena.includes('av186-pane-learn')&&
 arena.includes('av186-pane-verify'));
assert.ok(arena.includes('JANE_AV202_DEFEAT_HANDOFF')&&
 arena.includes('JANE_AV203_QUEUE_RECOVERY')&&
 arena.includes('JANE_AV201_MONITOR'));
for(const asset of ['av213_fault_isolator.js','av215_input_effects.js',
 'av218_restart_receipt.js','av219_rotation_chain.js'])
 assert.ok(arena.includes('./'+asset),'original NES observer module missing '+asset);
for(const gate of freeze.gates){
 assert.ok(fs.statSync(path.join(root,gate.browserTest)).size>0,
  'missing Chromium evidence-gate file '+gate.browserTest);
}
console.log('AV-220 Phase 8 freeze PASS: 8/8 implementation, zero unverified acceptance promoted, one NES and three tools');
