/* AV-211 — provenance-preserving controller timing exchange.
 * Evidence from Jane/Toph/Patricia comes from ONE emulated cartridge ancestry.
 * Separate action events are not independent witnesses.
 */
(function(root,factory){'use strict';
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV211=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const SCHEMA='jane.av211.action-evidence-exchange.v1';
 const BUTTONS=['RIGHT','LEFT','A','B'],ACTORS=['JANE','TOPH','PATRICIA'];
 const valid=e=>e&&typeof e.root==='string'&&e.root.length>0&&
  typeof e.rom==='string'&&e.rom.length>0&&ACTORS.includes(e.actor)&&
  BUTTONS.includes(e.button)&&Number.isSafeInteger(e.frame)&&e.frame>=0&&
  Number.isSafeInteger(e.hold)&&e.hold>=2&&e.hold<=24&&
  typeof e.id==='string'&&e.id.length>0;
 function create(){
  let records=[],seen=new Set(),events=[];
  const put=e=>{events.push(e);if(events.length>100)events.shift();};
  function observe(e){
   if(!valid(e)||e.source!=='nes-completed-action'||e.changed!==true||
       e.goalReached!==true||e.probe!==false)return false;
   const id=[e.root,e.rom,e.actor,e.id].join('|');
   if(seen.has(id))return false;
   seen.add(id);
   records.push({id,root:e.root,rom:e.rom,actor:e.actor,button:e.button,
    frame:e.frame,hold:e.hold});
   if(records.length>240){const old=records.shift();seen.delete(old.id);}
   put({kind:'ELIGIBLE_ACTION',id,actor:e.actor,button:e.button,frame:e.frame});
   return true;
  }
  function advice(c){
   if(!c||!c.root||!c.rom||!ACTORS.includes(c.actor))return {};
   const result={};
   for(const button of BUTTONS){
    const items=records.filter(e=>e.root===c.root&&e.rom===c.rom&&
      e.actor!==c.actor&&e.button===button);
    // Two distinct completed actions needed, but never call them witnesses.
    if(items.length<2)continue;
    const xs=items.map(e=>e.hold).sort((a,b)=>a-b);
    const median=xs[Math.floor((xs.length-1)/2)];
    result[button]=Math.max(6,Math.min(10,median));
   }
   return result;
  }
  function snapshot(){return {schema:SCHEMA,records:records.map(e=>({...e})),
    events:events.map(e=>({...e})),
    singleAncestry:true,independentWitnessesClaimed:0,
    note:'Advice is derived from completed actions in a single emulator lineage; no cross-game or cross-root transfer.'};}
  return {observe,advice,snapshot};
 }
 return {SCHEMA,create};
});
