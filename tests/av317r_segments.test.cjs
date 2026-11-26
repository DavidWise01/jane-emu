'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{webcrypto:{subtle}}=require('node:crypto');
const api=require('../dashboard/rust_archive.js');
const k={memory_receipt_valid:(a,p,r)=>Number(a<=2&&p<=3&&r>0)};
const scope=['root','rom'];
test('64 segments preserve original rows and validate full chain',async()=>{
 let head=null,prior=null;const records=[],raws=[];
 for(let i=0;i<64;i++){
  const g={index:i,rows:[[i%3,i,i,0,1]]};
  const raw=await api.sealSegment(scope,g,head,prior,k,subtle);
  const p=await api.openSegment(raw,scope,i,head,prior,k,subtle);
  head=p.digest;prior=g.rows.at(-1);records.push(g);raws.push(raw);
 }
 const audit=await api.auditSegments(raws,scope,k,subtle);
 assert.deepEqual(audit.records,records);assert.equal(audit.head,head);assert.equal(audit.authenticated,false);
 await assert.rejects(api.auditSegments(raws.slice(1),scope,k,subtle));
 await assert.rejects(api.auditSegments([raws[0],raws[2]],scope,k,subtle));
 await assert.rejects(api.auditSegments(raws,['foreign','rom'],k,subtle));
 const bad=JSON.parse(raws[0]);bad.payload=bad.payload.replace('root','evil');
 await assert.rejects(api.auditSegments([JSON.stringify(bad)],scope,k,subtle));
 await assert.rejects(api.sealSegment(scope,{index:1,rows:[[0,0,0,0,1]]},head,prior,k,subtle));
 const old=await api.seal(scope,records,subtle);assert.deepEqual((await api.open(old,k,subtle)).records,records);
});
