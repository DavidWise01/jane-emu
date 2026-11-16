/* AV-080 — Jane plays, Toph watches / teaches, Patricia audits.
 * A bounded same-context experiment coach; never a gameplay-reward oracle.
 * Same continuous NES session = ONE source ancestry, even with three observers.
 */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 root.JaneTophCoach=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const buttons=['A','B','UP','DOWN','LEFT','RIGHT'];
 const safe=v=>typeof v==='string'&&v.length>0&&v.length<=128;
 const finite=v=>Number.isFinite(v)&&v>=0&&v<=1;
 function make(){
  let rom='',rootId='',observations=[],seen=new Set(),lessons=[],pending=null,lastOfferFrame=-100000,offered=new Set(),enabled=true;
  function reset(r,ancestry){
   rom=String(r||'');rootId=String(ancestry||'');observations=[];seen=new Set();
   lessons=[];pending=null;lastOfferFrame=-100000;offered=new Set();
  }
  function setEnabled(v){enabled=Boolean(v);if(!enabled)pending=null}
  function observe(raw){
   if(!raw||!safe(raw.rom)||!safe(raw.preHash)||!buttons.includes(raw.button)||!finite(Number(raw.delta)))return null;
   if(rom!==raw.rom)reset(raw.rom,rootId);
   const id=String(raw.id)+'|'+raw.preHash+'|'+(raw.startFrame??'');
   if(seen.has(id))return null;
   seen.add(id);
   const x={id,rom:raw.rom,preHash:raw.preHash,button:raw.button,
     delta:Number(raw.delta),frame:Number(raw.endFrame)||0,
     ancestry:rootId,outcome:'UNLABELED'};
   observations.push(x);if(observations.length>300)observations.shift();
   if(pending&&pending.hash===x.preHash&&pending.button===x.button&&x.frame>=pending.frame){
     const result={...pending,kind:'feedback',observed_delta:x.delta,source_root:rootId,
       verdict:'PIXEL_RESPONSE_OBSERVED',benefit:'UNKNOWN',confidence:'UNPROVEN'};
     lessons.push(result);if(lessons.length>120)lessons.shift();
     pending=null;return result;
   }
   return null;
  }
  function propose({rom:currentRom,hash,frame,title}={}){
   if(!enabled||!safe(currentRom)||currentRom!==rom||!safe(hash)||!Number.isSafeInteger(frame)||frame<120)return null;
   if(title&&title!=='LEARNED'&&title!=='DONE')return null;
   if(frame-lastOfferFrame<240)return null;
   const same=observations.filter(x=>x.preHash===hash);
   if(same.length<2)return null;
   const counts=Object.fromEntries(buttons.map(b=>[b,same.filter(x=>x.button===b).length]));
   const ordered=[...buttons].sort((a,b)=>counts[a]-counts[b]||buttons.indexOf(a)-buttons.indexOf(b));
   const choice=ordered[0];
   const key=hash+'|'+choice;
   if(offered.has(key))return null;
   const samples=same.filter(x=>x.button===choice);
   const prediction=samples.length?samples.reduce((sum,x)=>sum+x.delta,0)/samples.length:null;
   const proposal={kind:'question',button:choice,rom:currentRom,hash,frame,source_root:rootId,
     previous_trials:same.length,prior_button_trials:samples.length,
     predicted_delta:prediction,benefit:'UNKNOWN',
     reason:'Test least-observed eligible action in a repeatedly witnessed screen context'};
   return proposal;
  }
  function recommend(context){
   if(pending)return null;
   const candidate=propose(context);if(!candidate)return null;
   offered.add(candidate.hash+'|'+candidate.button);
   lastOfferFrame=candidate.frame;pending=candidate;
   lessons.push({...candidate,kind:'teaching',status:'QUESTION_ONLY'});
   if(lessons.length>120)lessons.shift();
   return candidate.button;
  }
  function status(){return{rom,source_root:rootId,observed:observations.length,
    teachings:lessons.filter(l=>l.kind==='teaching').length,
    feedback:lessons.filter(l=>l.kind==='feedback').length,
    pending:pending?{button:pending.button,hash:pending.hash}:null,
    enabled,latest:lessons.at(-1)||null,lessons:lessons.slice(-50)}}
  return Object.freeze({reset,observe,propose,recommend,setEnabled,status});
 }
 return Object.freeze({create:make,version:'AV-080',buttons:Object.freeze(buttons)});
});