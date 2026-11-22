/* AV-189 — Fail-closed runtime boot diagnostic.
 * Receives actual lifecycle notifications from the arena; never loads
 * a ROM, drives START, or changes the input owner.
 */
(function(root,factory){'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV189=api;
 if(typeof document!=='undefined'){
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});
   else api.mount();
 }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SCHEMA='jane.av189.runtime-diagnostic.v1';
 const STATES=new Set(['BOOTING','CABINET_READY','ROM_QUEUED','ROM_DELIVERED','ROM_RUNNING','BOOT_ERROR','ROM_ERROR','FALLBACK_READY']);
 function create(){
   let state='BOOTING',events=[],session=null,clock=null,baseline=null,advanced=0;
   function notice(x={}){
     if(!STATES.has(x.state)||!Number.isFinite(x.at)||x.at<0||clock!==null&&x.at<clock)
       return snapshot();
     clock=x.at;
     if(x.state==='ROM_QUEUED'||x.state==='ROM_DELIVERED'){
       session=typeof x.session==='string'?x.session:null;
       baseline=null;advanced=0;
     }
     if(x.state==='ROM_RUNNING'&&session&&x.session!==session)return snapshot();
     state=x.state;
     const e=Object.freeze({kind:'runtime_state',state,at:x.at,session,reason:String(x.reason||'').slice(0,220)});
     events.push(e);if(events.length>250)events.shift();
     return snapshot();
   }
   function frame(x={}){
     if(!Number.isSafeInteger(x.frame)||x.frame<0||!x.session||x.session!==session||
       !Number.isFinite(x.at)||x.at<0||clock!==null&&x.at<clock)return snapshot();
     clock=x.at;
     if(baseline===null||x.frame<baseline){baseline=x.frame;advanced=0;}
     else if(x.frame>baseline){advanced+=x.frame-baseline;baseline=x.frame;}
     if(x.running===true&&advanced>=120&&state!=='ROM_RUNNING')
       notice({state:'ROM_RUNNING',session,reason:'emulator running and >=120 frames observed',at:x.at});
     return snapshot();
   }
   function snapshot(){return {schema:SCHEMA,state,session,advanced,events:events.slice(),
     browserGameplayVerified:false};}
   return {notice,frame,snapshot,exportJSON:()=>JSON.stringify({...snapshot(),
     note:'Observed source and frame state, not a verified ROM title or gameplay screen.'},null,2)};
 }
 function mount(){
   if(document.getElementById('av189'))return;
   const host=document.querySelector('.instrument-panel');if(!host)return;
   const detector=create(),panel=document.createElement('details');panel.id='av189';
   panel.style.cssText='margin:7px 0;padding:9px;border:1px solid #ff995e;border-radius:8px;background:#1a1426;color:#fff3fd;font:12px system-ui';
   const summary=document.createElement('summary');summary.textContent='AV-189 · ROM RUNTIME DIAGNOSTICS';
   summary.style.cssText='cursor:pointer;color:#ffb568;font-weight:800';panel.append(summary);
   const note=document.createElement('p');note.textContent='Detects cabinet loading, injected-source fallback, cartridge queue, input delivery, emulator frames and errors. No new NES controls.';panel.append(note);
   const read=document.createElement('pre');read.style.cssText='white-space:pre-wrap;word-break:break-word';panel.append(read);
   const button=document.createElement('button');button.type='button';button.textContent='Export AV-189 diagnostics';panel.append(button);
   button.addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([detector.exportJSON()],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='jane-av189-runtime.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
   host.append(panel);
   function paint(){const x=detector.snapshot();read.textContent='STATE: '+x.state+'\nNES FRAMES OBSERVED: '+x.advanced+'\nEVENTS: '+x.events.length+'\nLIVE GAMEPLAY: UNVERIFIED';}
   window.JANE_AV189_RUNTIME={
     notice:x=>{const out=detector.notice({...x,at:Date.now()});paint();return out;},
     frame:x=>{const out=detector.frame({...x,at:Date.now()});paint();return out;},
     snapshot:detector.snapshot,exportJSON:detector.exportJSON
   };
   // The iframe may become ready before this external script finishes loading.
   // Replay only the most recent diagnostic state, never controller input.
   if(window.JANE_RUNTIME_LAST)window.JANE_AV189_RUNTIME.notice(window.JANE_RUNTIME_LAST);
   paint();
 }
 return {SCHEMA,STATES,create,mount};
});
