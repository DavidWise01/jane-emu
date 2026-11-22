/* AV-191 goal-directed mechanics modifier.
 * Advisory-only: supplies bounded action biases to AV-190's sole chooseAction
 * path, using completed trial feedback and explicit observed life loss.
 * No independent input dispatch, no guesses about a game's rules.
 */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV191=api;if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});else api.mount();
 }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SCHEMA='jane.av191.goal-guidance.v1',ACTIONS=['RIGHT','LEFT','UP','DOWN','A','B'];
 function create(opts={}){
  const stalledLimit=Number.isInteger(opts.stalledLimit)?Math.max(2,opts.stalledLimit):3;
  let session=null,lastFrame=-1,totals={},lastResult={},losses=0,events=[],seen=0;
  function init(x){session=[x.root,x.rom,x.actor].join('|');lastFrame=-1;totals={};lastResult={};losses=0;seen=0;
   for(const a of ACTIONS)totals[a]={trials:0,zero:0,loss:0,positive:0};}
  function valid(x){return x&&x.root&&x.rom&&x.rom!=='unloaded'&&['JANE','TOPH','PATRICIA'].includes(x.actor)&&Number.isSafeInteger(x.frame)&&x.frame>=0}
  function feedback(x={}){
   if(!valid(x)||x.completed!==true||!ACTIONS.includes(x.button))return false;
   const key=[x.root,x.rom,x.actor].join('|');if(key!==session)init(x);
   if(x.frame<=lastFrame)return false;lastFrame=x.frame;
   const t=totals[x.button];t.trials++;seen++;
   if(x.lifeLost===true){t.loss++;losses++;}
   const change=Number.isFinite(x.delta)?Math.max(0,x.delta):0;
   if(change===0)t.zero++;else{t.zero=0;t.positive++;}
   lastResult[x.button]={frame:x.frame,delta:change,lifeLost:x.lifeLost===true};
   events.push({root:x.root,rom:x.rom,actor:x.actor,frame:x.frame,button:x.button,change,lifeLost:x.lifeLost===true});
   if(events.length>240)events.shift();return true;
  }
  function biases(x={}){
   if(!valid(x))return null;
   const key=[x.root,x.rom,x.actor].join('|');if(key!==session)init(x);
   const result={};
   for(const a of ACTIONS){
    const t=totals[a];
    // Repeat zero-change movements are de-prioritized, not prohibited.
    // Life-loss is a separate strong negative signal, only if explicitly observed.
    result[a]=Math.max(-4,Math.min(2,t.positive*.25-t.zero*.75-t.loss*2));
    if(t.zero>=stalledLimit)result[a]=Math.min(result[a],-2);
   }
   return result;
  }
  function snapshot(){return {schema:SCHEMA,session,lastFrame,seen,losses,
   totals:Object.fromEntries(ACTIONS.map(a=>[a,{...(totals[a]||{trials:0,zero:0,loss:0,positive:0})}])),
   events:events.slice(),gameObjectiveVerified:false};}
  return {feedback,biases,snapshot};
 }
 function mount(){window.JANE_AV191_GOALS=create();}
 return {SCHEMA,ACTIONS,create,mount};
});
