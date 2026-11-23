/* AV-218: retain the actual completed START receipt through the
 * post-defeat 60-frame verification window. One original NES ancestry.
 * Cannot synthesize restart, action delivery, movement or a victory.
 */
(function(root,factory){'use strict';
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV218=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const SCHEMA='jane.av218.post-defeat-start-receipt.v1';
 function capture(cycle,trials,root,rom,frame){
  if(!cycle||!cycle.transfer||!cycle.defeatId||!root||!rom||
     !Number.isSafeInteger(frame)||!Array.isArray(trials))return null;
  if(cycle.startReceipt)return cycle.startReceipt;
  const possible=trials.filter(t=>t&&String(t.button).toUpperCase()==='START'&&
    Number.isSafeInteger(t.endFrame)&&t.endFrame>cycle.defeatFrame&&
    t.endFrame<=frame&&t.arenaRoot===root&&t.arenaActor===cycle.transfer.to&&
    t.rom===rom);
  if(!possible.length)return null;
  possible.sort((a,b)=>a.endFrame-b.endFrame);
  const first=possible[0];
  cycle.startReceipt={frame:first.endFrame,actor:cycle.transfer.to,
    root,rom,evidenceId:cycle.defeatId,trialId:String(first.id??''),
    source:'completed-original-nes-trial'};
  return cycle.startReceipt;
 }
 function qualify(cycle,frame,actor){
  if(!cycle?.transfer||!cycle?.restart||!cycle?.startReceipt||
     !Number.isSafeInteger(frame)||frame<cycle.restart.frame+60||
     cycle.resumed||actor!==cycle.transfer.to||
     cycle.restart.actor!==actor||cycle.startReceipt.actor!==actor||
     cycle.startReceipt.evidenceId!==cycle.defeatId||
     cycle.startReceipt.frame<=cycle.defeatFrame||
     cycle.startReceipt.frame>frame)return null;
  return {frame,actor,startReceiptFrame:cycle.startReceipt.frame,
    source:'NES-playing-60-frames-plus-matching-completed-START'};
 }
 return {SCHEMA,capture,qualify};
});
