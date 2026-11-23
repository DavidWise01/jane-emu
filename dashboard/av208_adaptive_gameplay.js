/* AV-208 · bounded adaptive controller for the original NES homebrew.
 * Completion is inferred only from same-session before/after RAM observations.
 * Outputs an action proposal; original JSNES controller remains authoritative.
 */
(function(root,factory){'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV208=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const SCHEMA='jane.av208.adaptive-real-nes-controller.v1';
 const GOALS=[{button:'RIGHT',target:136},{button:'A',target:0x16},
  {button:'LEFT',target:104},{button:'B',target:0x2a}];
 const valid=x=>x&&x.root&&x.rom&&['JANE','TOPH','PATRICIA'].includes(x.actor)&&
   Number.isSafeInteger(x.frame)&&x.frame>=0&&x.mode===1&&
   Number.isInteger(x.x)&&x.x>=0&&x.x<=255&&
   Number.isInteger(x.palette)&&x.palette>=0&&x.palette<=255;
 const ident=x=>[x.root,x.rom,x.actor].join('|');
 const reached=(i,x)=>i===0?x.x>=136:i===1?x.palette===0x16:i===2?x.x<=104:x.palette===0x2a;
 function create(){
  let key=null,lastFrame=-1,phase=0,laps=0,pending=null,history=[];
  let holds=Object.fromEntries(GOALS.map(g=>[g.button,8]));
  let successes=Object.fromEntries(GOALS.map(g=>[g.button,0]));
  let failures=Object.fromEntries(GOALS.map(g=>[g.button,0]));
  const push=e=>{history.push({...e});if(history.length>120)history.shift()};
  const reset=x=>{key=ident(x);lastFrame=-1;phase=0;laps=0;pending=null;
    holds=Object.fromEntries(GOALS.map(g=>[g.button,8]));
    successes=Object.fromEntries(GOALS.map(g=>[g.button,0]));
    failures=Object.fromEntries(GOALS.map(g=>[g.button,0]));history=[];};
  const snapshot=()=>({schema:SCHEMA,identity:key,phase,laps,pending:pending?{...pending}:null,
   holds:{...holds},successes:{...successes},failures:{...failures},history:history.map(x=>({...x}))});
  function offer(x){
   if(!valid(x)||!Array.isArray(x.actions))return null;
   if(key!==ident(x)||x.frame<lastFrame)reset(x);
   lastFrame=x.frame;
   // A real observed cartridge state, not a button offer, advances the goal.
   if(!pending)for(let n=0;n<4&&reached(phase,x);n++){
    phase=(phase+1)%4;if(phase===0)laps++;
   }
   if(pending)return null; // no competing commands before the prior action resolves
   const button=GOALS[phase].button;
   if(!x.actions.includes(button))return null;
   pending={button,hold:holds[button],phase,root:x.root,rom:x.rom,actor:x.actor,
    startFrame:x.frame,beforeX:x.x,beforePalette:x.palette};
   push({kind:'OFFER',button,hold:pending.hold,frame:x.frame,phase});
   return {button,hold:pending.hold};
  }
  function complete(x){
   if(!pending||!valid(x)||key!==ident(x)||x.button!==pending.button||
     x.frame<pending.startFrame)return false;
   const p=pending;pending=null;
   // Success means controller affected actual cartridge state, not just
   // pixels changing somewhere or a synthetic trial completion label.
   const changed=p.button==='RIGHT'?x.x>p.beforeX:p.button==='LEFT'?x.x<p.beforeX:
      p.button==='A'?x.palette===0x16&&p.beforePalette!==0x16:
      x.palette===0x2a&&p.beforePalette!==0x2a;
   if(changed){successes[p.button]++;holds[p.button]=Math.max(2,holds[p.button]-1);}
   else {failures[p.button]++;holds[p.button]=Math.min(24,holds[p.button]+3);}
   push({kind:'RESULT',button:p.button,frame:x.frame,changed,
    beforeX:p.beforeX,afterX:x.x,beforePalette:p.beforePalette,
    afterPalette:x.palette,hold:p.hold});
   // Progress only on measured goal achievement.
   if(reached(phase,x)){phase=(phase+1)%4;if(phase===0)laps++;}
   return changed;
  }
  function cancel(reason='mode-change'){if(pending){push({kind:'CANCEL',reason,button:pending.button});pending=null;}}
  return {offer,complete,cancel,snapshot};
 }
 return {SCHEMA,GOALS,create};
});
