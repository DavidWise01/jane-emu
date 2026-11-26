'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('hot status is scalar, isolated, and does not invoke full audit',()=>{
 const window={JaneAV219:{audit:()=>{throw Error('cold audit')}}};
 vm.runInNewContext(read('dashboard/av201_live_observer.js'),{window,document:{addEventListener(){}},setInterval:()=>1,clearInterval(){}});
 const m=window.JANE_AV201_MONITOR,s=m.hotStatus();
 assert.equal(s.completedCycles,0);assert.equal(s.cycleCount,0);assert.equal(s.armed,false);
 assert.ok(Object.values(s).every(v=>v===null||['string','number','boolean'].includes(typeof v)));
 s.armed=true;assert.equal(m.hotStatus().armed,false);
 assert.throws(()=>m.snapshot(),/cold audit/);
});
test('endurance hot and legacy cold counts agree',()=>{
 const p=require('../dashboard/av251_endurance.js').create(),r={root:'r',rom:'rom',actor:'JANE',frame:1};
 const common={armed:true,root:'r',rom:'rom'};
 const cold=p.project(r,{...common,cycles:[{transfer:{},restart:{},resumed:{}},{}]},true);
 const hot=p.project(r,{...common,completedCycles:1},true);
 assert.deepEqual(hot,cold);assert.equal(p.project(r,{...common,root:'foreign',completedCycles:9},true).cycles,0);
});
test('identity consumers use hot status; evidence consumers retain full snapshots',()=>{
 const s=read('dashboard/arena.html');
 assert.equal((s.match(/JANE_AV201_MONITOR\?\.hotStatus\?\.\(\)/g)||[]).length,12);
 assert.equal((s.match(/JANE_AV201_MONITOR\?\.snapshot\?\.\(\)/g)||[]).length,2);
});
