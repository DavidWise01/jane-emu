'use strict';
const assert=require('node:assert/strict');
const {create}=require('../dashboard/av215_input_effects.js');
const p=create(),base={x:120,y:108,palette:0x30,mode:1};
const row=(id,actor,startFrame,button,before,after,extra={})=>({
 source:'nes-completed-trial',root:'one-emulator',rom:'loss-cartridge',
 id,actor,startFrame,endFrame:startFrame+6,button,before,after,...extra
});
const seq=[
 row('1','JANE',10,'RIGHT',base,{...base,x:130}),
 row('2','JANE',18,'A',{...base,x:130},{...base,x:130,palette:0x16}),
 row('1','JANE',26,'RIGHT',{...base,x:130,palette:0x16},{...base,x:140,palette:0x16}),
 row('2','JANE',34,'B',{...base,x:140,palette:0x16},{...base,x:140,palette:0x2a})
];
for(const x of seq)assert.equal(p.observe(x).kind,'NES_EFFECT_OBSERVED');
assert.equal(p.snapshot().rows.length,4,'recycled trial IDs with distinct NES spans remain separate');
assert.equal(p.snapshot().qualifiedEpisodes,1,'two movement plus two A/B completed effects qualifies one sustained episode');
assert.equal(p.observe(seq[0]),false,'replaying identical frame-span is not new evidence');
assert.equal(p.snapshot().qualifiedEpisodes,1);
assert.equal(p.observe(row('3','TOPH',42,'LEFT',{...base,x:140},{...base,x:130})).changed,true);
assert.equal(p.snapshot().episodes.length,2,'handoff opens independent owner episode');
assert.equal(p.snapshot().episodes[0].actor,'JANE');
assert.equal(p.snapshot().episodes[1].actor,'TOPH');
assert.equal(p.snapshot().episodes[1].qualified,false);
assert.equal(p.observe(row('4','TOPH',50,'A',{...base,x:130},{...base,x:130,palette:0x16})).changed,true);
assert.equal(p.observe(row('5','TOPH',58,'LEFT',{...base,x:130,palette:0x16},{...base,x:120,palette:0x16})).changed,true);
assert.equal(p.observe(row('6','TOPH',66,'B',{...base,x:120,palette:0x16},{...base,x:120,palette:0x2a})).changed,true);
assert.equal(p.snapshot().qualifiedEpisodes,2);
assert.equal(p.observe(row('7','TOPH',74,'RIGHT',{...base,x:120},{...base,x:120})).changed,false);
assert.equal(p.snapshot().qualifiedEpisodes,2,'ineffective trial never earns more episodes');
assert.equal(p.observe(row('8','PATRICIA',82,'LEFT',{...base,x:120},{...base,x:110})).changed,true);
assert.equal(p.snapshot().episodes.length,3);
assert.equal(p.snapshot().episodes[2].qualified,false);
assert.equal(p.observe(row('9','PATRICIA',90,'RIGHT',{...base,x:110},{...base,x:130},{source:'offer-only'})),false);
assert.equal(p.snapshot().qualifiedEpisodes,2);
console.log('AV-216 sustained original NES input evidence PASS: recycled trial IDs, repeated movement/A-B, owner isolation');
