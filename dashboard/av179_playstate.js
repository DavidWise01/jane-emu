/* AV-179 — deterministic read-only gameplay / idle / stalled classifier.
 * Moving pixels are NOT proof of gameplay; unknown is the safe default.
 * Uses AV-097 traced frames, AV-176 operator labels and wall-clock stall observation.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.JaneAV179=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});
    else api.mount();
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SCHEMA='jane.av179.play-state.v1';
  const LABELS=new Set(['title','gameplay','game_over','recovery']);
  function create(config={}){
    const stallMs=Number.isFinite(config.stallMs)?Math.max(1500,config.stallMs):5000;
    const stillSamples=Number.isInteger(config.stillSamples)?Math.max(3,config.stillSamples):6;
    let root=null,rom=null,frame=null,frameAt=null,still=0,state='UNKNOWN',reason='uninitialized';
    let events=[],lastInput=null,clock=null;
    function event(kind,at,extra={}){
      const e=Object.freeze({kind,at,root,rom,frame,state,reason,...extra});
      events.push(e);if(events.length>500)events.shift();return e;
    }
    function classify(input){
      const x=input||{},at=Number(x.at);
      if(!Number.isFinite(at)||at<0)return snapshot();
      // Ignore stale wall-clock observations.
      if(clock!==null&&at<clock)return snapshot();
      clock=at;
      const r=typeof x.root==='string'?x.root:null;
      const m=typeof x.rom==='string'?x.rom:null;
      if(!r||!m||m==='unloaded'){
        if(state!=='UNLOADED'){root=r;rom=m;frame=null;still=0;frameAt=null;lastInput=null;state='UNLOADED';reason='no cartridge';event('state_changed',at);}
        return snapshot();
      }
      const n=Number.isSafeInteger(x.frame)&&x.frame>=0?x.frame:null;
      if(r!==root||m!==rom||(n!==null&&frame!==null&&n<frame)){
        root=r;rom=m;frame=null;frameAt=at;still=0;state='UNKNOWN';reason='new session';lastInput=null;
        event('session_reset',at);
      }
      const advanced=n!==null&&(frame===null||n>frame);
      if(advanced){frame=n;frameAt=at;}
      let label=LABELS.has(x.label)?x.label:null;
      // Labels must be grounded to a recent operator-confirmed, matching screen.
      if(x.labelCurrent!==true)label=null;
      if(Number.isFinite(x.delta)&&x.delta>=0&&x.delta<=1&&advanced){
        still=x.delta<0.006?still+1:0;
      }
      if(x.inputObserved===true)lastInput=at;
      let next='UNKNOWN',why='insufficient evidence';
      if(n===null){next='UNKNOWN';why='no frame count';}
      else if(frameAt!==null&&at-frameAt>=stallMs){next='STALLED';why='frame clock did not advance';}
      else if(label==='title'){next='MENU';why='operator-confirmed title screen';}
      else if(label==='game_over'){next='GAME_OVER';why='operator-confirmed game-over screen';}
      else if(label==='recovery'){next='RECOVERY';why='operator-confirmed recovery screen';}
      else if(label==='gameplay'){next='PLAYING_LABELED';why='operator-confirmed gameplay label';}
      else if(still>=stillSamples){next='IDLE_CANDIDATE';why='low pixel motion, not proof of menu';}
      else if(advanced){next='ACTIVE_UNCLASSIFIED';why='frames advancing without semantic label';}
      else{next='UNKNOWN';why='frame state has not changed';}
      if(next!==state||why!==reason){state=next;reason=why;event('state_changed',at);}
      return snapshot();
    }
    function snapshot(){return {schema:SCHEMA,root,rom,frame,state,reason,stillSamples:still,
      events:events.slice(),gameplayVerified:false};}
    function exportJSON(){return JSON.stringify({...snapshot(),caution:'Pixel motion and labels do not prove live ROM functionality; classification is observational.'},null,2);}
    return {classify,snapshot,exportJSON};
  }
  function mount(){
    if(document.getElementById('av179'))return;
    const host=document.querySelector('.instrument-panel')||document.querySelector('main');
    if(!host)return;
    const detector=create(),panel=document.createElement('details');panel.id='av179';
    panel.style.cssText='margin:8px 0;padding:10px;border:1px solid #ff8d33;border-radius:8px;background:#201627;color:#faf0ff;font:12px system-ui';
    const title=document.createElement('summary');title.textContent='AV-179 · GAMEPLAY / IDLE / STALL';title.style.cssText='cursor:pointer;font-weight:800;color:#ffb673';panel.append(title);
    const hint=document.createElement('p');hint.textContent='Read-only classification. A moving screen is not necessarily gameplay. Enable Screen Trace and use AV-176 labels to identify title, gameplay, game-over, or recovery.';panel.append(hint);
    const display=document.createElement('pre');display.style.cssText='white-space:pre-wrap;word-break:break-word';panel.append(display);
    const exportButton=document.createElement('button');exportButton.type='button';exportButton.textContent='Export AV-179 state log';panel.append(exportButton);
    exportButton.addEventListener('click',()=>{const blob=new Blob([detector.exportJSON()],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='jane-av179-state.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)});
    host.insertBefore(panel,host.firstChild);
    let sample=null,sampleWhen=0;
    window.addEventListener('jane-screen-trace',event=>{sample=event.detail;sampleWhen=Date.now();});
    function labelFor(ctx,now){
      const s=window.JANE_AV176_DETECTOR?.snapshot?.(),last=s?.latest;
      if(!s||s.root!==ctx.root||s.rom!==ctx.rom||!last||!sample||last.frame!==sample.frame||now-sampleWhen>3000||last.streak<3)return null;
      return s.labels?.find(entry=>entry.key===ctx.rom+'|'+last.hash)?.label||null;
    }
    function tick(){
      let ctx=null;try{ctx=window.JANE_RUN_CONTEXT?.()||null;}catch(e){}
      const now=Date.now(),fresh=sample&&now-sampleWhen<3000&&sample.source_root===ctx?.root;
      const label=fresh?labelFor(ctx,now):null;
      const result=detector.classify({at:now,root:ctx?.root,rom:ctx?.rom,frame:ctx?.frame,
        delta:fresh&&sample.frame===ctx?.frame?sample.delta:null,label,labelCurrent:!!label});
      display.textContent='STATE: '+result.state+'\nREASON: '+result.reason+
        '\nROM: '+(result.rom||'unloaded')+' · F'+(result.frame??'—')+
        '\nSTATE CHANGES: '+result.events.length+' · PLAYABILITY: UNVERIFIED';
    }
    tick();setInterval(tick,900);window.JANE_AV179_STATE=detector;
  }
  return {SCHEMA,create,mount};
});
