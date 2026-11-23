/* AV-215 — Validate actual completed NES input effects against homebrew RAM.
 * Read-only. Does not press buttons, mutate RAM, change gameplay policy,
 * or turn a controller offer into proof of hardware delivery.
 */
(function(root,factory){'use strict';
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV215=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const SCHEMA='jane.av215.completed-input-effects.v1';
 const KEYS=['RIGHT','LEFT','UP','DOWN','A','B','START'];
 const valid=p=>p&&p.root&&p.rom&&['JANE','TOPH','PATRICIA'].includes(p.actor)&&
  Number.isSafeInteger(p.startFrame)&&Number.isSafeInteger(p.endFrame)&&
  p.startFrame>=0&&p.endFrame>p.startFrame&&KEYS.includes(p.button);
 const byte=v=>Number.isInteger(v)&&v>=0&&v<=255;
 function create(){
  let rows=[],ids=new Set();
  function observe(p){
   if(!valid(p)||p.source!=='nes-completed-trial'||!p.id)return false;
   const id=[p.root,p.rom,p.actor,p.id].join('|');
   if(ids.has(id))return false;
   if(![p.before,p.after].every(x=>x&&[x.x,x.y,x.palette,x.mode].every(byte)))return false;
   const a=p.before,b=p.after,button=p.button;
   // A/B select exact NES palette byte, direction uses signed change.
   const changed=button==='RIGHT'?b.x>a.x:button==='LEFT'?b.x<a.x:
    button==='UP'?b.y<a.y:button==='DOWN'?b.y>a.y:
    button==='A'?a.palette!==0x16&&b.palette===0x16:
    button==='B'?a.palette!==0x2a&&b.palette===0x2a:
    a.mode!==1&&b.mode===1;
   const kind=a.mode!==1&&button!=='START'?'OUTSIDE_PLAY':
    changed?'NES_EFFECT_OBSERVED':'COMPLETED_WITHOUT_EXPECTED_EFFECT';
   ids.add(id);rows.push({id,root:p.root,rom:p.rom,actor:p.actor,
    button,startFrame:p.startFrame,endFrame:p.endFrame,
    before:{...a},after:{...b},kind,changed});
   if(rows.length>160){const old=rows.shift();ids.delete(old.id);}
   return {kind,changed};
  }
  return {observe,snapshot:()=>({schema:SCHEMA,rows:rows.map(x=>({...x})),
    note:'One emulator ancestry; completed action and RAM correlation is not causal proof of input delivery.'})};
 }
 return {SCHEMA,create};
});
