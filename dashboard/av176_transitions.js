/* AV-176: conservative screen transition detector.
   Existing tracer supplies frame/hash/delta; user labels are ROM+session scoped.
   Detection does not press buttons or claim semantic recognition without labels. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.JaneAV176=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});
    else api.mount();
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SCHEMA='jane.av176.transitions.v1',LABELS=['title','gameplay','game_over','recovery'];
 function makeDetector(options={}){
   const minFrames=Number.isInteger(options.minFrames)?Math.max(2,options.minFrames):3;
   const maxEvents=500,maxLabels=128;
   let root=null,rom=null,lastFrame=-1,stableKey=null,streak=0,emitted=null,history=[],labels=new Map(),latest=null;
   function keyOf(sample){
     const hash=typeof sample?.hash==='string'?sample.hash.slice(0,128):null;
     return hash&&hash.length>0?hash:null;
   }
   function reset(nextRoot,nextRom){root=nextRoot;rom=nextRom;lastFrame=-1;stableKey=null;streak=0;emitted=null;latest=null;}
   function event(type,data){const row=Object.freeze({schema:SCHEMA,type,root,rom,frame:lastFrame,...data});history.push(row);if(history.length>maxEvents)history.shift();return row;}
   function observe(sample,context={}){
     const nextRoot=typeof context.root==='string'?context.root:null;
     const nextRom=typeof context.rom==='string'?context.rom:null;
     const frame=sample?.frame;
     const hash=keyOf(sample);
     if(!nextRoot||!nextRom||nextRom==='unloaded'||!Number.isSafeInteger(frame)||frame<0||!hash)return null;
     if(nextRoot!==root||nextRom!==rom||frame<lastFrame)reset(nextRoot,nextRom);
     if(frame<=lastFrame)return null;
     lastFrame=frame;
     if(hash===stableKey)streak++;else{stableKey=hash;streak=1;}
     latest={root,rom,frame,hash,streak,delta:Number.isFinite(sample.delta)?sample.delta:null};
     if(streak<minFrames||hash===emitted)return null;
     const prior=emitted;emitted=hash;
     const label=labels.get(rom+'|'+hash)||null;
     return event('stable_screen_candidate',{hash,previousHash:prior,label,
       evidence:'consecutive identical tracer hashes',samples:streak,
       verifiedGameplay:false});
   }
   function labelCurrent(name){
     if(!LABELS.includes(name))throw Error('Unknown screen label');
     if(!latest||latest.streak<minFrames)throw Error('Wait for a stable screen before labeling');
     const key=rom+'|'+latest.hash;
     if(!labels.has(key)&&labels.size>=maxLabels)throw Error('Label limit reached; export and start a new session');
     labels.set(key,name);
     return event('operator_labeled_screen',{hash:latest.hash,label:name,
       source:'manual operator; applies only to this ROM identifier',verifiedGameplay:false});
   }
   function snapshot(){return {schema:SCHEMA,root,rom,latest:latest?{...latest}:null,
      labelCount:labels.size,events:history.slice(),labels:[...labels].map(([key,label])=>({key,label}))};}
   function exportJSON(){return JSON.stringify({...snapshot(),exportedAt:new Date().toISOString(),
     caveat:'Screen matches are candidates; labels are operator-supplied, not independently verified gameplay.'},null,2);}
   return {observe,labelCurrent,snapshot,exportJSON};
 }
 function mount(){
   if(document.getElementById('av176'))return;
   const host=document.getElementById('av175')||document.querySelector('.instrument-panel');
   if(!host)return;
   const detector=makeDetector();
   const panel=document.createElement('details');panel.id='av176';
   panel.style.cssText='margin:8px 0;padding:10px;border:1px solid #36e4d5;border-radius:8px;background:#101a29;color:#e7faff;font:12px system-ui';
   const heading=document.createElement('summary');heading.textContent='AV-176 · SCREEN TRANSITIONS / LABEL TRAINER';heading.style.cssText='cursor:pointer;font-weight:800;color:#ffae60';
   panel.append(heading);
   const help=document.createElement('p');help.textContent='Enable the existing Screen Trace instrument. Three consecutive matching sampled screen hashes form a candidate. Label only what you actually see. No automatic START or recovery actions.';
   panel.append(help);
   const status=document.createElement('pre');status.style.cssText='white-space:pre-wrap;word-break:break-word';panel.append(status);
   const actions=document.createElement('div');actions.style.cssText='display:flex;gap:5px;flex-wrap:wrap';
   for(const name of LABELS){const btn=document.createElement('button');btn.type='button';btn.textContent='Label '+name.replace('_',' ');btn.addEventListener('click',()=>{try{detector.labelCurrent(name);render()}catch(e){status.textContent=e.message}});actions.append(btn)}
   panel.append(actions);
   const exportButton=document.createElement('button');exportButton.type='button';exportButton.textContent='Export AV-176 events';exportButton.style.marginTop='8px';
   exportButton.addEventListener('click',()=>{const blob=new Blob([detector.exportJSON()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='jane-av176-screen-transitions.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
   panel.append(exportButton);
   host.append(panel);
   function render(){const s=detector.snapshot(),last=s.events.at(-1);status.textContent=
      'ROM: '+(s.rom||'unloaded')+' · stable samples: '+(s.latest?.streak||0)+
      '\nCurrent screen: '+(s.latest?.hash||'none')+
      '\nLearned labels: '+s.labelCount+' · events: '+s.events.length+
      '\nLatest event: '+(last?last.type+' / '+(last.label||'UNKNOWN'):'awaiting trace')+
      '\nSTATUS: candidate only; gameplay remains unverified';}
   window.addEventListener('jane-screen-trace',ev=>{
     const sample=ev.detail,ctx=window.JANE_RUN_CONTEXT?.()||{};
     detector.observe(sample,{root:ctx.root,rom:ctx.rom});render();
   });
   render();window.JANE_AV176_DETECTOR=detector;
 }
 return {SCHEMA,makeDetector,mount};
});
