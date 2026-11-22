/* AV-190 · Deterministic NES gameplay mechanics.
 * Directly supplies eligible button actions through the EXISTING chooseAction()
 * controller. Uses emulator-completed trial deltas for bounded adaptation.
 * No second player, no added dashboard panel, no changes to NES core.
 */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV190=api;
 if(typeof document!=='undefined'){
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});
   else api.mount();
 }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SCHEMA='jane.av190.gameplay-mechanics.v1';
 const ORDER=['RIGHT','LEFT','UP','DOWN','A','B'];
 const ACTORS=['JANE','TOPH','PATRICIA'];
 const MENU=/title|menu|intro|select|prefight|pre.fight|ready|matchup|between.round|waiting/;
 const PLAY=/playing|fight.active|combat|battle|level|gameplay|running/;
 function create(opts={}){
   let enabled=opts.enabled!==false,identity=null,ledger=Object.create(null),lastChoice=null,epoch=0,results=0;
   const interval=Number.isSafeInteger(opts.interval)?Math.max(6,opts.interval):18;
   const key=x=>String(x.root||'')+'|'+String(x.rom||'')+'|'+String(x.actor||'');
   function reset(x){identity=key(x);ledger=Object.create(null);
     for(const button of ORDER)ledger[button]={trials:0,total:0,offers:0,lastFrame:-1};
     lastChoice=null;epoch=0;results=0;}
   function eligible(x){
     return x&&x.root&&x.rom&&x.rom!=='unloaded'&&ACTORS.includes(x.actor)&&
       Number.isSafeInteger(x.frame)&&x.frame>=0&&Array.isArray(x.actions);
   }
   function offer(x={}){
     if(!enabled||!eligible(x))return null;
     if(identity!==key(x)||lastChoice&&x.frame<lastChoice.frame)reset(x);
     const stage=String(x.stage||'').toLowerCase();
     // Menu and game-over handling belong to original START/recovery logic.
     if(MENU.test(stage)&&!PLAY.test(stage)||/game.over|defeat|lost/.test(stage))return null;
     // Never steal control from an explicit existing strategy or experiment.
     const available=ORDER.filter(b=>x.actions.includes(b));
     if(!available.length)return null;
     const slot=Math.floor(x.frame/interval);
     if(lastChoice&&lastChoice.slot===slot)return lastChoice.button;
     const candidates=available.map((button,i)=>{
       const stats=ledger[button];
       // Reward visible changed regions; prioritize underserved actions.
       // Ranking is deterministic, with stable button order tie-break.
       const score=stats.trials===0?1:(stats.total/stats.trials);
       const explore=stats.offers===0?3:0;
       return {button,i,score:score+explore};
     });
     candidates.sort((a,b)=>b.score-a.score||a.i-b.i);
     const selected=candidates[0].button;
     ledger[selected].offers++;
     lastChoice={button:selected,frame:x.frame,slot,root:x.root,rom:x.rom,actor:x.actor};
     epoch++;
     return selected;
   }
   function result(x={}){
     if(!enabled||!eligible({...x,actions:[]})||key(x)!==identity||
       !ORDER.includes(x.button)||x.completed!==true)return false;
     const stat=ledger[x.button];
     if(!Number.isSafeInteger(x.frame)||x.frame<=stat.lastFrame)return false;
     // A simple measured-change signal; does not claim life progress or wins.
     const delta=Number.isFinite(x.delta)?Math.max(0,Math.min(32,x.delta)):0;
     stat.trials++;stat.total+=delta;stat.lastFrame=x.frame;
     results++;return true;
   }
   function snapshot(){return {schema:SCHEMA,enabled,identity,epoch,results,
      lastChoice:lastChoice?{...lastChoice}:null,
      actions:Object.fromEntries(ORDER.map(b=>[b,{...ledger[b]||{trials:0,total:0,offers:0,lastFrame:-1}}])),
      meaning:'Observed pixel/region change only; game objectives remain unverified'};}
   return {offer,result,snapshot,setEnabled:v=>{enabled=v===true;return enabled}};
 }
 function mount(){
   const policy=create();
   window.JANE_AV190_MECHANICS=policy;
   if(document.getElementById('av190-toggle'))return;
   const bar=document.querySelector('.toolbar');if(!bar)return;
   const label=document.createElement('label');label.id='av190-toggle';
   label.style.cssText='display:inline-flex;align-items:center;gap:4px;color:#ffb16b;font:700 11px ui-monospace,monospace';
   const input=document.createElement('input');input.type='checkbox';input.checked=true;
   input.addEventListener('change',()=>policy.setEnabled(input.checked));
   label.append(input,document.createTextNode('GAMEPLAY ACTIONS'));
   label.title='Deterministic movement and A/B actions when existing coaching has no action. Disable to retain original fallback.';
   bar.append(label);
 }
 return {SCHEMA,ORDER,create,mount};
});
