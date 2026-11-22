'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {create,SCHEMA}=require('../dashboard/av177_motion_scenes.js');
function packet(frame,delta,hot=2){
 const regions=Array.from({length:24},(_,id)=>({id,delta:id===hot?delta:delta*.2}));
 return {frame,delta,hash:'animated-'+frame,regions};
}
const d=create({windowSize:4,sustain:2}),context={root:'session-a',rom:'rom-a'};
for(let f=1;f<=4;f++)assert.equal(d.observe(packet(f,.08),context),null);
const first=d.observe(packet(5,.08),context);
assert.equal(first.type,'motion_scene_candidate');assert.equal(first.activity,'moving');
assert.equal(first.semantic,'UNKNOWN');assert.equal(first.verifiedGameplay,false);
assert.equal(first.signature,'moving/upper');
assert.equal(d.observe(packet(5,.08),context),null,'duplicate frames must not advance history');
for(let f=6;f<=14;f++)d.observe(packet(f,.08),context);
assert.equal(d.snapshot().events.length,1,'animated hashes must not trigger spurious transitions');
let changed=null;
for(let f=15;f<=27;f++){const result=d.observe(packet(f,.8,19),context);if(result)changed=result;}
assert.ok(changed,'motion transition detected despite changing frame hashes');
assert.equal(changed.signature,'high-motion/lower');
assert.equal(changed.priorSignature,'moving/upper');
assert.equal(d.snapshot().events.length,2);
assert.equal(d.observe(packet(1,.8,19),{root:'new-run',rom:'rom-a'}),null,'new root resets window');
assert.equal(d.snapshot().windowLength,1);
assert.equal(d.observe(packet(2,.8,19),{root:'new-run',rom:'unloaded'}),null);
assert.equal(d.snapshot().windowLength,1,'unloaded ROM may not enter detector');
assert.equal(d.observe({frame:2,delta:NaN,regions:packet(2,.8).regions},{root:'new-run',rom:'rom-a'}),null);
const json=JSON.parse(d.exportJSON());assert.equal(json.schema,SCHEMA);
assert.equal(json.warning.includes('not proof'),true);
assert.equal(json.events.some(e=>e.semantic!=='UNKNOWN'),false);
const src=fs.readFileSync(path.join(__dirname,'../dashboard/av177_motion_scenes.js'),'utf8');
new vm.Script(src);
const arena=fs.readFileSync(path.join(__dirname,'../dashboard/arena.html'),'utf8');
assert.ok(arena.includes('<script src="./av177_motion_scenes.js"></script>'));
assert.ok(arena.includes('<iframe id="game"'));
assert.ok(arena.includes('setInterval(sample,500);renderPlayers();init()'));
console.log('AV-177 motion scene, resets, animated hashes, syntax and arena tests passed');
