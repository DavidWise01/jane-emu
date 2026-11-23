/* AV-213: frame-bounded, read-only NES gameplay fault isolation.
 * Uses only observations from the running original JSNES and existing monitors.
 * No extra emulator, input injection, or fabricated action receipts.
 */
(function(root,factory){'use strict';
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV213=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const SCHEMA='jane.av213.original-nes-fault-isolation.v1';
 const valid=x=>x&&x.root&&x.rom&&['JANE','TOPH','PATRICIA'].includes(x.actor)&&
  Number.isSafeInteger(x.frame)&&x.frame>=0&&[0,1,2].includes(x.mode);
 function create(){
  let session=null,previous=null,lastAdvanceMs=null,events=[],seen=new Set(),lastFault=null;
  let lastModeFrame=null,lastActionCompleted=null,observations=0,clockRewinds=0;
  function push(kind,x,detail={}){
   const key=[x.root,x.rom,x.actor,kind,detail.evidenceId||lastModeFrame||0].join('|');
   if(seen.has(key))return;
   seen.add(key);const event={kind,root:x.root,rom:x.rom,actor:x.actor,
    frame:x.frame,observedAtMs:x.nowMs,...detail};
   events.push(event);if(events.length>128)events.shift();lastFault=event;
  }
  function ingest(x){
   if(!valid(x)||!Number.isFinite(x.nowMs)||x.nowMs<0)return snapshot();
   const id=x.root+'|'+x.rom;
   if(session!==id||previous&&x.frame<previous.frame){
    if(previous&&session===id&&x.frame<previous.frame)clockRewinds++;
    session=id;previous=null;lastAdvanceMs=x.nowMs;lastModeFrame=x.frame;
    lastActionCompleted=null;seen.clear();
   }
   observations++;
   if(previous&&x.frame>previous.frame)lastAdvanceMs=x.nowMs;
   if(previous?.mode!==x.mode)lastModeFrame=x.frame;
   const age=x.nowMs-lastAdvanceMs;
   // The wall clock detects an emulator freeze when NES frames stop.
   if(previous&&x.frame===previous.frame&&age>=2000)
    push('NES_FRAME_STALLED',x,{elapsedMs:Math.floor(age)});
   // Offer != completion. Avoid attributing unknown delivery to game failure.
   const priority=x.startPolicy?.pending;
   if(priority&&Number.isSafeInteger(priority.attempts)&&priority.attempts>=1&&
      priority.completions===0&&x.frame-priority.armedFrame>=120)
    push('START_NOT_COMPLETED',x,{evidenceId:priority.evidenceId,
      attempts:priority.attempts});
   if(priority?.exhausted===true)
    push('START_RECOVERY_EXHAUSTED',x,{evidenceId:priority.evidenceId,
      totalAttempts:priority.totalAttempts,completed:priority.completions});
   const pending=x.gameplay?.pending;
   if(x.mode===1&&pending&&x.frame-pending.startFrame>=90&&
     !x.gameplay?.history?.some(e=>e.kind==='RESULT'&&e.frame>=pending.startFrame))
    push('GAMEPLAY_RECEIPT_MISSING',x,{button:pending.button,
      evidenceId:[pending.actor,pending.startFrame,pending.button].join(':')});
   // Distinguish start failure, transfer failure and restart failure.
   if(x.mode===0&&x.frame-lastModeFrame>=240&&!priority)
    push('TITLE_WITHOUT_START_REQUEST',x);
   if(x.mode===2&&x.frame-lastModeFrame>=120&&
      !x.monitor?.observations?.some(e=>e.kind==='AV202_REAL_DEFEAT_HANDOFF'&&
       e.frame>=lastModeFrame))
    push('DEFEAT_WITHOUT_HANDOFF',x);
   if(x.mode===2&&x.monitor?.observations?.some(e=>e.kind==='AV202_REAL_DEFEAT_HANDOFF'&&
       e.frame>=lastModeFrame)&&x.frame-lastModeFrame>=240)
    push('HANDOFF_WITHOUT_RESTART',x);
   previous={frame:x.frame,mode:x.mode,actor:x.actor};
   return snapshot();
  }
  function snapshot(){return {schema:SCHEMA,session,observations,clockRewinds,
    lastFrame:previous?.frame??null,lastMode:previous?.mode??null,lastFault,
    events:events.map(x=>({...x})),readOnly:true,
    note:'Fault candidates need live-browser review. Events never certify successful gameplay.'};}
  return {ingest,snapshot};
 }
 return {SCHEMA,create};
});
