/* AV-219 — audit actual sequential NES defeats and restarts.
 * Read-only: consumes AV-201 observed cycles, never authorizes input or handoff.
 */
(function(root,factory){'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV219=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const SCHEMA='jane.av219.unassisted-three-player-chain.v1';
 const ACTORS=['JANE','TOPH','PATRICIA'];
 function audit(cycles,root,rom){
  const result={schema:SCHEMA,root:root||null,rom:rom||null,
    verifiedCycles:0,complete:false,firstFault:null,receipts:[],
    expected:'JANE→TOPH→PATRICIA',readOnly:true};
  if(!root||!rom||!Array.isArray(cycles))return {...result,firstFault:'MISSING_GAME_ANCESTRY'};
  let lastDefeat=-1,lastResume=-1;
  const used=new Set();
  for(let i=0;i<Math.min(cycles.length,2);i++){
   const c=cycles[i],from=ACTORS[i],to=ACTORS[i+1];
   const fail=reason=>{result.firstFault={cycle:i+1,reason,from,to};return result};
   if(!c||c.defeatCount!==i+1||!Number.isSafeInteger(c.defeatFrame)||
       c.defeatFrame<=lastDefeat||c.defeatFrame<=lastResume)
     return fail('UNORDERED_OR_MISSING_NES_DEFEAT');
   if(!c.defeatId||used.has('defeat:'+c.defeatId)||c.ownerAtDefeat!==from)
     return fail('WRONG_LOSS_OWNER_OR_DUPLICATE_DEFEAT');
   used.add('defeat:'+c.defeatId);
   if(!c.transfer||c.transfer.from!==from||c.transfer.to!==to||
       c.transfer.frame<c.defeatFrame)return fail('WRONG_OR_MISSING_OWNER_TRANSFER');
   const r=c.startReceipt;
   if(!r||r.source!=='completed-original-nes-trial'||r.actor!==to||
       r.root!==root||r.rom!==rom||r.evidenceId!==c.defeatId||
       !Number.isSafeInteger(r.frame)||r.frame<=c.defeatFrame)
     return fail('MISSING_OR_FOREIGN_COMPLETED_START');
   const receiptKey=[r.root,r.rom,r.actor,r.frame,r.trialId].join('|');
   if(used.has('receipt:'+receiptKey))return fail('REUSED_START_RECEIPT');
   used.add('receipt:'+receiptKey);
   if(!c.restart||c.restart.actor!==to||
       !Number.isSafeInteger(c.restart.frame)||
       c.restart.frame<c.defeatFrame)return fail('RESTART_NOT_OBSERVED');
   if(!c.resumed||c.resumed.actor!==to||
       c.resumed.startReceiptFrame!==r.frame||
       !Number.isSafeInteger(c.resumed.frame)||
       c.resumed.frame<c.restart.frame+60)
     return fail('SUSTAINED_PLAY_NOT_OBSERVED');
   lastDefeat=c.defeatFrame;lastResume=c.resumed.frame;
   result.verifiedCycles++;
   result.receipts.push({defeatId:c.defeatId,from,to,
     defeatFrame:c.defeatFrame,startFrame:r.frame,resumedFrame:c.resumed.frame});
  }
  if(result.verifiedCycles===2){result.complete=true;return result;}
  result.firstFault={cycle:result.verifiedCycles+1,
    reason:'NEXT_CARTRIDGE_DEFEAT_NOT_YET_OBSERVED',
    from:ACTORS[result.verifiedCycles],to:ACTORS[result.verifiedCycles+1]};
  return result;
 }
 return {SCHEMA,audit};
});
