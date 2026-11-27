'use strict';const assert=require('node:assert/strict'),fs=require('node:fs');const e=new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync('dashboard/jane_cortex.wasm'))).exports;for(const [k,c,m,p,v] of [[0,0,1,1,1],[1,1,1,1,2],[1,0,1,1,3],[1,0,1,2,4],[1,0,1,0,5],[1,0,2,0,6],[1,0,0,0,0]])assert.equal(e.recognize(k,c,m,p),v);assert.equal(e.position_match(128,108,123,110),1);assert.equal(e.position_match(128,108,122,110),0);assert.equal(e.motion_hits(1,1,5,5),2);assert.equal(e.motion_hits(2,1,-5,5),0);assert.equal(e.fresh(20,15),1);assert.equal(e.fresh(20,14),0);console.log('Rust WASM ABI PASS');
assert.equal(e.defend(100,100,120,100,-2,0,4)&3,1);assert.equal(e.defend(100,100,80,100,2,0,4)&3,2);assert.equal(e.defend(0,0,20,0,0,0,4),0);assert.equal(e.defend(100,100,120,100,17,0,4),0);assert.equal(e.separation_gain(100,100,120,100,96,100,118,100),84);assert.equal(e.separation_gain(100,100,120,100,104,100,118,100),-204);console.log('AV275R defense ABI PASS');

assert.equal(e.memory_append(0,1,1,0,1),1);assert.equal(e.memory_append(1,2,2,1,1),1);assert.equal(e.memory_seal(),1);assert.equal(e.memory_append(2,2,2,0,1),0);assert.equal(e.memory_append(2,3,3,0,1),1);assert.equal(e.memory_seal(),1);assert.equal(e.memory_generations(),2);assert.equal(e.memory_count(0,0),1);assert.equal(e.memory_count(0,1),1);assert.equal(e.memory_count(0,2),0);assert.equal(e.memory_count(1,2),1);assert.equal(e.memory_pending(),0);console.log('AV276R memory ABI PASS');

assert.equal(e.identity_step(1,1,1,0,1,0,120,120),1);assert.equal(e.identity_step(1,2,1,0,1,0,125,125),1);assert.equal(e.identity_step(1,3,1,0,1,0,130,130),3);assert.equal(e.identity_hits(),2);assert.equal(e.identity_step(1,4,2,0,0,0,0,0),2);assert.equal(e.identity_step(2,5,1,0,1,0,135,135),1);console.log('AV277R state ABI PASS');

for(let f=1;f<=3600;f++){assert.equal(e.survival_score(1,1,f,0),f);assert.ok(e.survival_score(1,2,f,0)<0);assert.ok(e.survival_score(1,1,f,1)<0);}assert.equal(e.survival_score(0,1,60,0),-2147483648);assert.equal(e.survival_score(1,0,60,0),-2147483648);console.log('AV280R survival ABI PASS');

assert.equal(e.arbitrate(7,2,0,100,20),2);assert.equal(e.arbitrate(7,0,0,20,20),1);assert.equal(e.arbitrate(7,0,20,20,20),0);assert.equal(e.arbitrate(6,0,0,100,100),3);assert.equal(e.arbitrate(7,1,0,100,100),3);for(let m=0;m<8;m++)for(let r=0;r<8;r++){const a=e.arbitrate(m,r,0,1,2);if(a<3){assert.ok(m&(1<<a));assert.equal(r&(1<<a),0);}}console.log('AV281R arbitration ABI PASS');

assert.equal(e.effect_class(0,84),0);assert.equal(e.effect_class(1,-204),1);assert.equal(e.effect_class(1,0),2);assert.equal(e.effect_class(1,84),3);assert.equal(e.effect_class(1,-2147483648),0);console.log('AV283R effect ABI PASS');

assert.equal(e.memory_generation_len(0),2);assert.equal(e.memory_receipt_field(0,0,0),0n);assert.equal(e.memory_receipt_field(0,1,2),2n);assert.equal(e.memory_receipt_field(99,0,0),-9223372036854775808n);assert.equal(e.memory_receipt_valid(2,3,1),1);console.log('AV284R archive ABI PASS');

assert.equal(e.cartridge_evidence(1,1,0,32),1);assert.equal(e.cartridge_evidence(0,1,0,32),0);assert.equal(e.cartridge_evidence(1,0,0,32),0);assert.equal(e.cartridge_evidence(1,1,3,32),0);assert.equal(e.cartridge_evidence(1,1,0,65537),0);console.log('AV285R cartridge ABI PASS');

for(const b of [9,10,11,12])for(const g of [0,1])for(const i of [18000,18001,22000,22001])for(const f of [203999,204000,227999,228000])for(const y of [0,1]){const expected=require('../dashboard/fast_budget.js').reference(b,g,1,4,i,f,y);assert.equal(e.fast_budget_step(b,g,1,4,i,f,y),expected)}console.log('AV299R scheduler ABI parity PASS');

// AV-316R: compare fixed totals with original sealed-generation scan.
for(let a=0;a<3;a++)assert.equal(e.memory_total(a),Array.from({length:e.memory_generations()},(_,g)=>e.memory_count(g,a)).reduce((x,y)=>x+y,0));
assert.equal(e.memory_total(3),0);assert.equal(e.memory_append(0,4,4,0,1),1);assert.equal(e.memory_total(0),1);assert.equal(e.memory_seal(),1);assert.equal(e.memory_total(0),2);assert.equal(e.memory_seal(),0);assert.equal(e.memory_total(0),2);console.log('AV316R indexed totals ABI PASS');

// AV-323R: after AV-316R, three generations are sealed and pending is zero.
assert.equal(e.memory_target_rows(),512);assert.equal(e.memory_remaining_rows(),61*1024);assert.equal(e.memory_append(1,5,5,0,1),1);assert.equal(e.memory_remaining_rows(),61*1024-1);assert.equal(e.memory_seal(),1);assert.equal(e.memory_remaining_rows(),60*1024);console.log('AV323R capacity ABI PASS');
