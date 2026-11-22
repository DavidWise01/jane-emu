/* AV-182 — three-player handoff continuity monitor.
 * Read-only observer of the existing single-controller switchTo() transfer.
 * No game restart, no vote, no additional input owner.
 */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV182=api;
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});
  else api.mount();
 }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SCHEMA='jane.av182.handoff-continuity.v1',ORDER=['JANE','TOPH','PATRICIA'];
 function create(opts={}){
  const timeoutMs=Number.isFinite(opts.timeoutMs)?Math.max(1000,opts.timeoutMs):4500;
  let pending=null,history=[],last=null;
  const record=(kind,data)=>{const item=Object.freeze({schema:SCHEMA,kind,...data});
   history.push(item);if(history.length>300)history.shift();return item;};
  function begin(x={}){
   if(!x.ok||!x.root||!x.rom||x.rom==='unloaded'||!Number.isSafeInteger(x.frame)||x.frame<0||
      !ORDER.includes(x.from)||!ORDER.includes(x.to)||ORDER[(ORDER.indexOf(x.from)+1)%3]!==x.to)
    return {accepted:false,reason:'invalid-handoff'};
   if(pending)record('interrupted_observation',{root:pending.root,rom:pending.rom,from:pending.from,to:pending.to,frame:pending.frame});
   pending={root:x.root,rom:x.rom,from:x.from,to:x.to,frame:x.frame,at:Number.isFinite(x.at)?x.at:0};
   record('handoff_started',{...pending,transferAccepted:true});
   return {accepted:true,to:x.to};
  }
  function observe(x={}){
   if(!pending)return null;
   if(!Number.isFinite(x.at)||x.at<pending.at)return null;
   const p=pending;
   if(x.root!==p.root||x.rom!==p.rom||x.frame<p.frame){
    pending=null;last=record('continuity_failed',{...p,checkedAt:x.at,reason:'game-root-rom-or-frame-reset'});
    return last;
   }
   if(x.actor===p.to&&Number.isSafeInteger(x.frame)&&x.frame>p.frame&&x.running===true){
    pending=null;last=record('frame_continuity_observed',{...p,afterFrame:x.frame,checkedAt:x.at,delta:x.frame-p.frame,
      note:'frame advancing after handoff; live gameplay semantics not proven'});
    return last;
   }
   if(x.at-p.at>=timeoutMs){
    pending=null;last=record('continuity_timeout',{...p,checkedAt:x.at,reason:'no-advancing-frame-after-handoff'});
    return last;
   }
   return null;
  }
  function snapshot(){return {schema:SCHEMA,pending:pending?{...pending}:null,last,events:history.slice(),liveROMVerified:false};}
  return {begin,observe,snapshot,exportJSON:()=>JSON.stringify({...snapshot(),caution:'Only running-frame continuity is observed, not gameplay performance.'},null,2)};
 }
 function mount(){
  if(document.getElementById('av182'))return;
  const host=document.querySelector('.instrument-panel')||document.querySelector('main');if(!host)return;
  const monitor=create(),panel=document.createElement('details');panel.id='av182';
  panel.style.cssText='margin:8px 0;padding:10px;border:1px solid #ba70fb;border-radius:8px;background:#191426;color:#f7eaff;font:12px system-ui';
  const heading=document.createElement('summary');heading.style.cssText='cursor:pointer;font-weight:800;color:#ffb46d';heading.textContent='AV-182 · THREE-PLAYER HANDOFF CONTINUITY';panel.append(heading);
  const description=document.createElement('p');description.textContent='Jane → Toph → Patricia → Jane. Checks frame progression after the existing switchTo handoff. Never changes the current NES input owner.';panel.append(description);
  const status=document.createElement('pre');status.style.cssText='white-space:pre-wrap;word-break:break-word';panel.append(status);
  const button=document.createElement('button');button.type='button';button.textContent='Export AV-182 handoff evidence';panel.append(button);
  button.addEventListener('click',()=>{const u=URL.createObjectURL(new Blob([monitor.exportJSON()],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='jane-av182-handoff-evidence.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)});
  host.insertBefore(panel,host.firstChild);
  window.addEventListener('jane-handoff-accepted',event=>monitor.begin({...event.detail,at:Date.now()}));
  function tick(){
   const ctx=window.JANE_RUN_CONTEXT?.()||{};
   let running=false;
   try{running=document.getElementById('game')?.contentWindow?.JANE_PERCEPTION?.status?.().running===true}catch(_){}
   monitor.observe({...ctx,running,at:Date.now()});
   const s=monitor.snapshot();status.textContent='ACTIVE: '+(ctx.actor||'UNKNOWN')+'\nPENDING: '+(s.pending?s.pending.from+' → '+s.pending.to:'none')+
    '\nLAST: '+(s.last?.kind||'waiting for handoff')+'\nEVENTS: '+s.events.length+'\nROM GAMEPLAY: UNVERIFIED';
  }
  setInterval(tick,500);tick();window.JANE_AV182_CONTINUITY=monitor;
 }
 return {SCHEMA,ORDER,create,mount};
});
