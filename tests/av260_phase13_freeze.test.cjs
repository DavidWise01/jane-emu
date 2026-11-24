'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm');
const f=JSON.parse(fs.readFileSync('data/phase13-freeze.json','utf8'));
function blob(p){const b=fs.readFileSync(p);return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')}
assert.equal(blob('docs/phase13-baseline-arena.html'),f.arenaBlob);
const h=fs.readFileSync('docs/phase13-baseline-arena.html','utf8');assert.equal((h.match(/<iframe\b/g)||[]).length,1);assert.equal((h.match(/<script\b/g)||[]).length,214);
assert.equal((fs.readFileSync('dashboard/arena.html','utf8').match(/<iframe\b/g)||[]).length,1);
for(const [p,hash] of Object.entries(f.evidenceBlobs))assert.equal(blob(p),hash,p);
for(const p of ['av254_browser_title','av255_browser_direction','av256_browser_ab','av257_browser_combo','av258_browser_rotation','av259_browser_endurance'])new vm.Script(fs.readFileSync('tests/'+p+'.test.cjs','utf8'));
assert.equal(f.implementationClosed,true);assert.equal(f.fullGameplayAccepted,false);assert.equal(f.commercialGameplayAccepted,false);assert.equal(f.open.combo,'TIMEOUT_90000MS');assert.equal(f.open.repeatedRotation,'PENDING');
console.log('AV-260 immutable Phase 13 evidence archive PASS; not full gameplay acceptance');
