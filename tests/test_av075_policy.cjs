const assert=require('node:assert/strict');
const policy=require('../dashboard/av075_policy.js');
const base={rom:'game123',context:'title-screen-1',word:'START',confirmed:true,associations:[]};
function a(button,good,harmful=0,state='INSUFFICIENT'){
 return {rom:base.rom,context:base.context,context_bound:true,word:base.word,button,beneficial_roots:good,harmful_or_conflicting_roots:harmful,other_roots:0,status:state};
}
function test(name,fn){fn();console.log('PASS '+name)}
test('unknown word means READ, never an input',()=>{
 const r=policy.choose({...base,word:'UNKNOWN'});assert.equal(r.state,'READ');assert.equal(r.selected,undefined);
});
test('missing screen context means OBSERVE',()=>{
 const r=policy.choose({...base,context:''});assert.equal(r.state,'OBSERVE');
});
test('missing Git index means ABSTAIN',()=>{
 const r=policy.choose({...base,associations:null});assert.equal(r.state,'ABSTAIN');
});
test('no stored witnesses proposes information gathering, not benefit',()=>{
 const r=policy.choose(base);assert.equal(r.state,'PROPOSE');assert.equal(r.selected,'START');assert.equal(r.candidates[0].missing,3);
});
test('supported button stops being next missing-evidence experiment',()=>{
 const r=policy.choose({...base,associations:[a('START',3,0,'SUPPORTED_PROVISIONAL')]});assert.notEqual(r.selected,'START');assert.equal(r.candidates.find(v=>v.button==='START').state,'SUPPORTED');
});
test('harmful witness blocks that button',()=>{
 const r=policy.choose({...base,associations:[a('START',3,1,'CONTESTED')]});assert.notEqual(r.selected,'START');assert.equal(r.candidates.find(v=>v.button==='START').state,'BLOCK');
});
test('other cartridge and screen cannot satisfy evidence',()=>{
 const other={...a('START',3,0,'SUPPORTED_PROVISIONAL'),rom:'other-game'};
 const different={...a('A',3,0,'SUPPORTED_PROVISIONAL'),context:'another-screen'};
 const r=policy.choose({...base,associations:[other,different]});assert.equal(r.candidates.find(v=>v.button==='START').missing,3);
 assert.equal(r.candidates.find(v=>v.button==='A').missing,3);
});
test('unknown legacy contexts cannot satisfy evidence',()=>{
 const older={...a('START',3,0,'SUPPORTED_PROVISIONAL'),context_bound:false};
 const r=policy.choose({...base,associations:[older]});assert.equal(r.candidates.find(v=>v.button==='START').missing,3);
});
console.log('AV-075: 8 policy checks passed');