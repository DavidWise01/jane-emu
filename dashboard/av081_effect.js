/* AV-081 — preregistered teaching-effect evaluation.
 * Distinct game attempts are not inherently independent evidence sources.
 * Survival frames after a confirmed life-loss are a gameplay proxy, not proof of causality.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.JaneAV081=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const safe=v=>typeof v==='string'&&/^[A-Za-z0-9_.:/-]{1,128}$/.test(v);
function plan(x){
 if(!x||!safe(x.rom)||!safe(x.context)||!safe(x.run_root)||
    !Number.isSafeInteger(x.start_frame)||x.start_frame<0||
    !['baseline','coached'].includes(x.arm))
  return {state:'ABSTAIN',reason:'Need a loaded ROM, observed initial context, unique run ID, frame and assigned arm.'};
 return {state:'ARMED',schema:'jane.teaching-effect.av081',rom:x.rom,context:x.context,
  run_root:x.run_root,start_frame:x.start_frame,arm:x.arm,
  metric:'frames_until_human_confirmed_life_loss',criterion:'coached_median_minus_baseline_median_positive',
  root_status:'attempt_id_only_not_independent_witness',label:'UNOBSERVED'};
}
function close(p,frame,confirmed){
 if(p?.state!=='ARMED'||!confirmed)return {state:'ABSTAIN',reason:'Life loss not independently confirmed, or no preregistered attempt.'};
 if(!Number.isSafeInteger(frame)||frame<=p.start_frame)return {state:'ABSTAIN',reason:'No positive NES-frame interval available.'};
 return {...p,state:'COMPLETE',end_frame:frame,survival_frames:frame-p.start_frame,
  label:'HUMAN_CONFIRMED_LIFE_LOSS',benefit:'NOT_VERIFIED_CAUSAL',verified_by:'human_button_or_game_specific_sensor'};
}
const median=a=>a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;
function assess(rows){
 const v=Array.isArray(rows)?rows.filter(r=>r?.state==='COMPLETE'&&safe(r.rom)&&safe(r.context)&&safe(r.run_root)&&
 ['baseline','coached'].includes(r.arm)&&Number.isSafeInteger(r.survival_frames)&&r.survival_frames>0&&
 r.metric==='frames_until_human_confirmed_life_loss'&&r.label==='HUMAN_CONFIRMED_LIFE_LOSS'):[];
 if(!v.length)return {state:'INSUFFICIENT',baseline:0,coached:0,reason:'No completed human-confirmed attempts'};
 const rom=v[0].rom,context=v[0].context;
 const scoped=v.filter(r=>r.rom===rom&&r.context===context);
 if(scoped.length!==v.length)return {state:'CONTESTED',reason:'Mixed cartridges or starting contexts cannot be compared'};
 const roots=new Set(),valid=[];
 for(const r of scoped){if(roots.has(r.run_root))continue;roots.add(r.run_root);valid.push(r);}
 const a=valid.filter(x=>x.arm==='baseline').map(x=>x.survival_frames).sort((a,b)=>a-b);
 const b=valid.filter(x=>x.arm==='coached').map(x=>x.survival_frames).sort((a,b)=>a-b);
 if(a.length<3||b.length<3)return {state:'INSUFFICIENT',rom,context,baseline:a.length,coached:b.length,
  reason:'Require three distinct attempts in each preregistered arm; distinct attempts are not independent corroborating sources'};
 const base=median(a),taught=median(b),delta=taught-base;
 return {state:delta>0?'PROMISING_PROXY':delta===0?'NO_PROXY_DIFFERENCE':'WORSE_PROXY',
  rom,context,baseline:a.length,coached:b.length,baseline_median_frames:base,
  coached_median_frames:taught,median_difference_frames:delta,
  causal_claim:false,lesson_retained:false,
  reason:'Comparative survival proxy only; requires controlled repeatability and independent evidence before teaching retention'};
}
return Object.freeze({plan,close,assess,version:'AV-081'});
});