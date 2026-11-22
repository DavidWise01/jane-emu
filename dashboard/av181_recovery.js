/* AV-181 · Bounded defeat recovery through the existing Jane START queue.
   Conservative, opt-in; no emulator replacement, no memory resets, no ROM bytes.
*/
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV181=api;
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});
  else api.mount();
 }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';const SCHEMA='jane.av181.defeat-recovery.v1';
 function create(options={}){
  const maxAttempts=Number.isInteger(options.maxAttempts)?Math.max(1,Math.min(options.maxAttempts,3)):2;
  const cooldown=Number.isInteger(options.cooldown)?Math.max(120,options.cooldown):240;
  let root=null,rom=null,lastFrame=-1,lastRequest=-Infinity,attempts=0,closed=false,log=[];
  function record(kind,frame,detail){
   const entry=Object.freeze({schema:SCHEMA,kind,root,rom,frame,...detail});
   log.push(entry);if(log.length>500)log.shift();return entry;
  }
  function step(x={}){
   if(!x.root||!x.rom||x.rom==='unloaded'||!Number.isSafeInteger(x.frame)||x.frame<0)
    return {decision:'abstain',reason:'no-valid-cartridge'};
   if(x.root!==root||x.rom!==rom||x.frame<lastFrame){
    root=x.root;rom=x.rom;lastFrame=-1;lastRequest=-Infinity;attempts=0;closed=false;
    record('session_started',x.frame,{});
   }
   if(x.frame<lastFrame)return {decision:'abstain',reason:'stale-frame'};
   lastFrame=x.frame;
   if(x.state==='PLAYING_LABELED'){
    if(!closed)record('recovery_observed',x.frame,{note:'operator-labeled gameplay; not independently verified'});
    closed=true;return {decision:'abstain',reason:'playing-observed'};
   }
   if(closed)return {decision:'abstain',reason:'episode-closed'};
   if(x.enabled!==true)return {decision:'abstain',reason:'disabled'};
   if(x.actor!=='JANE')return {decision:'abstain',reason:'not-jane-owner'};
   if(x.state!=='GAME_OVER'||x.confirmed!==true)return {decision:'abstain',reason:'no-confirmed-game-over'};
   if(x.frame-lastRequest<cooldown)return {decision:'abstain',reason:'cooldown'};
   if(attempts>=maxAttempts)return {decision:'abstain',reason:'attempts-exhausted'};
   attempts++;lastRequest=x.frame;
   record('start_recovery_requested',x.frame,{attempt:attempts,delivery:'queued-only',confirmedGameplay:false});
   return {decision:'queue-existing-start',attempt:attempts};
  }
  function snapshot(){return {schema:SCHEMA,root,rom,attempts,maxAttempts,closed,events:log.slice(),liveGameplayVerified:false};}
  return {step,snapshot,exportJSON:()=>JSON.stringify({...snapshot(),warning:'Input requests and operator labels are not proof of live recovery.'},null,2)};
 }
 function mount(){
  if(document.getElementById('av181'))return;
  const host=document.querySelector('.instrument-panel')||document.querySelector('main');
  if(!host)return;
  const controller=create(),panel=document.createElement('details');panel.id='av181';
  panel.style.cssText='margin:8px 0;padding:10px;border:1px solid #ee7bfc;border-radius:8px;background:#211427;color:#fff0fa;font:12px system-ui';
  const summary=document.createElement('summary');summary.textContent='AV-181 · GAME-OVER / BOUNDED RECOVERY';summary.style.cssText='color:#ffb069;cursor:pointer;font-weight:800';panel.append(summary);
  const label=document.createElement('label'),toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=false;
  label.append(toggle,document.createTextNode(' Enable bounded recovery (off by default)'));panel.append(label);
  const description=document.createElement('p');
  description.textContent='Only operator-labeled GAME_OVER, only Jane, at most two START queue requests per session, at least 240 NES frames apart. No RAM or memory reset.';
  panel.append(description);
  const status=document.createElement('pre');status.style.cssText='white-space:pre-wrap;word-break:break-word';panel.append(status);
  const button=document.createElement('button');button.type='button';button.textContent='Export AV-181 recovery log';
  button.addEventListener('click',()=>{const u=URL.createObjectURL(new Blob([controller.exportJSON()],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='jane-av181-recovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)});
  panel.append(button);host.insertBefore(panel,host.firstChild);
  function tick(){
   let ctx=null;try{ctx=window.JANE_RUN_CONTEXT?.()||null}catch(_){}
   const state=window.JANE_AV179_STATE?.snapshot?.();
   const same=state?.root===ctx?.root&&state?.rom===ctx?.rom;
   const confirmed=same&&state.state==='GAME_OVER'&&state.reason==='operator-confirmed game-over screen';
   const result=controller.step({root:ctx?.root,rom:ctx?.rom,frame:ctx?.frame,actor:ctx?.actor,
    state:same?state.state:'UNKNOWN',confirmed,enabled:toggle.checked});
   let delivery='none';
   if(result.decision==='queue-existing-start'){
    const existing=document.getElementById('assistStart');
    if(existing&&!existing.disabled){existing.click();delivery='existing START queue requested';}
    else delivery='existing START control missing';
   }
   const snap=controller.snapshot();
   status.textContent='STATE: '+(same?state.state:'UNKNOWN')+'\nRECOVERY REQUESTS: '+snap.attempts+'/'+snap.maxAttempts+
    '\nDECISION: '+result.reason+(result.decision==='queue-existing-start'?' / '+delivery:'')+
    '\nLive ROM recovery: UNVERIFIED';
  }
  tick();setInterval(tick,900);window.JANE_AV181_RECOVERY=controller;
 }
 return {SCHEMA,create,mount};
});
