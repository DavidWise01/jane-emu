/* AV-226 — strict, read-only per-life NES controller effect lineage.
 * Do not infer successful gameplay from a handoff, a button offer, or RAM
 * evidence outside the incoming player's own observed restart interval.
 */
(function(root,factory){'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV226=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const SCHEMA='jane.av226.per-life-completed-effects.v1';
 const PAD=new Set(['LEFT','RIGHT','UP','DOWN']);
 function audit(cycles,rows,root,rom){
  const result={schema:SCHEMA,root:root||null,rom:rom||null,
   complete:false,qualifiedLives:0,players:[],firstFault:null,readOnly:true};
  if(!root||!rom||!Array.isArray(cycles)||!Array.isArray(rows))
   return {...result,firstFault:'MISSING_INPUT_ANCESTRY'};
  for(let i=0;i<2;i++){
   const c=cycles[i],next=cycles[i+1],actor=i===0?'TOPH':'PATRICIA';
   const fail=reason=>{
    result.firstFault={life:i+1,actor,reason};return result;
   };
   if(!c?.transfer||c.transfer.to!==actor||!c.restart||
      c.restart.actor!==actor||!Number.isSafeInteger(c.restart.frame)||
      !c.resumed||c.resumed.actor!==actor||
      !Number.isSafeInteger(c.resumed.frame)||!c.startReceipt||
      c.startReceipt.actor!==actor||c.startReceipt.root!==root||
      c.startReceipt.rom!==rom||c.startReceipt.evidenceId!==c.defeatId)
    return fail('RESTART_ANCESTRY_NOT_CONFIRMED');
   const begin=c.restart.frame;
   const end=next?.defeatFrame??Infinity;
   if(end!==Infinity&&(!Number.isSafeInteger(end)||end<=begin))
    return fail('INVALID_LIFE_END');
   const relevant=rows.filter(x=>x?.root===root&&x.rom===rom&&
     x.actor===actor&&x.kind==='NES_EFFECT_OBSERVED'&&x.changed===true&&
     Number.isSafeInteger(x.startFrame)&&Number.isSafeInteger(x.endFrame)&&
     x.endFrame>x.startFrame&&x.startFrame>=begin&&x.endFrame<end&&
     x.before?.mode===1&&x.after?.mode===1);
   // AV-227: the same original receipt may appear in the current ring and
   // retained first-effect archive. Count it once by its source identity.
   const unique=[],seen=new Set();
   for(const x of relevant){
     const key=x.id||[x.root,x.rom,x.actor,x.button,
       x.startFrame,x.endFrame].join('|');
     if(seen.has(key))continue;
     seen.add(key);unique.push(x);
   }
   const movement=unique.filter(x=>PAD.has(x.button));
   const colors=unique.filter(x=>x.button==='A'||x.button==='B');
   const hasA=colors.some(x=>x.button==='A'&&x.after?.palette===0x16);
   const hasB=colors.some(x=>x.button==='B'&&x.after?.palette===0x2a);
   const summary={actor,begin,end:end===Infinity?null:end,
     movement:movement.length,colorChanges:colors.length,hasA,hasB,
     actions:unique.length,qualified:false};
   result.players.push(summary);
   if(movement.length<1)return fail('MISSING_COMPLETED_MOVEMENT_IN_LIFE');
   if(!hasA||!hasB)return fail('MISSING_A_OR_B_PALETTE_EFFECT_IN_LIFE');
   summary.qualified=true;result.qualifiedLives++;
  }
  result.complete=true;return result;
 }
 return {SCHEMA,audit};
});
