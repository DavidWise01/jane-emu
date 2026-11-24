/* AV-192 — single-controller NES button timing and bounded survival.
 * Advisory hold lengths only for the exact AV-190-selected action.
 * Original menu, START, coaching, recovery and combat actions stay authoritative.
 */
(function(root,factory){'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV192=api;
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});
  else api.mount();
 }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SCHEMA='jane.av192.gameplay-timing.v1';
 const BUTTONS=['RIGHT','LEFT','UP','DOWN','A','B'];
 const HOLD={RIGHT:[6,18,10],LEFT:[6,18,10],UP:[6,18,9],DOWN:[6,18,9],A:[3,12,5],B:[3,12,5]};
 function create(){
  let identity=null,history={},latestFrame=-1,decisions=0,pending=null;
  function reset(x){identity=[x.root,x.rom,x.actor].join('|');latestFrame=-1;decisions=0;history={};pending=null;
   for(const button of BUTTONS)history[button]={hold:HOLD[button][2],zero:0,success:0,loss:0,observations:0};}
  function valid(x){return !!x?.root&&!!x?.rom&&x.rom!=='unloaded'&&
   ['JANE','TOPH','PATRICIA'].includes(x.actor)&&Number.isSafeInteger(x.frame)&&x.frame>=0;}
  function eligibleSelection(x){
   const selected=x.selected;
   return selected&&selected.root===x.root&&selected.rom===x.rom&&selected.actor===x.actor&&
     selected.button===x.button&&selected.frame===x.frame;
  }
  function hold(x={}){
   // Never alter timings when another policy owns the action.
   if(!valid(x)||!BUTTONS.includes(x.button)||!eligibleSelection(x))return null;
   const k=[x.root,x.rom,x.actor].join('|');
   if(k!==identity||x.frame<latestFrame)reset(x);
   latestFrame=x.frame;decisions++;pending={button:x.button,frame:x.frame,hold:history[x.button].hold};
   return history[x.button].hold;
  }
  function feedback(x={}){
   if(!valid(x)||!BUTTONS.includes(x.button)||x.completed!==true)return false;
   const k=[x.root,x.rom,x.actor].join('|');
   if(identity!==k)return false;
   const h=history[x.button];
   if(x.frame<=h.lastFrame)return false;
   h.lastFrame=x.frame;
   // The NES trace provides a screen-delta proxy, not a verified score.
   const d=Number.isFinite(x.delta)?Math.max(0,x.delta):0;
   if(x.lifeLost===true){
     h.loss++;h.hold=Math.max(HOLD[x.button][0],h.hold-2);
   }else if(d===0){
     h.zero++;h.hold=Math.max(HOLD[x.button][0],h.hold-1);
   }else{
     h.success++;h.zero=0;
     // Movement may need longer holds; attacks stay short and repeatable.
     h.hold=Math.min(HOLD[x.button][1],h.hold+(x.button==='A'||x.button==='B'?0:1));
   }
   h.observations++;return true;
  }
  function receipt(x={}){if(!pending||!valid(x)||identity!==[x.root,x.rom,x.actor].join('|')||x.button!==pending.button||x.startFrame!==pending.frame||x.frame<=x.startFrame||!Number.isFinite(x.delta)||x.completed!==true)return false;pending=null;return feedback(x);}
  function snapshot(){return {schema:SCHEMA,identity,decisions,
   timing:Object.fromEntries(BUTTONS.map(k=>[k,{...(history[k]||{hold:HOLD[k][2]})}])),
   gameplayVerified:false,meaning:'Frame-limited NES input timing; progress is a screen-change proxy'};}
  return {hold,feedback,receipt,snapshot};
 }
 function mount(){window.JANE_AV192_TIMING=create();}
 return {SCHEMA,BUTTONS,HOLD,create,mount};
});
