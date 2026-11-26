'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
test('observer uses monotonic tail predicate',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../dashboard/av201_live_observer.js'),'utf8');
 assert.ok(src.includes('cycles.at(-1)?.defeatCount!==defeatCount'));
 assert.ok(!src.includes('cycles.some(x=>x.defeatCount===defeatCount)'));
});
test('tail and historical scan agree across monotonic defeats and resets',()=>{
 for(let epoch=0;epoch<8;epoch++){
  const cycles=[];
  for(let count=1;count<=2000;count++){
   for(let repeat=0;repeat<3;repeat++){
    const old=!cycles.some(x=>x.defeatCount===count);
    const next=cycles.at(-1)?.defeatCount!==count;
    assert.equal(next,old);
    if(next)cycles.push({defeatCount:count});
   }
  }
  assert.equal(cycles.length,2000);
 }
});
