/* AV-205: bounded START priority within the EXISTING NES action scheduler.
 * No second emulator, input port, synthetic RAM or automatic success claims.
 */
(function(root,factory){'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV205=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const SCHEMA='jane.av205.priority-start.v1';
 function create({maxAttempts=4,gapFrames=48,holdFrames=12,maxBatches=2,retryPauseFrames=120}={}){
  let pending=null,history=[];
  const save=e=>{history.push(Object.freeze({...e}));if(history.length>64)history.shift();};
  const same=(a,b)=>a.root===b.root&&a.rom===b.rom&&a.actor===b.actor;
  function arm(x){
   if(!x||!x.root||!x.rom||!x.actor||![0,2].includes(x.mode)||
      !Number.isSafeInteger(x.frame)||x.frame<0||!x.evidenceId)return {ok:false,reason:'invalid-evidence'};
   if(pending?.evidenceId===x.evidenceId)return {ok:true,reason:'already-armed'};
   pending={root:x.root,rom:x.rom,actor:x.actor,mode:x.mode,
    evidenceId:x.evidenceId,armedFrame:x.frame,nextFrame:x.frame,
    attempts:0,completions:0,lastCompletedFrame:null,
    batch:1,totalAttempts:0,exhausted:false};
   save({event:'ARMED',id:x.evidenceId,frame:x.frame,mode:x.mode});
   return {ok:true,reason:'armed'};
  }
  function offer(x){
   if(!pending)return null;
   if(!x||!same(x,pending)||!Number.isSafeInteger(x.frame)||x.frame<pending.armedFrame){
    save({event:'CANCEL_CONTEXT',id:pending.evidenceId,frame:x?.frame??null});
    pending=null;return null;
   }
   // Gameplay state is observed from ROM RAM by the caller, never fabricated.
   if(x.mode===1){save({event:'PLAYING_OBSERVED',id:pending.evidenceId,frame:x.frame});pending=null;return null;}
   if(x.mode!==pending.mode){
    save({event:'CANCEL_MODE',id:pending.evidenceId,frame:x.frame,mode:x.mode});
    pending=null;return null;
   }
   if(pending.exhausted||x.frame<pending.nextFrame)return null;
   if(pending.attempts>=maxAttempts){
    if(pending.batch>=maxBatches){
     pending.exhausted=true;
     save({event:'START_EXHAUSTED',id:pending.evidenceId,frame:x.frame,
       totalAttempts:pending.totalAttempts,completed:pending.completions});
     return null;
    }
    pending.batch++;pending.attempts=0;
    pending.nextFrame=x.frame+retryPauseFrames;
    save({event:'START_RETRY_BATCH',id:pending.evidenceId,frame:x.frame,
      batch:pending.batch,completed:pending.completions});
    return null;
   }
   pending.attempts++;pending.totalAttempts++;
   pending.nextFrame=x.frame+gapFrames;
   save({event:'START_OFFER',id:pending.evidenceId,frame:x.frame,
     batch:pending.batch,attempt:pending.attempts,totalAttempts:pending.totalAttempts});
   return {button:'START',hold:holdFrames,source:SCHEMA};
  }
  function completed(x){
   if(!pending||!x||!same(x,pending)||x.button!=='START'||
      !Number.isSafeInteger(x.frame)||x.frame<pending.armedFrame||
      !pending.attempts||pending.completions>=pending.totalAttempts)return false;
   pending.completions++;
   pending.lastCompletedFrame=x.frame;
   save({event:'START_COMPLETED',id:pending.evidenceId,frame:x.frame,
     completed:pending.completions,attempts:pending.attempts});
   return true;
  }
  function snapshot(){return {schema:SCHEMA,pending:pending?{...pending}:null,history:history.map(x=>({...x}))};}
  return {arm,offer,completed,snapshot};
 }
 return {SCHEMA,create};
});
