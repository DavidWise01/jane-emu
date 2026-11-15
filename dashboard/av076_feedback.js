/* AV-076: question-to-trial evidence binding. No gameplay reward claims. */
(function(root,make){
 const api=make();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.JaneAV076=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const allowed=['START','SELECT','A','B','UP','DOWN','LEFT','RIGHT'];
 const token=v=>typeof v==='string'&&/^[a-zA-Z0-9_.:/-]{1,128}$/.test(v);
 function normalizeButton(value){
   const v=String(value||'').toUpperCase().trim();
   return allowed.includes(v)?v:null;
 }
 function freeze(info){
   if(!info||info.state!=='PROPOSE'||!token(info.rom)||!token(info.context)||!token(info.word)||!normalizeButton(info.button))
     return {state:'ABSTAIN',reason:'Question lacks a confirmed word, exact context or an eligible proposed input.'};
   if(!Number.isSafeInteger(info.frame)||info.frame<0)
     return {state:'ABSTAIN',reason:'Missing a valid pre-experiment NES frame.'};
   if(!token(info.question_id))
     return {state:'ABSTAIN',reason:'Question has no stable identifier.'};
   return {state:'ARMED',question_id:info.question_id,rom:info.rom,context:info.context,
    word:info.word,button:info.button,frame:info.frame,missing_roots:Math.max(0,Number(info.missing_roots)||0)};
 }
 function close(question,trial){
   if(!question||question.state!=='ARMED')return {state:'ABSTAIN',reason:'No frozen question is armed.'};
   if(!trial||!token(trial.rom)||!token(trial.preHash)||!Number.isSafeInteger(trial.startFrame))
     return {state:'ABSTAIN',reason:'Trial does not contain a rooted pre-action witness.'};
   if(trial.rom!==question.rom)return {state:'MISMATCH',reason:'Cartridge changed after question was frozen.'};
   if(trial.startFrame<=question.frame)return {state:'MISMATCH',reason:'Trial predates or overlaps the question.'};
   if(normalizeButton(trial.button)!==question.button)return {state:'MISMATCH',reason:'Observed action differs from the frozen proposed input.'};
   const d=Number(trial.delta);
   if(!Number.isFinite(d)||d<0||d>1)return {state:'ABSTAIN',reason:'Pixel response is unmeasured or out of range.'};
   const frames=Number(trial.endFrame);
   if(!Number.isSafeInteger(frames)||frames<trial.startFrame)return {state:'ABSTAIN',reason:'Trial lacks a valid completion frame.'};
   return {state:'OBSERVED',question_id:question.question_id,rom:question.rom,context:question.context,
    word:question.word,button:question.button,source_pre_hash:trial.preHash,frame:frames,
    pixel_change_bp:Math.round(d*10000),missing_roots_before:question.missing_roots,
    missing_roots_after:question.missing_roots,
    benefit:'UNKNOWN',semantic_gain:'UNPROVEN',
    reason:'Action-conditioned pixel change was observed; no independently labeled beneficial outcome and no proven uncertainty reduction.'};
 }
 function event(closed,rootId){
   if(!closed||closed.state!=='OBSERVED'||!token(rootId))return null;
   return {kind:'experiment_feedback',rom:closed.rom,source_root:rootId,source:'nes-action-observation',
    context:closed.context,word:closed.word,button:closed.button,question_id:closed.question_id,
    frame:closed.frame,pixel_change_bp:closed.pixel_change_bp,status:'OBSERVED_UNLABELED',
    note:'Observed pixel response only; no human benefit label or semantic proof'};
 }
 return Object.freeze({freeze,close,event,normalizeButton,version:'AV-076'});
});