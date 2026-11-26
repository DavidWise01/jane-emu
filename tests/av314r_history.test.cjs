'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const test=require('node:test');
const source=fs.readFileSync(path.join(__dirname,'../dashboard/av201_live_observer.js'),'utf8');
const receipt=require('../dashboard/av218_restart_receipt.js');
test('actual observer counter reconciles across cycles and reset',()=>{
 let tick,click,frame=0,mode=0,actor='JANE',trials=[];
 const context=()=>({root:'r',rom:'rom',actor});
 const game={JANE_PERCEPTION:{status:()=>({frame}),diagnostics:()=>({recentTrials:trials})},JANE_ARENA_RAM:{read:()=>mode}};
 const window={JANE_RUN_CONTEXT:context,JaneAV200:{create:()=>({snapshot:()=>({events:[]}),observe:()=>({events:[]})})},JaneAV218:receipt,
 JANE_AV202_DEFEAT_HANDOFF:()=>{actor=({JANE:'TOPH',TOPH:'PATRICIA',PATRICIA:'JANE'})[actor];return {ok:true}},JANE_AV203_QUEUE_RECOVERY:()=>({ok:true})};
 vm.runInNewContext(source,{window,document:{addEventListener:(_,f)=>click=f,getElementById:()=>({contentWindow:game})},setInterval:f=>{tick=f;return 1},clearInterval:()=>{},performance:{now:()=>frame}});
 const reset=()=>{actor='JANE';mode=0;frame=0;trials=[];click({target:{closest:()=>true}});tick();};
 const monitor=window.JANE_AV201_MONITOR;
 for(let epoch=0;epoch<3;epoch++){
 reset();assert.equal(monitor.snapshot().completedCycles,0);
 for(let n=1;n<=100;n++){
 mode=1;frame++;tick();mode=2;frame++;tick();
 assert.equal(monitor.snapshot().completedCycles,n-1);
 mode=1;frame++;trials=[{button:'START',endFrame:frame,arenaRoot:'r',arenaActor:actor,rom:'rom',id:n}];tick();
 frame+=60;tick();tick();
 const snap=monitor.snapshot();assert.equal(snap.completedCycles,n);
 assert.equal(monitor.auditCompletedCycles().match,true);
 snap.cycles.at(-1).resumed.actor='CORRUPT';
 assert.equal(monitor.snapshot().cycles.at(-1).resumed.actor,actor);
 }
 }
});
