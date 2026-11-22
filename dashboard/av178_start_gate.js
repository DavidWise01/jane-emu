/* AV-178: bounded title/menu START gate. Single deterministic action; no new input ownership.
   UI routes to existing START control only when explicitly enabled by operator. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.JaneAV178=api;
 if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});else api.mount();}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SCHEMA='jane.av178.start-gate.v1';
 function create(opts={}){
  const maxAttempts=Number.isInteger(opts.maxAttempts)?Math.max(1,Math.min(opts.maxAttempts,3)):3;
  const cooldown=Number.isInteger(opts.cooldown)?Math.max(60,opts.cooldown):180;
  let root=null,rom=null,attempts=0,lastAttempt=-Infinity,stopped=false,events=[],lastFrame=-1;
  function observe(input){
   const x=input||{},session=typeof x.root==='string'?x.root:null,cartridge=typeof x.rom==='string'?x.rom:null;
   if(!session||!cartridge||cartridge==='unloaded'||!Number.isSafeInteger(x.frame)||x.frame<0)return {decision:'abstain',reason:'unloaded-or-invalid'};
   if(session!==root||cartridge!==rom||x.frame<lastFrame){root=session;rom=cartridge;attempts=0;lastAttempt=-Infinity;stopped=false;events.push({kind:'session_reset',root,rom,frame:x.frame});}
   lastFrame=x.frame;
   if(x.playing===true||x.label==='gameplay'){stopped=true;return {decision:'abstain',reason:'gameplay-detected'};}
   if(stopped)return {decision:'abstain',reason:'halted-until-new-session'};
   if(x.enabled!==true)return {decision:'abstain',reason:'disabled'};
   if(x.actor!=='JANE')return {decision:'abstain',reason:'not-jane-turn'};
   if(x.label!=='title')return {decision:'abstain',reason:'no-confirmed-title'};
   if(x.frame<=lastAttempt||x.frame-lastAttempt<cooldown)return {decision:'abstain',reason:'cooldown'};
   if(attempts>=maxAttempts)return {decision:'abstain',reason:'attempts-exhausted'};
   attempts++;lastAttempt=x.frame;
   const e={kind:'start_requested',root,rom,frame:x.frame,attempt:attempts,source:'manual-confirmed-label',delivery:'requested-not-verified'};
   events.push(e);return {decision:'request-start',attempt:attempts};
  }
  function snapshot(){return {schema:SCHEMA,root,rom,attempts,maxAttempts,stopped,events:events.slice()};}
  function exportJSON(){return JSON.stringify({...snapshot(),note:'START request is not evidence of delivery or successful gameplay'},null,2);}
  return {observe,snapshot,exportJSON};
 }
 function mount(){
  if(document.getElementById('av178'))return;
  const host=document.getElementById('av175')||document.querySelector('.instrument-panel');
  if(!host)return;
  const gate=create(),panel=document.createElement('details');panel.id='av178';
  panel.style.cssText='margin:8px 0;padding:10px;border:1px solid #f18f43;border-radius:8px;background:#20152b;color:#f6eaff;font:12px system-ui';
  const heading=document.createElement('summary');heading.textContent='AV-178 · BOUNDED START / MENU GATE';heading.style.cssText='cursor:pointer;color:#ffad60;font-weight:800';panel.append(heading);
  const line=document.createElement('label');line.style.cssText='display:flex;gap:8px;align-items:center;padding:7px 0';
  const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=false;line.append(checkbox,document.createTextNode('Enable bounded START requests (off by default)'));panel.append(line);
  const hint=document.createElement('p');hint.textContent='Label TITLE in AV-176 on a stable screen, enable here, and keep Jane active. At most 3 requests per ROM session, separated by >=180 NES frames. Existing START control handles delivery. No controls sent if gameplay is observed.';panel.append(hint);
  const status=document.createElement('pre');status.style.cssText='white-space:pre-wrap';panel.append(status);
  const button=document.createElement('button');button.type='button';button.textContent='Export START gate log';panel.append(button);
  button.addEventListener('click',()=>{const blob=new Blob([gate.exportJSON()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='jane-av178-start-requests.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
  host.append(panel);
  let lastLabel=null;
  function render(reason){const s=gate.snapshot();status.textContent='Attempts: '+s.attempts+'/'+s.maxAttempts+' | label: '+(lastLabel||'UNKNOWN')+'\nState: '+(s.stopped?'HALTED':reason||'STANDBY')+'\nNo live START delivery confirmed by this gate';}
  function labelFor(ctx){const d=window.JANE_AV176_DETECTOR?.snapshot?.();if(d?.root!==ctx.root||d?.rom!==ctx.rom)return null;
    const latest=d.latest;if(!latest||latest.streak<3)return null;
    const match=d.labels.find(e=>e.key===ctx.rom+'|'+latest.hash);return match?.label||null;}
  function tick(){
    const ctx=window.JANE_RUN_CONTEXT?.();if(!ctx)return;
    lastLabel=labelFor(ctx);
    const result=gate.observe({root:ctx.root,rom:ctx.rom,frame:ctx.frame,actor:ctx.actor,label:lastLabel,enabled:checkbox.checked});
    if(result.decision==='request-start'){
      const existing=document.getElementById('assistStart');
      if(existing&&!existing.disabled){existing.click();render('REQUESTED via existing START control');}
      else render('NO START CONTROL — request not delivered');
    }else render(result.reason);
  }
  setInterval(tick,900);render('OFF');window.JANE_AV178_START_GATE=gate;
 }
 return {SCHEMA,create,mount};
});
