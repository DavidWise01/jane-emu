/* AV-188 · live NES acceptance manifest. Observation only; never drives game.
 * Fail-closed: CI, synthetic fixtures or labels never graduate live gameplay.
 */
(function(root,factory){
 'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV188=api;
 if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});else api.mount();}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SCHEMA='jane.av188.endurance-freeze.v1';
 const REQUIRED=['boot','start','postStart','rotation','recovery','endurance','screenReview'];
 function evaluate(input={}){
  const ctx=input.context||{},b=input.boot||{},r=input.rotation||{},e=input.endurance||{},
        recovery=input.recovery||{},play=input.playability||{};
  const root=typeof ctx.root==='string'&&ctx.root?ctx.root:null;
  const rom=typeof ctx.rom==='string'&&ctx.rom&&ctx.rom!=='unloaded'?ctx.rom:null;
  const scoped=!!root&&!!rom;
  const bs=b.session||null,es=e.session||null,matchingBoot=scoped&&bs?.root===root&&bs?.rom===rom;
  const matchingEndurance=scoped&&es?.root===root&&es?.rom===rom;
  const matchingRotation=scoped&&r.root===root&&r.rom===rom;
  const events=Array.isArray(recovery.events)?recovery.events.filter(x=>x.root===root&&x.rom===rom):[];
  const requests=events.filter(x=>x.kind==='start_recovery_requested');
  const resumed=events.filter(x=>x.kind==='recovery_observed');
  const hasOrderedRecovery=requests.some(a=>resumed.some(z=>Number.isInteger(a.frame)&&Number.isInteger(z.frame)&&z.frame>a.frame));
  const localRows=Array.isArray(play.events)?play.events.filter(x=>x.root===root&&x.rom===rom):[];
  const observedGameScreen=localRows.some(x=>x.kind==='operator_gameplay_seen');
  const checks={
   boot:!!matchingBoot&&b.bootFramesObserved===true,
   start:!!matchingBoot&&b.startActionObserved===true,
   postStart:!!matchingBoot&&b.postStartFramesObserved===true,
   rotation:!!matchingRotation&&r.fullRotationObserved===true&&r.failed===false,
   recovery:scoped&&hasOrderedRecovery,
   endurance:!!matchingEndurance&&es.advanced>=3600&&es.stalls===0&&es.clockFrozen===false&&e.threePlayerCycleSeen===true,
   screenReview:observedGameScreen
  };
  const missing=REQUIRED.filter(k=>!checks[k]);
  const allSignals=missing.length===0;
  return {schema:SCHEMA,root,rom,checks,missing,signalsObserved:REQUIRED.length-missing.length,
    totalSignals:REQUIRED.length,verdict:allSignals?'READY_FOR_EXTERNAL_BROWSER_REVIEW':'INCOMPLETE',
    externalBrowserReviewed:false,liveGameplayVerified:false,phaseGateVerified:false,
    phase3Percent:0,phase2Percent:87.5,phaseDisposition:'closed_missing_live_rom_verification',
    note:'All local signals including manual screen labels require independent real NES browser review; never auto-promote from synthetic CI or UI telemetry.'};
 }
 function mount(){
  if(document.getElementById('av188'))return;
  const sidebar=document.querySelector('.instrument-panel');if(!sidebar)return;
  const panel=document.createElement('details');panel.id='av188';
  panel.style.cssText='margin:8px 0;padding:9px;border:1px solid #ff9b4d;border-radius:8px;background:#201329;color:#fff0f7;font:12px system-ui';
  const title=document.createElement('summary');title.style.cssText='cursor:pointer;font-weight:800;color:#ffb470';
  title.textContent='AV-188 · ENDURANCE / PHASE 3 FREEZE';panel.append(title);
  const info=document.createElement('p');info.textContent='Seven session-scoped integration signals. Export manifest for real ROM browser review. CI and manual labels do not prove gameplay.';panel.append(info);
  const display=document.createElement('pre');display.style.cssText='white-space:pre-wrap';panel.append(display);
  const button=document.createElement('button');button.type='button';button.textContent='Export AV-188 acceptance manifest';panel.append(button);
  function report(){
   let ctx={};try{ctx=window.JANE_RUN_CONTEXT?.()||{}}catch(_){}
   return evaluate({context:ctx,boot:window.JANE_AV185_MONITOR?.snapshot?.(),
     rotation:window.JANE_AV187_ROTATION?.snapshot?.(),endurance:window.JANE_AV183_ENDURANCE?.snapshot?.(),
     recovery:window.JANE_AV181_RECOVERY?.snapshot?.(),playability:window.JANE_AV175_RECORDER?.snapshot?.()});
  }
  button.addEventListener('click',()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(report(),null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=u;a.download='jane-av188-acceptance.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});
  function paint(){const s=report();display.textContent='PHASE 3 · FROZEN AT 0% LIVE-ROM ACCEPTANCE\n'+
    REQUIRED.map(k=>(s.checks[k]?'[OBSERVED] ':'[MISSING] ')+k).join('\n')+
    '\n'+s.signalsObserved+'/'+s.totalSignals+' signals · '+s.verdict+'\nGAMEPLAY: NOT EXTERNALLY VERIFIED';}
  sidebar.append(panel);paint();setInterval(paint,1200);
  window.JANE_AV188_ACCEPTANCE={report,SCHEMA};
 }
 return {SCHEMA,REQUIRED,evaluate,mount};
});
