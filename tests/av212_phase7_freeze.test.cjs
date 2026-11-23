'use strict';
/* AV-212: static phase-freeze invariant; NOT a Chromium gameplay certificate. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const freeze=JSON.parse(read('data/phase7-freeze.json'));
const progress=JSON.parse(read('data/phase7-progress.json'));
const arena=read('dashboard/arena.html');
assert.equal(freeze.schema,'jane.phase7.av205-212.freeze.v1');
assert.equal(freeze.implementation.completed,8);
assert.equal(freeze.implementation.percent,100);
assert.equal(freeze.liveGameplayAcceptance.earnedPercent,0);
assert.equal(freeze.gates.length,8);
assert.ok(freeze.gates.every(g=>g.verified===false),
  'a gameplay pass requires independent browser evidence');
assert.equal(progress.implementationPercent,100);
assert.equal(progress.turnsImplemented,8);
assert.equal(progress.liveGameplayAcceptance.earnedPercent,0);
assert.equal((arena.match(/<iframe\b/g)||[]).length,1,'retain one emulator iframe');
assert.ok(arena.includes('id="game"'),'NES iframe missing');
assert.ok(arena.includes('av186-three-tools'),'PLAY/LEARN/VERIFY sidebar missing');
assert.ok(arena.includes('av186-pane-play')&&arena.includes('av186-pane-learn')&&arena.includes('av186-pane-verify'),'three tools missing');
assert.ok(arena.includes('JANE_RUN_CONTEXT')&&arena.includes('JANE_AV202_DEFEAT_HANDOFF'));
for(const file of ['dashboard/av201_defeat_rom.js','dashboard/av205_priority_start.js',
  'dashboard/av208_adaptive_gameplay.js','dashboard/av211_action_exchange.js'])
 assert.ok(arena.includes('./'+path.basename(file)),'game script omitted '+file);
for(const file of ['tests/av205_priority_start.test.cjs','tests/av206_start_receipt.test.cjs',
 'tests/av207_sprite_mechanics.test.cjs','tests/av208_adaptive_gameplay.test.cjs',
 'tests/av209_missed_receipt_recovery.test.cjs','tests/av210_goal_stall_probe.test.cjs',
 'tests/av211_action_exchange.test.cjs'])assert.ok(fs.statSync(path.join(root,file)).size>0);
console.log('AV-212: freeze and original NES/three-tool static invariants PASS; live gameplay remains unverified');
