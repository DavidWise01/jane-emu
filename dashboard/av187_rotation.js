/* AV-187 — live three-player handoff chain / read-only acceptance capture.
 * One NES instance, one input owner. This records accepted transfers and
 * subsequent advancing emulator frames; it never executes a handoff.
 */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV187=api;
 if(typeof document!=='undefined'){
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});
   else api.mount();
 }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SCHEMA='jane.av187.full-rotation.v1';
 const ORDER=['JANE','TOPH','PATRICIA','JANE'];
 const normal=x=>typeof x==='string'?x.trim().toUpperCase():'';
 function create(config={}){
   const minAdvance=Number.isInteger(config.minAdvance)?Math.max(1,config.minAdvance):60;
   const timeoutMs=Number.isFinite(config.timeoutMs)?Math.max(1000,config.timeoutMs):7000;
   let session=null,pending=null,steps=[],events=[],sequence=0,failed=false,frame=null,at=null;
   const log=(kind,detail={})=>{
     const entry=Object.freeze({seq:++sequence,kind,root:session?.root||null,
       rom:session?.rom||null,...detail});
     events.push(entry);if(events.length>300)events.shift();return entry;
   };
   function reset(x,reason){
     session={root:x.root,rom:x.rom,actor:x.actor,frame:x.frame};
     pending=null;steps=[];failed=false;frame=x.frame;at=x.at;
     log('session_opened',{at:x.at,frame:x.frame,reason});
   }
   function valid(x){return x&&typeof x.root==='string'&&x.root.length>0&&
     typeof x.rom==='string'&&x.rom.length>0&&x.rom!=='unloaded'&&
     Number.isSafeInteger(x.frame)&&x.frame>=0&&Number.isFinite(x.at)&&x.at>=0&&
     ORDER.includes(x.actor);}
   function observe(x={}){
     x={...x,actor:normal(x.actor)};
     if(!valid(x))return snapshot();
     if(!session||x.root!==session.root||x.rom!==session.rom||x.frame<frame){
       reset(x,'first-frame-or-session-reset');return snapshot();
     }
     if(x.at<at)return snapshot(); // wall-clock observations must be monotonic
     frame=x.frame;at=x.at;
     if(!pending){
       if(x.actor!==session.actor){
         failed=true;log('unaccepted_owner_change',{from:session.actor,to:x.actor,frame:x.frame,at:x.at});
       }
       session.actor=x.actor;session.frame=x.frame;return snapshot();
     }
     const p=pending;
     if(x.actor!==p.to){
       if(x.at-p.at>=timeoutMs){
         failed=true;pending=null;log('handoff_timeout',{from:p.from,to:p.to,at:x.at,frame:x.frame});
       }
       return snapshot();
     }
     if(x.running===true&&x.frame>=p.frame+minAdvance){
       pending=null;session.actor=x.actor;session.frame=x.frame;
       const step={from:p.from,to:p.to,before:p.frame,after:x.frame,delta:x.frame-p.frame,
         root:session.root,rom:session.rom};
       steps.push(step);log('handoff_frames_confirmed',{...step,at:x.at});
     }else if(x.at-p.at>=timeoutMs){
       failed=true;pending=null;log('handoff_timeout',{from:p.from,to:p.to,at:x.at,frame:x.frame});
     }
     return snapshot();
   }
   function accepted(x={}){
     x={...x,actor:normal(x.actor),from:normal(x.from),to:normal(x.to)};
     if(!session||!x.ok||!valid(x)||x.root!==session.root||x.rom!==session.rom||
       pending!==null||failed||x.frame<frame||x.actor!==x.to||x.from!==session.actor)
       return {accepted:false,reason:'handoff-session-or-actor-mismatch'};
     const index=steps.length;
     if(index>=3||x.from!==ORDER[index]||x.to!==ORDER[index+1]){
       failed=true;log('wrong_handoff_order',{from:x.from,to:x.to,at:x.at,frame:x.frame});
       return {accepted:false,reason:'wrong-rotation-order'};
     }
     pending={from:x.from,to:x.to,frame:x.frame,at:x.at};
     frame=x.frame;at=x.at;
     log('handoff_accepted',{...pending,transferAccepted:true});
     return {accepted:true,reason:'awaiting-frame-continuity'};
   }
   function snapshot(){
     return {schema:SCHEMA,root:session?.root||null,rom:session?.rom||null,
       actor:session?.actor||null,steps:steps.map(s=>({...s})),pending:pending?{...pending}:null,
       failed,events:events.slice(),fullRotationObserved:!failed&&steps.length===3&&
         steps.every((s,i)=>s.from===ORDER[i]&&s.to===ORDER[i+1]),
       actualGameplayVerified:false,phaseGateVerified:false};
   }
   return {observe,accepted,snapshot,exportJSON:()=>JSON.stringify({...snapshot(),
     note:'Frame continuity is telemetry; visually confirmed NES play is required for Phase 3 credit.'},null,2)};
 }
 function mount(){
   if(document.getElementById('av187'))return;
   const sidebar=document.querySelector('.instrument-panel');if(!sidebar)return;
   const monitor=create(),panel=document.createElement('details');
   panel.id='av187';panel.style.cssText='margin:6px 0;padding:8px;border:1px solid #cc8aff;border-radius:8px;background:#1a1323;color:#fff0ff;font:12px system-ui';
   const summary=document.createElement('summary');summary.textContent='AV-187 · LIVE 3-PLAYER ROTATION';summary.style.cssText='color:#ffb060;font-weight:800;cursor:pointer';panel.append(summary);
   const description=document.createElement('p');
   description.textContent='Observe Jane → Toph → Patricia → Jane. Each accepted transfer must be followed by 60 advancing NES frames on the same cartridge, without timeout or reset. This monitor never presses a button.';panel.append(description);
   const status=document.createElement('pre');status.style.cssText='white-space:pre-wrap;word-break:break-word';panel.append(status);
   const button=document.createElement('button');button.type='button';button.textContent='Export AV-187 handoff record';panel.append(button);
   button.addEventListener('click',()=>{
     const url=URL.createObjectURL(new Blob([monitor.exportJSON()],{type:'application/json'}));
     const a=document.createElement('a');a.href=url;a.download='jane-av187-handoffs.json';a.click();
     setTimeout(()=>URL.revokeObjectURL(url),1000);
   });
   sidebar.append(panel);
   window.addEventListener('jane-handoff-accepted',event=>{
     const d=event.detail||{},ctx=window.JANE_RUN_CONTEXT?.()||{};
     monitor.accepted({ok:d.ok,root:d.root,rom:d.rom,frame:d.frame,
       from:d.from,to:d.to,actor:ctx.actor,at:Date.now()});
   });
   function tick(){
     const ctx=window.JANE_RUN_CONTEXT?.()||{};
     let obs=null;try{obs=document.getElementById('game')?.contentWindow?.JANE_PERCEPTION?.status?.()||null}catch(_){}
     const s=monitor.observe({root:ctx.root,rom:ctx.rom,frame:ctx.frame,
       actor:ctx.actor,running:obs?.running===true,at:Date.now()});
     status.textContent='ROTATION: '+s.steps.length+'/3 handoffs with ≥60 frames\n'+
       'CURRENT: '+(s.actor||'—')+' · ROM: '+(s.rom||'none')+'\n'+
       'STATE: '+(s.failed?'FAILED':s.pending?'AWAIT FRAME CONTINUITY':s.fullRotationObserved?'OBSERVED':'COLLECTING')+
       '\nLIVE GAMEPLAY: NOT VERIFIED';
   }
   setInterval(tick,500);tick();window.JANE_AV187_ROTATION=monitor;
 }
 return {SCHEMA,ORDER,create,mount};
});
