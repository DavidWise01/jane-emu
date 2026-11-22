/* AV-183 · continuous play endurance / one NES clock, three rotating policies.
 * Pure read-only observations. No input injection, no ROM or learning-state mutation.
 */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV183=api;
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});
  else api.mount();
 }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SCHEMA='jane.av183.endurance.v1',ACTORS=['JANE','TOPH','PATRICIA'];
 function create(opts={}){
  const stallMs=Number.isFinite(opts.stallMs)?Math.max(1500,opts.stallMs):5000;
  const maxEvents=Number.isInteger(opts.maxEvents)?Math.max(12,Math.min(1000,opts.maxEvents)):400;
  let session=null,events=[],lastHandoffSeq=0,lastRecoverySeq=0;
  function append(kind,x={},detail={}){
   const e=Object.freeze({seq:events.length?events[events.length-1].seq+1:1,kind,
    at:x.at??null,root:session?.root??null,rom:session?.rom??null,frame:x.frame??null,...detail});
   events.push(e);if(events.length>maxEvents)events.shift();return e;
  }
  function reset(x){
   session={root:x.root,rom:x.rom,startAt:x.at,startFrame:x.frame,lastAt:x.at,lastFrame:x.frame,
    advanced:0,handoffs:0,recoveries:0,stalls:0,clockFrozen:false,
    latestActor:x.actor,visitedActors:[x.actor]};
   lastHandoffSeq=0;lastRecoverySeq=0;append('session_started',x);
  }
  function observe(x={}){
   if(!x.root||!x.rom||x.rom==='unloaded'||!Number.isSafeInteger(x.frame)||x.frame<0||
      !Number.isFinite(x.at)||x.at<0||!ACTORS.includes(x.actor))
    return snapshot();
   if(!session||x.root!==session.root||x.rom!==session.rom||x.frame<session.lastFrame){
    reset(x);return snapshot();
   }
   if(x.at<session.lastAt)return snapshot();
   const s=session;
   if(x.frame>s.lastFrame){
    s.advanced+=x.frame-s.lastFrame;s.lastFrame=x.frame;s.lastAt=x.at;
    if(s.clockFrozen){s.clockFrozen=false;append('frame_clock_resumed',x);}
   }else if(!s.clockFrozen&&x.at-s.lastAt>=stallMs){
    s.clockFrozen=true;s.stalls++;append('frame_clock_stalled',x,{stallMs:x.at-s.lastAt});
   }
   if(x.actor!==s.latestActor){
    // Player-owner changes require a matching accepted handoff, otherwise flag anomaly.
    const valid=x.handoffAccepted===true&&x.handoffFrom===s.latestActor&&x.handoffTo===x.actor;
    if(valid){s.handoffs++;if(!s.visitedActors.includes(x.actor))s.visitedActors.push(x.actor);append('handoff_observed',x,{from:s.latestActor,to:x.actor});}
    else append('owner_change_unconfirmed',x,{from:s.latestActor,to:x.actor});
    s.latestActor=x.actor;
   }
   if(x.recoveryRequested===true){s.recoveries++;append('recovery_request_observed',x);}
   return snapshot();
  }
  function snapshot(){
   const s=session?{...session,visitedActors:session.visitedActors.slice()}:null;
   return {schema:SCHEMA,session:s,events:events.slice(),
    threePlayerCycleSeen:!!s&&s.visitedActors.length===3&&s.handoffs>=2,
    endurancePass:false,liveGameplayVerified:false};
  }
  function exportJSON(){return JSON.stringify({...snapshot(),
    warning:'Counters are observations, not evidence of successful uninterrupted ROM play.'},null,2);}
  return {observe,snapshot,exportJSON};
 }
 function mount(){
  if(document.getElementById('av183'))return;
  const host=document.querySelector('.instrument-panel')||document.querySelector('main');
  if(!host)return;
  const detector=create(),panel=document.createElement('details');panel.id='av183';
  panel.style.cssText='margin:8px 0;padding:10px;border:1px solid #a875ff;border-radius:8px;background:#1b1329;color:#f9ecff;font:12px system-ui';
  const heading=document.createElement('summary');heading.textContent='AV-183 · CONTINUOUS PLAY ENDURANCE';heading.style.cssText='cursor:pointer;font-weight:800;color:#ffab63';panel.append(heading);
  const hint=document.createElement('p');hint.textContent='Read-only NES frame clock, handoff and recovery telemetry. Counts stalls and resumes; does not decide actions, restart ROMs, or prove game completion.';panel.append(hint);
  const display=document.createElement('pre');display.style.cssText='white-space:pre-wrap;word-break:break-word';panel.append(display);
  const button=document.createElement('button');button.type='button';button.textContent='Export AV-183 endurance events';panel.append(button);
  button.addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([detector.exportJSON()],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='jane-av183-endurance.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
  host.insertBefore(panel,host.firstChild);
  let handoffIndex=0,recoveryIndex=0,pending=null,pendingRecovery=0;
  function tick(){
   let ctx=null,reading=null;try{ctx=window.JANE_RUN_CONTEXT?.();reading=document.getElementById('game')?.contentWindow?.JANE_PERCEPTION?.status?.();}catch(_){}
   const current=window.JANE_AV182_CONTINUITY?.snapshot?.(),hands=current?.events||[];
   for(let i=handoffIndex;i<hands.length;i++){
    const e=hands[i];
    if(e.kind==='handoff_started')pending={root:e.root,rom:e.rom,from:e.from,to:e.to,frame:e.frame};
   }
   handoffIndex=hands.length;
   const recovery=window.JANE_AV181_RECOVERY?.snapshot?.(),requests=recovery?.events?.filter(e=>e.kind==='start_recovery_requested')||[];
   if(requests.length<recoveryIndex)recoveryIndex=0;
   pendingRecovery=requests.length>recoveryIndex?requests.length-recoveryIndex:0;recoveryIndex=requests.length;
   const same=!!pending&&pending.root===ctx?.root&&pending.rom===ctx?.rom&&pending.to===ctx?.actor;
   const result=detector.observe({root:ctx?.root,rom:ctx?.rom,actor:ctx?.actor,frame:ctx?.frame,at:Date.now(),
    handoffAccepted:same,handoffFrom:same?pending.from:null,handoffTo:same?pending.to:null,
    recoveryRequested:pendingRecovery>0,running:reading?.running===true});
   if(same)pending=null;
   const s=result.session;
   display.textContent='ACTOR: '+(s?.latestActor||'—')+' | NES FRAMES: '+(s?.advanced??0)+
      '\nHANDOFFS: '+(s?.handoffs??0)+' | RECOVERY REQUESTS: '+(s?.recoveries??0)+
      '\nSTALLS: '+(s?.stalls??0)+' | CLOCK: '+(s?.clockFrozen?'FROZEN':'OBSERVING')+
      '\nTHREE-PLAYER CYCLE: '+(result.threePlayerCycleSeen?'OBSERVED':'NOT OBSERVED')+
      '\nENDURANCE PASS: UNVERIFIED';
  }
  tick();setInterval(tick,600);window.JANE_AV183_ENDURANCE=detector;
 }
 return {SCHEMA,ACTORS,create,mount};
});
