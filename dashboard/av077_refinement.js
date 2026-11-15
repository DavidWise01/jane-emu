/* AV-077 — prospective prediction refinement, no controller authority */
(function(root, make){
 const engine=make();
 if(typeof module==='object'&&module.exports)module.exports=engine;
 root.JaneAV077=engine;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const allowed=['START','A','B','UP','DOWN','LEFT','RIGHT','SELECT'];
 const valid=x=>typeof x==='string'&&/^[A-Za-z0-9_.:/-]{1,128}$/.test(x);
 const integer=(n,min=0,max=10000)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 const clamp=n=>Math.min(10000,Math.max(0,Math.round(n)));
 function freeze(question,records){
  if(!question||question.state!=='ARMED'||!valid(question.rom)||!valid(question.context)||!allowed.includes(question.button))
   return {status:'ABSTAIN',reason:'No rooted, armed AV-076 question'};
  const seen=new Map();
  for(const rec of (Array.isArray(records)?records:[])){
   if(!rec||rec.kind!=='experiment_feedback'||rec.status!=='OBSERVED_UNLABELED')continue;
   if(rec.rom!==question.rom||rec.context!==question.context||rec.button!==question.button)continue;
   if(!valid(rec.source_root)||!integer(rec.pixel_change_bp))continue;
   // A single ancestry supplies at most one historical sample, regardless of how many replay forks.
   if(!seen.has(rec.source_root))seen.set(rec.source_root,rec.pixel_change_bp);
  }
  const sorted=[...seen.values()].sort((a,b)=>a-b);
  if(sorted.length<3)return {status:'UNTRAINED',root_count:sorted.length,
    reason:'Need '+(3-sorted.length)+' more independent prior observation roots; no numeric forecast'};
  const n=sorted.length, median=n%2?sorted[(n-1)/2]:Math.round((sorted[n/2-1]+sorted[n/2])/2);
  // A conservative empirical span, pre-frozen; NOT a calibrated probabilistic coverage claim.
  const low=clamp(sorted[0]-250), high=clamp(sorted[n-1]+250);
  return {status:'FORECAST',root_count:n,predicted_pixel_bp:median,
    prediction_low_bp:low,prediction_high_bp:high,
    reason:'Empirical median with min/max ±250 bp margin, frozen before the new action'};
 }
 function compare(forecast,observed,root){
  if(!integer(observed)||!valid(root))return {status:'ABSTAIN',reason:'No rooted valid pixel measurement'};
  if(!forecast||forecast.status!=='FORECAST')return {status:'NEEDS_ROOTS',prediction_error_bp:null,
   reason:'Observation recorded; no frozen independent-root forecast was available'};
  if(!integer(forecast.predicted_pixel_bp)||!integer(forecast.prediction_low_bp)||!integer(forecast.prediction_high_bp))
   return {status:'ABSTAIN',reason:'Stored prediction is invalid'};
  const outside=observed<forecast.prediction_low_bp||observed>forecast.prediction_high_bp;
  return {status:outside?'BOUNDARY_MISS':'WITHIN_BAND',
   prediction_error_bp:Math.abs(observed-forecast.predicted_pixel_bp),
   reason:outside?'Observed pixels fall outside pre-frozen empirical span; investigate changed context or insufficient model':
     'Observed pixel response falls inside pre-frozen span; this is not a success label'};
 }
 function attach(event,forecast,comparison){
  if(!event||event.kind!=='experiment_feedback'||!comparison||comparison.status==='ABSTAIN')return null;
  const result={...event,refinement_state:comparison.status};
  if(forecast?.status==='FORECAST'){
   result.predicted_pixel_bp=forecast.predicted_pixel_bp;
   result.prediction_low_bp=forecast.prediction_low_bp;
   result.prediction_high_bp=forecast.prediction_high_bp;
   result.prior_root_count=forecast.root_count;
   result.prediction_error_bp=comparison.prediction_error_bp;
  }
  return result;
 }
 return Object.freeze({freeze,compare,attach,version:'AV-077'});
});