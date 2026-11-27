'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{create}=require('../dashboard/av325_effect_recovery.js');
const base={root:'r',rom:'0b10970a',actor:'TOPH',mode:1,frame:10,x:100,palette:0x2a,actions:['A','B','LEFT','RIGHT']};
const result={kind:'NES_EFFECT_OBSERVED',changed:true};
const receipt=(button,endFrame,actor='TOPH')=>({...base,actor,button,endFrame,source:'nes-completed-trial',before:{mode:1},after:{mode:1}});
test('offers never qualify an effect; only validated receipts advance mask',()=>{const p=create();assert.equal(p.offer(base),'A');assert.equal(p.status().mask,0);assert.equal(p.observe(receipt('A',20),{changed:false}),false);assert.equal(p.observe(receipt('A',20),result),true);assert.equal(p.offer({...base,frame:21,palette:0x16}),'B');assert.equal(p.observe(receipt('B',30),result),true);assert.equal(p.offer({...base,frame:31}),'RIGHT');assert.equal(p.observe(receipt('RIGHT',40),result),true);assert.equal(p.status().mask,7);assert.equal(p.offer({...base,frame:41}),null);assert.equal(p.offer({...base,actor:'PATRICIA',frame:42}),'A');assert.equal(p.status().mask,0);});
test('bounded and cartridge-specific',()=>{const p=create();assert.equal(p.offer({...base,rom:'other'}),null);for(let i=0;i<8;i++)assert.equal(p.offer({...base,frame:i+10}),'A');assert.equal(p.offer({...base,frame:30}),null);assert.equal(p.status().offers,8);});
