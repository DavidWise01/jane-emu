'use strict';
const assert=require('node:assert/strict');
const {audit}=require('../dashboard/av226_life_effects.js');
const root='one-root',rom='homebrew';
const cycle=(defeat,from,to,begin,resume,id)=>({
 defeatFrame:defeat,defeatId:id,
 transfer:{from,to,frame:defeat+1},restart:{actor:to,frame:begin},
 resumed:{actor:to,frame:resume},
 startReceipt:{actor:to,root,rom,evidenceId:id,frame:begin-1}
});
const cycles=[
 cycle(200,'JANE','TOPH',212,272,'loss-1'),
 cycle(430,'TOPH','PATRICIA',445,505,'loss-2')
];
const row=(actor,button,start,before,after,extra={})=>({
 root,rom,actor,button,startFrame:start,endFrame:start+6,
 kind:'NES_EFFECT_OBSERVED',changed:true,
 before:{x:120,y:108,palette:before,mode:1},
 after:{x:button==='RIGHT'?128:120,y:108,palette:after,mode:1},...extra
});
const good=[
 row('TOPH','RIGHT',218,0x30,0x30),
 row('TOPH','A',230,0x30,0x16),
 row('TOPH','B',244,0x16,0x2a),
 row('PATRICIA','RIGHT',451,0x30,0x30),
 row('PATRICIA','A',466,0x30,0x16),
 row('PATRICIA','B',481,0x16,0x2a)
];
const pass=audit(cycles,good,root,rom);
assert.equal(pass.complete,true);
assert.equal(pass.qualifiedLives,2);
assert.deepEqual(pass.players.map(x=>x.actor),['TOPH','PATRICIA']);
assert.ok(pass.players.every(x=>x.hasA&&x.hasB&&x.movement>=1));
const fail=(rows,reason,cs=cycles)=>{
 const x=audit(cs,rows,root,rom);
 assert.equal(x.complete,false);
 assert.equal(x.firstFault.reason,reason);
};
fail(good.filter(x=>!(x.actor==='PATRICIA'&&x.button==='A')),
 'MISSING_A_OR_B_PALETTE_EFFECT_IN_LIFE');
fail(good.filter(x=>!(x.actor==='TOPH'&&x.button==='RIGHT')),
 'MISSING_COMPLETED_MOVEMENT_IN_LIFE');
fail([...good.filter(x=>!(x.actor==='TOPH'&&x.button==='A')),
 row('TOPH','A',202,0x30,0x16)],'MISSING_A_OR_B_PALETTE_EFFECT_IN_LIFE');
fail([...good.filter(x=>!(x.actor==='TOPH'&&x.button==='B')),
 row('TOPH','B',425,0x16,0x2a)],'MISSING_A_OR_B_PALETTE_EFFECT_IN_LIFE');
fail([...good.filter(x=>!(x.actor==='PATRICIA'&&x.button==='B')),
 row('PATRICIA','B',481,0x16,0x2a,{rom:'foreign'})],
 'MISSING_A_OR_B_PALETTE_EFFECT_IN_LIFE');
fail([...good.filter(x=>!(x.actor==='PATRICIA'&&x.button==='A')),
 row('PATRICIA','A',466,0x30,0x16,{kind:'BUTTON_OFFERED'})],
 'MISSING_A_OR_B_PALETTE_EFFECT_IN_LIFE');
fail(good.map(x=>x.actor==='PATRICIA'&&x.button==='A'?
 {...x,after:{...x.after,mode:2}}:x),'MISSING_A_OR_B_PALETTE_EFFECT_IN_LIFE');
const stale=structuredClone(cycles);
stale[1].startReceipt.actor='TOPH';
fail(good,'RESTART_ANCESTRY_NOT_CONFIRMED',stale);
assert.equal(audit([],good,root,rom).complete,false);
console.log('AV-226 per-life NES movement and A/B evidence PASS: correct two-life effects, stale, foreign, offered-only, wrong-owner rejected');
