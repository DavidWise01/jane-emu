/* AV-185 · ROM boot and START-to-frames evidence.
   Observation-only. A completed emulator action is stronger than a queued START
   request, but neither is by itself proof of playable game state.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV185=api;
 if(typeof document!=='undefined'){
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});
   else api.mount();
 }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SCHEMA='jane.av185.rom-boot-start.v1';
 function create(options={}){
   const minFrames=Number.isInteger(options.minFrames)?Math.max(30,options.minFrames):120;
   let session=null,events=[],seq=0;
   function push(kind,x,detail={}){
     const e=Object.freeze({seq:++seq,kind,at:x.at??null,root:session?.root||null,
       rom:session?.rom||null,frame:x.frame??null,...detail});
     events.push(e);if(events.length>600)events.shift();return e;
   }
   function valid(x){
     return x&&typeof x.root==='string'&&x.root&&typeof x.rom==='string'&&x.rom!=='unloaded'&&x.rom&&
       Number.isSafeInteger(x.frame)&&x.frame>=0;
   }
   function observe(x={}){
     if(!valid(x))return snapshot();
     if(!session||session.root!==x.root||session.rom!==x.rom||x.frame<session.lastFrame){
       session={root:x.root,rom:x.rom,firstFrame:x.frame,lastFrame:x.frame,
         framesAdvanced:0,runningSeen:x.running===true,actionStartFrame:null,startCompleted:false,
         framesAfterStart:0,firstRunningFrame:x.running===true?x.frame:null};
       push('cartridge_session_observed',x,{note:'ROM identifier from emulator state, not validated ROM bytes'});
       return snapshot();
     }
     if(x.running===true){
       session.runningSeen=true;
       if(session.firstRunningFrame===null)session.firstRunningFrame=x.frame;
     }
     if(x.frame>session.lastFrame){
       const delta=x.frame-session.lastFrame;
       session.framesAdvanced+=delta;
       session.lastFrame=x.frame;
       if(session.startCompleted&&session.actionStartFrame!==null&&x.frame>session.actionStartFrame)
         session.framesAfterStart=Math.max(session.framesAfterStart,x.frame-session.actionStartFrame);
       if(session.framesAdvanced>=minFrames&&!session.bootRecorded){
         session.bootRecorded=true;push('frames_advanced',x,{observedFrames:session.framesAdvanced});
       }
       if(session.framesAfterStart>=minFrames&&!session.afterStartRecorded){
         session.afterStartRecorded=true;push('post_start_frames_advanced',x,{observedFrames:session.framesAfterStart});
       }
     }
     return snapshot();
   }
   function actionCompleted(x={}){
     if(!valid(x)||!session||x.root!==session.root||x.rom!==session.rom||
       x.button!=='START'||x.executed!==true||x.frame<session.firstFrame||x.frame<0)return null;
     if(session.startCompleted)return null; // one completed START observation per session
     session.startCompleted=true;session.actionStartFrame=x.frame;
     push('emulator_start_action_completed',x,{
       source:'emulator completed-action record, not operator button click',gameplayProven:false});
     return snapshot();
   }
   function snapshot(){
     const s=session?{...session}:null;
     return {schema:SCHEMA,session:s,events:events.slice(),
       cartridgeObserved:!!s,
       bootFramesObserved:!!s&&s.runningSeen&&s.framesAdvanced>=minFrames,
       startActionObserved:!!s&&s.startCompleted,
       postStartFramesObserved:!!s&&s.startCompleted&&s.framesAfterStart>=minFrames,
       liveGamePlayableVerified:false};
   }
   return {observe,actionCompleted,snapshot,exportJSON:()=>JSON.stringify({...snapshot(),
     warning:'ROM identity, completed START action and frame progression are observable; actual screen/gameplay remains independently unverified.'},null,2)};
 }
 function mount(){
   if(document.getElementById('av185'))return;
   const host=document.querySelector('.instrument-panel')||document.querySelector('main');if(!host)return;
   const monitor=create(),panel=document.createElement('details');panel.id='av185';
   panel.style.cssText='margin:8px 0;padding:10px;border:1px solid #fba44a;border-radius:8px;background:#171527;color:#fcf0ff;font:12px system-ui';
   const summary=document.createElement('summary');summary.textContent='AV-185 · ROM BOOT + EXECUTED START';summary.style.cssText='cursor:pointer;font-weight:800;color:#ffaf68';panel.append(summary);
   const info=document.createElement('p');info.textContent='Load your own .nes ROM. This records emulator frame advancement and completed START actions, not queued clicks. Export evidence for browser review. No gameplay claim without visual confirmation.';panel.append(info);
   const status=document.createElement('pre');status.style.cssText='white-space:pre-wrap;word-break:break-word';panel.append(status);
   const button=document.createElement('button');button.type='button';button.textContent='Export AV-185 boot evidence';panel.append(button);
   button.addEventListener('click',()=>{const blob=new Blob([monitor.exportJSON()],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='jane-av185-rom-boot-start.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});
   host.insertBefore(panel,host.firstChild);
   window.JANE_AV185_FRAME=(x)=>{
     // Called from the existing NES frame clock, never calls into its control API.
     const ctx=window.JANE_RUN_CONTEXT?.()||{};
     monitor.observe({root:ctx.root,rom:x?.rom,frame:x?.frame,running:true});
   };
   window.JANE_AV185_ACTION_COMPLETE=(x)=>{
     const ctx=window.JANE_RUN_CONTEXT?.()||{};
     monitor.actionCompleted({root:ctx.root,rom:x?.rom,frame:x?.frame,button:x?.button,executed:true});
   };
   function paint(){
     const s=monitor.snapshot();
     status.textContent='ROM: '+(s.session?.rom||'UNLOADED')+
       '\nBOOT FRAMES: '+(s.bootFramesObserved?'OBSERVED':'PENDING')+
       '\nSTART COMPLETED: '+(s.startActionObserved?'OBSERVED':'PENDING')+
       '\nFRAMES AFTER START: '+(s.postStartFramesObserved?'OBSERVED':'PENDING')+
       '\nGAMEPLAY: NOT VERIFIED · EVENTS: '+s.events.length;
   }
   setInterval(paint,750);paint();window.JANE_AV185_MONITOR=monitor;
 }
 return {SCHEMA,create,mount};
});
