'use strict';
const assert=require('node:assert/strict');
const {create}=require('../dashboard/av200_defeat_restart.js');
const root='run-200',rom='supported-cartridge',actor='JANE';
const base=(frame,extra={})=>({root,rom,actor,frame,...extra});
function observed(frame,type,value){
 return {[type]:{source:'cartridge-observed',verified:true,root,rom,frame,
  ...(type==='defeat'?{gameOver:value}:{playing:value})}};
}
let gate=create();
assert.equal(gate.observe(base(100)).verifiedRecovery,false);
assert.equal(gate.observe(base(120,{manualLifeLost:true,actor:'TOPH'})).defeat,null);
assert.equal(gate.observe(base(160,{defeat:{source:'human-label',verified:true,gameOver:true,root,rom,frame:160}})).defeat,null);
assert.equal(gate.observe(base(200,observed(200,'defeat',true))).defeat.frame,200);
assert.equal(gate.observe(base(210,{action:{source:'offered-action',button:'START',root,rom,endFrame:209}})).start,null);
assert.equal(gate.observe(base(220,{action:{source:'nes-completed-action',button:'START',root:'wrong',rom,endFrame:219}})).start,null);
assert.equal(gate.observe(base(240,{action:{source:'nes-completed-action',button:'START',root,rom,endFrame:237}})).start.frame,237);
assert.equal(gate.observe(base(280,observed(280,'playing',true))).resumed,null);
assert.equal(gate.observe(base(298,observed(298,'playing',true))).verifiedRecovery,true);
assert.equal(gate.observe(base(299,{manualLifeLost:true,actor:'PATRICIA'})).verifiedRecovery,true);
assert.equal(gate.observe(base(10,{rom:'different'})).verifiedRecovery,false);
assert.equal(gate.snapshot().defeat,null);
console.log('AV-200 gate: 12 deterministic assertions passed (synthetic state inputs, NOT browser gameplay)');
