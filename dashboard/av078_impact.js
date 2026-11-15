/* AV-078 — independent holdout comparison; observation only */
(function(root,create){const api=create();if(typeof module==='object'&&module.exports)module.exports=api;root.JaneAV078=api})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const valid=x=>typeof x==='string'&&/^[a-zA-Z0-9_.:/-]{1,128}$/.test(x);
const int=x=>Number.isSafeInteger(x)&&x>=0&&x<=10000;
function freeze(input){
 const a=input?.baseline,b=input?.revised,roots=input?.training_roots;
 if(!valid(input?.rom)||!valid(input?.context)||!valid(input?.button)||!valid(input?.question_id))
  return {status:'ABSTAIN',reason:'Missing exact question/cartridge/context'};
 if(!Array.isArray(roots)||new Set(roots).size<3||roots.some(x=>!valid(x)))
  return {status:'ABSTAIN',reason:'Need three independent training ancestries'};
 if(!a||!b||!int(a.predicted_pixel_bp)||!int(b.predicted_pixel_bp))
  return {status:'ABSTAIN',reason:'Both predeclared numeric forecasts required'};
 return {status:'FROZEN',question_id:input.question_id,rom:input.rom,context:input.context,
  button:input.button,training_roots:[...new Set(roots)].sort(),
  baseline_bp:a.predicted_pixel_bp,revised_bp:b.predicted_pixel_bp,
  reason:'Prospective evaluation on one independent holdout root; no action generated'};
}
function score(plan,holdout){
 if(plan?.status!=='FROZEN')return {status:'ABSTAIN',reason:'Plan not frozen before the observation'};
 if(!holdout||holdout.rom!==plan.rom||holdout.context!==plan.context||holdout.button!==plan.button
  ||!valid(holdout.source_root)||!int(holdout.pixel_change_bp))
  return {status:'ABSTAIN',reason:'Holdout missing, out of range, or mismatched context'};
 if(plan.training_roots.includes(holdout.source_root))
  return {status:'LEAKAGE_BLOCK',reason:'Holdout shares ancestry with training roots'};
 const baseline_error_bp=Math.abs(holdout.pixel_change_bp-plan.baseline_bp),
  revised_error_bp=Math.abs(holdout.pixel_change_bp-plan.revised_bp);
 const delta=baseline_error_bp-revised_error_bp;
 return {status:delta>0?'IMPROVED_PREDICTION':delta<0?'WORSE_PREDICTION':'TIED_PREDICTION',
  question_id:plan.question_id,source_root:holdout.source_root,
  observed_pixel_bp:holdout.pixel_change_bp,baseline_error_bp,revised_error_bp,
  error_reduction_bp:delta,semantic_gain:'UNPROVEN',outcome:'UNLABELED',
  reason:'Independent held-out pixel forecast scored; this is not demonstrated game benefit'};
}
return Object.freeze({freeze,score,version:'AV-078'});
});