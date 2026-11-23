'use strict';
/* AV-228: fail closed on Phase 9 freeze, original NES interface, and
 * unsupported browser acceptance. Never infer browser success from tests.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const freeze=JSON.parse(read('data/phase9-freeze.json'));
const progress=JSON.parse(read('data/phase9-progress.json'));
const prior=JSON.parse(read('data/phase8-freeze.json'));
const html=read('dashboard/arena.html');
assert.equal(freeze.schema,'jane.phase9.av221-228.freeze.v1');
assert.equal(freeze.implementation.percent,100);
assert.equal(freeze.implementation.implementedTurns,8);
assert.equal(progress.phase,9);
assert.equal(progress.turnsImplemented,8);
assert.equal(progress.implementationPercent,100);
assert.equal(freeze.liveGameplayAcceptance.earnedPercent,0);
assert.equal(progress.liveGameplayAcceptance.earnedPercent,0);
assert.equal(freeze.liveGameplayAcceptance.verifiedGates,0);
assert.equal(freeze.gates.length,8);
assert.deepEqual(freeze.gates.map(x=>x.turn),
 Array.from({length:8},(_,i)=>'AV-'+(221+i)));
assert.ok(freeze.gates.every(g=>g.verifiedInBrowser===false));
assert.ok(freeze.gates.every(g=>fs.statSync(path.join(root,g.test)).size>0));
assert.equal(prior.implementation.percent,100);
assert.equal((html.match(/<iframe\b/g)||[]).length,1,'only one NES game iframe');
assert.ok(html.includes('id="game"'));
for(const name of ['av186-pane-play','av186-pane-learn','av186-pane-verify'])
 assert.ok(html.includes(name),'missing arcade tab '+name);
for(const name of ['av215_input_effects.js','av218_restart_receipt.js',
 'av219_rotation_chain.js','av226_life_effects.js'])
 assert.ok(html.includes('./'+name),'missing original NES evidence module '+name);
assert.ok(html.includes('JANE_AV226_LIFE_EFFECTS'));
const rom=read('dashboard/av201_defeat_rom.js');
assert.ok(rom.includes('START_no_reentry'));
assert.ok(rom.includes('START begins/restarts each life'));
const workflow=read('.github/workflows/jane-pages.yml');
assert.ok(workflow.includes('node tests/av228_phase9_freeze.test.cjs'));
assert.ok(workflow.includes('cp data/phase9-freeze.json _site/data/phase9-freeze.json'));
assert.ok(workflow.includes('docs/PHASE-9-AV221-228.md _site/docs/'));
console.log('AV-228 Phase 9 freeze PASS: 8/8 implemented, one NES, three tabs, real ROM and no unverified browser passes');
