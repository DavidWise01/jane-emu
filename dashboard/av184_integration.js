/* AV-184 · one-session ROM playability acceptance recorder.
 * Reads previously existing browser instruments. Never operates or resets the NES.
 * Does not declare a successful end-to-end ROM test without real session evidence.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV184=api;
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});
  else api.mount();
 }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SCHEMA='jane.av184.integrated-browser-check.v1';
 const REQUIRED=['cartridgeLoaded','frameProgress','startActivity','threePlayerContinuity','recoveryEpisode'];
 function evaluate(input={}){
  const now=input.now||new Date().toISOString();
  const context=input.context||{},play=input.playability||{},handoff=input.handoff||{},
   endurance=input.endurance||{},recovery=input.recovery||{},scene=input.scene||{};
  const root=typeof context.root==='string'&&context.root?context.root:null;
  const rom=typeof context.rom==='string'&&context.rom&&context.rom!=='unloaded'?context.rom:null;
  const scoped=!!root&&!!rom;
  const playRows=Array.isArray(play.events)?play.events:[];
  const handRows=Array.isArray(handoff.events)?handoff.events:[];
  const recoverRows=Array.isArray(recovery.events)?recovery.events:[];
  const es=endurance.session||null;
  const sameEndurance=scoped&&es?.root===root&&es?.rom===rom;
  const samePlay=scoped&&play.latest?.root===root&&play.latest?.rom===rom;
  const validHandoffs=handRows.filter(e=>e.kind==='frame_continuity_observed'&&e.root===root&&e.rom===rom);
  const uniqueMoves=new Set(validHandoffs.map(e=>e.from+'>'+e.to));
  const startActions=playRows.filter(e=>e.root===root&&e.rom===rom&&e.kind==='operator_start_sent');
  const recoveryRequests=recoverRows.filter(e=>e.root===root&&e.rom===rom&&e.kind==='start_recovery_requested');
  const recoveryObservations=recoverRows.filter(e=>e.root===root&&e.rom===rom&&e.kind==='recovery_observed');
  const failures=handRows.filter(e=>e.root===root&&e.rom===rom&&['continuity_failed','continuity_timeout'].includes(e.kind));
  const checks={
   cartridgeLoaded:{observed:scoped&&samePlay&&sameEndurance,source:'same-root cartridge identity in recorder and endurance'},
   frameProgress:{observed:sameEndurance&&es.advanced>=600&&es.clockFrozen===false,source:'at least 600 monotonically observed NES frames'},
   startActivity:{observed:startActions.length>0,source:'operator-marked START input; delivery unproven'},
   threePlayerContinuity:{observed:validHandoffs.length>=2&&uniqueMoves.size>=2&&failures.length===0&&sameEndurance&&endurance.threePlayerCycleSeen===true,source:'accepted handoffs followed by frame advance'},
   recoveryEpisode:{observed:recoveryRequests.length>0&&recoveryObservations.length>0,source:'bounded recovery request plus operator-labeled resume'}
  };
  const passed=REQUIRED.filter(key=>checks[key].observed);
  const missing=REQUIRED.filter(key=>!checks[key].observed);
  // These are local signals, not an independently verified full playable ROM trace.
  const allSignalsObserved=missing.length===0;
  return {schema:SCHEMA,at:now,root,rom,checks,observedSignals:passed.length,totalSignals:REQUIRED.length,
    missing,allSignalsObserved,
    verdict:allSignalsObserved?'READY_FOR_LIVE_REVIEW':'INCOMPLETE',
    phaseGateVerified:false,phaseProgress:87.5,
    browserEvidenceOnly:true,
    caution:'Operator labels and recorded frame progression are observations, not proof of successful NES gameplay. Final integration requires explicit browser ROM review.'};
 }
 function mount(){
  if(document.getElementById('av184'))return;
  const host=document.querySelector('.instrument-panel')||document.querySelector('main');
  if(!host)return;
  const panel=document.createElement('details');panel.id='av184';
  panel.style.cssText='margin:8px 0;padding:10px;border:1px solid #f3a75c;border-radius:8px;background:#181229;color:#f6edff;font:12px system-ui';
  const heading=document.createElement('summary');heading.style.cssText='cursor:pointer;font-weight:800;color:#ffb46b';heading.textContent='AV-184 · INTEGRATION / PHASE FREEZE';panel.append(heading);
  const note=document.createElement('p');note.textContent='Read-only: open a legal .nes ROM, confirm screens in AV-176, play and record START, handoffs, defeat and recovery. Export a same-session report. Synthetic CI does not earn the last 12.5%.';panel.append(note);
  const output=document.createElement('pre');output.style.cssText='white-space:pre-wrap;word-break:break-word';panel.append(output);
  const btn=document.createElement('button');btn.type='button';btn.textContent='Export AV-184 browser report';panel.append(btn);
  function report(){
   let ctx=null;try{ctx=window.JANE_RUN_CONTEXT?.()||null;}catch(_){}
   return evaluate({context:ctx,playability:window.JANE_AV175_RECORDER?.snapshot?.(),
    handoff:window.JANE_AV182_CONTINUITY?.snapshot?.(),
    endurance:window.JANE_AV183_ENDURANCE?.snapshot?.(),
    recovery:window.JANE_AV181_RECOVERY?.snapshot?.(),
    scene:window.JANE_AV179_STATE?.snapshot?.()});
  }
  btn.addEventListener('click',()=>{
   const r=report(),u=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)],{type:'application/json'})),a=document.createElement('a');
   a.href=u;a.download='jane-av184-browser-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
  });
  function render(){
   const r=report();
   output.textContent='PHASE 2: 87.5% · FROZEN PENDING ROM ACCEPTANCE\n'+
    REQUIRED.map(k=>(r.checks[k].observed?'[OBSERVED] ':'[MISSING] ')+k).join('\n')+
    '\nSESSION SIGNALS: '+r.observedSignals+'/'+r.totalSignals+
    '\nVERDICT: '+r.verdict+' · FINAL GATE: NOT VERIFIED\nOne game · One controller · Three turns';
  }
  host.insertBefore(panel,host.firstChild);render();setInterval(render,1100);
  window.JANE_AV184_REVIEW={report,SCHEMA};
 }
 return {SCHEMA,REQUIRED,evaluate,mount};
});
