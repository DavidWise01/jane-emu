'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const html=fs.readFileSync('dashboard/arena.html','utf8'),freeze=JSON.parse(fs.readFileSync('data/phase12-freeze.json','utf8'));
const blob=fs.readFileSync('docs/phase12-baseline-arena.html');assert.equal(crypto.createHash('sha1').update('blob '+blob.length+'\0').update(blob).digest('hex'),freeze.arenaBlob);
assert.equal((blob.toString().match(/<iframe\b/g)||[]).length,1);assert.equal((blob.toString().match(/<script\b/g)||[]).length,212);
assert.equal((html.match(/<iframe\b/g)||[]).length,1);
for(const id of ["av245-scene-binding","av246-context-binding","av248-coordination-binding","av249-survival-binding","av250-generation-binding","av251-endurance-binding"]){const marker='<script id="'+id+'">';assert.ok(html.includes(marker),id);const start=html.indexOf(marker)+marker.length;const s=html.slice(start,html.indexOf('</script>',start));new vm.Script(s);assert.ok(!/buttonDown|buttonUp|\.cpu\.mem/.test(s),id);}
for(const path of ['av245_scene_recognition','av246_context_actions','av192_timing','av248_coordination','av249_survival','av250_generations','av251_endurance'])new vm.Script(fs.readFileSync('dashboard/'+path+'.js','utf8'));
assert.equal(freeze.implementationClosed,true);assert.equal(freeze.fullGameplayAccepted,false);assert.equal(freeze.commercialGameplayAccepted,false);
console.log('AV-252 archived Phase 12 baseline and integration syntax PASS; gameplay acceptance not implied');
