'use strict';
const assert=require('node:assert/strict');
const {create}=require('../dashboard/av211_action_exchange.js');
const {create:controller}=require('../dashboard/av208_adaptive_gameplay.js');
const pool=create(),root='single-nes',rom='av201-homebrew';
const ev=(id,actor,frame,button='RIGHT',hold=7,extra={})=>({
 source:'nes-completed-action',id,root,rom,actor,frame,button,hold,
 changed:true,goalReached:true,probe:false,...extra
});
assert.equal(pool.observe(ev('trial1','JANE',100)),true);
assert.equal(pool.observe(ev('trial1','JANE',100)),false,'same root/action is one event');
assert.deepEqual(pool.advice({root,rom,actor:'TOPH'}),{},'one observation cannot seed timing');
assert.equal(pool.observe(ev('trial2','JANE',150,'RIGHT',6)),true);
assert.equal(pool.observe(ev('trial3','JANE',180,'RIGHT',7,{probe:true})),false,'probe is ineligible');
assert.equal(pool.observe(ev('trial4','JANE',190,'RIGHT',8,{changed:false})),false);
assert.equal(pool.observe(ev('trial5','JANE',200,'RIGHT',8,{source:'human-label'})),false);
assert.deepEqual(pool.advice({root,rom,actor:'TOPH'}),{RIGHT:6});
assert.deepEqual(pool.advice({root,rom,actor:'JANE'}),{},'no self-inheritance');
assert.deepEqual(pool.advice({root:'unrelated',rom,actor:'TOPH'}),{},'no cross-root transfer');
assert.deepEqual(pool.advice({root,rom:'different',actor:'TOPH'}),{},'no cross-ROM transfer');
assert.equal(pool.observe(ev('trial6','TOPH',220,'A',8)),true);
assert.equal(pool.observe(ev('trial7','TOPH',240,'A',9)),true);
assert.deepEqual(pool.advice({root,rom,actor:'PATRICIA'}),{RIGHT:6,A:8});
assert.equal(pool.snapshot().independentWitnessesClaimed,0);
assert.equal(pool.snapshot().records.length,4);
const p=controller(),x=(actor,frame,x=120,holdAdvice={})=>({
 root,rom,actor,frame,mode:1,x,palette:0x30,actions:['RIGHT','LEFT','A','B'],
 holdAdvice
});
assert.deepEqual(p.offer(x('TOPH',300,120,pool.advice({root,rom,actor:'TOPH'}))),{button:'RIGHT',hold:6});
assert.equal(p.complete({...x('TOPH',310,136),button:'RIGHT'}),true);
assert.equal(p.snapshot().holds.RIGHT,5,'own completed result controls future timing');
assert.equal(p.offer(x('PATRICIA',320,120,pool.advice({root,rom,actor:'PATRICIA'}))).hold,6);
assert.equal(p.snapshot().holds.A,8,'new actor receives matching A hint');
assert.equal(p.snapshot().successes.RIGHT,0,'new actor does not inherit success counts');
console.log('AV-211 completed-action exchange passed: ancestry, dedupe, actor isolation and bounded transfer');
