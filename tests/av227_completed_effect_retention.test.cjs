'use strict';
const assert=require('node:assert/strict');
const {create}=require('../dashboard/av215_input_effects.js');
const {audit}=require('../dashboard/av226_life_effects.js');
const recorder=create(),root='session-one',rom='homebrew';
const mode=(palette,x=120)=>({mode:1,palette,x,y:108});
const put=(actor,button,frame,before,after,extra={})=>
  recorder.observe({source:'nes-completed-trial',root,rom,actor,
    id:'trial-'+frame,startFrame:frame,endFrame:frame+1,button,
    before,after,...extra});
const cycles=[
 {defeatFrame:200,defeatId:'loss-1',
  transfer:{from:'JANE',to:'TOPH',frame:201},
  startReceipt:{actor:'TOPH',root,rom,evidenceId:'loss-1'},
  restart:{actor:'TOPH',frame:212},resumed:{actor:'TOPH',frame:272}},
 {defeatFrame:430,defeatId:'loss-2',
  transfer:{from:'TOPH',to:'PATRICIA',frame:431},
  startReceipt:{actor:'PATRICIA',root,rom,evidenceId:'loss-2'},
  restart:{actor:'PATRICIA',frame:445},resumed:{actor:'PATRICIA',frame:505}}
];
for(const [actor,base] of [['TOPH',220],['PATRICIA',451]]){
 assert.equal(put(actor,'RIGHT',base,mode(0x30,120),mode(0x30,121)).changed,true);
 assert.equal(put(actor,'A',base+2,mode(0x30),mode(0x16)).changed,true);
 assert.equal(put(actor,'B',base+4,mode(0x16),mode(0x2a)).changed,true);
}
assert.equal(recorder.snapshot().proofRows.length,6);
const before=recorder.snapshot().proofRows;
assert.equal(audit(cycles,before,root,rom).complete,true);
// Evict both players' original completed trials from the 160-row diagnostics
// ring using genuine additional completed trials that do not change ROM state.
for(let frame=540;frame<790;frame++)
 assert.ok(put('PATRICIA','START',frame,mode(0x30),mode(0x30)));
const shot=recorder.snapshot();
assert.equal(shot.rows.length,160,'live ring remains bounded');
assert.equal(shot.rows.some(x=>x.actor==='TOPH'),false,'first life aged out');
assert.equal(shot.rows.some(x=>x.button==='A'),false,'A history aged out');
assert.equal(shot.proofRows.length,6,'first completed A/B and movement remain');
assert.equal(audit(cycles,shot.rows,root,rom).complete,false,
 'old ring-only validation produces false negative');
const merged=[...shot.proofRows,...shot.rows];
const result=audit(cycles,merged,root,rom);
assert.equal(result.complete,true,'retained source evidence restores two-life qualification');
assert.equal(result.qualifiedLives,2);
assert.deepEqual(result.players.map(x=>x.actions),[3,3],
 'durable archive remains source-unique');
assert.equal(audit(cycles,[...merged,...shot.proofRows],root,rom).complete,true);
assert.deepEqual(audit(cycles,[...merged,...shot.proofRows],root,rom).players.map(x=>x.actions),[3,3],
 'duplicates from live ring and archive must not inflate action count');
shot.proofRows[0].after.x=250;
assert.equal(recorder.snapshot().proofRows[0].after.x,121,
 'snapshot may not mutate preserved source receipt');
assert.equal(put('TOPH','A',800,mode(0x30),mode(0x16),
 {rom:'other-cartridge'}).changed,true);
assert.equal(recorder.snapshot().proofRows.filter(x=>x.rom===rom).length,6);
assert.equal(audit(cycles,recorder.snapshot().proofRows,root,rom).complete,true);
console.log('AV-227 NES completed-effect retention PASS: 250-row eviction, one source per effect, no duplicate credit, wrong-ROM isolation');
