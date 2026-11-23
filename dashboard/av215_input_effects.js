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
  let rows=[],ids=new Set(),episodes=[],active=null,boundaries=[];
  // AV-227: first actual hardware effects for each player/control survive
  // eviction from the 160-row live diagnostics ring. This is not a replay
  // or an inferred action; each entry remains the original completed row.
  let proofRows=[],proofKeys=new Set(),proofRoots=[];
  const copy=x=>({...x});
  function boundary(p){
    if(!p||!p.root||!p.rom||!Number.isSafeInteger(p.frame)||p.frame<0||
       ![0,1,2].includes(p.mode))return false;
    // Only explicit observed cartridge title or game-over can split
    // a run. UI labels, timer guesses and synthetic defeats do not.
    if(p.mode===1)return false;
    const key=[p.root,p.rom,p.actor].join('|');
    if(!active||active.key!==key)return false;
    const last=boundaries.at(-1);
    if(last?.key===key&&last?.mode===p.mode&&last.frame===p.frame)return false;
    boundaries.push({key,frame:p.frame,mode:p.mode,kind:'CARTRIDGE_MODE_BOUNDARY'});
    if(boundaries.length>80)boundaries.shift();
    active=null;return true;
  }
  function observe(p){
   if(!valid(p)||p.source!=='nes-completed-trial'||!p.id)return false;
   // The embedded NES may restart its trial counter. A completed action
   // is identified by its actual cartridge frame span, not trial ID alone.
   const id=[p.root,p.rom,p.actor,p.id,p.startFrame,p.endFrame].join('|');
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
   const row={id,root:p.root,rom:p.rom,actor:p.actor,
    button,startFrame:p.startFrame,endFrame:p.endFrame,
    before:{...a},after:{...b},kind,changed};
   ids.add(id);rows.push(row);
   if(rows.length>160){const old=rows.shift();ids.delete(old.id);}
   // Preserve one *first* source-linked effect of each exact button under
   // each player in the same cartridge run. Never promote an offered,
   // unmeasured or non-playing action to durable proof.
   if(kind==='NES_EFFECT_OBSERVED'&&changed&&a.mode===1&&b.mode===1){
     const rootKey=[p.root,p.rom].join('|');
     const proofKey=[rootKey,p.actor,button].join('|');
     if(!proofKeys.has(proofKey)){
       if(!proofRoots.includes(rootKey))proofRoots.push(rootKey);
       proofKeys.add(proofKey);
       proofRows.push(row);
       // Keep 8 cartridge runs, at most 3 actors × 7 buttons per run.
       while(proofRoots.length>8){
         const evicted=proofRoots.shift();
         proofRows=proofRows.filter(x=>[x.root,x.rom].join('|')!==evicted);
         proofKeys=new Set(proofRows.map(x=>
           [x.root,x.rom,x.actor,x.button].join('|')));
       }
     }
   }
   // AV-216: retain separate, contiguous per-owner evidence episodes.
   // No episode earns continuity until both movement and palette changes
   // were observed on completed original NES actions.
   const key=[p.root,p.rom,p.actor].join('|');
   // A delayed completed action must not stitch two separate lives together.
   // 90 NES frames is a generous upper bound on a same-episode action gap.
   if(!active||active.key!==key||p.startFrame<active.endFrame||
      p.startFrame-active.endFrame>90||a.mode!==1||b.mode!==1){
     active={key,actor:p.actor,root:p.root,rom:p.rom,
       firstFrame:p.startFrame,endFrame:p.endFrame,actions:0,
       movements:0,colors:0,hasMovement:false,hasColor:false,qualified:false};
     episodes.push(active);
     if(episodes.length>40)episodes.shift();
   }
   active.endFrame=p.endFrame;active.actions++;
   if(kind==='NES_EFFECT_OBSERVED'&&['RIGHT','LEFT','UP','DOWN'].includes(button)){
     active.movements++;active.hasMovement=true;
   }
   if(kind==='NES_EFFECT_OBSERVED'&&['A','B'].includes(button)){
     active.colors++;active.hasColor=true;
   }
   active.qualified=active.hasMovement&&active.hasColor&&
     active.movements>=2&&active.colors>=2&&active.actions>=4;
   return {kind,changed};
  }
  return {observe,boundary,snapshot:()=>({schema:SCHEMA,rows:rows.map(copy),
    proofRows:proofRows.map(x=>({...x,before:{...x.before},after:{...x.after}})),
    proofRootCount:proofRoots.length,
    episodes:episodes.map(copy),boundaries:boundaries.map(copy),
    qualifiedEpisodes:episodes.filter(x=>x.qualified).length,
    note:'One emulator ancestry. Contiguous completed-action effects are not causal proof of controller delivery or a gameplay win.'})};
 }
 return {SCHEMA,create};
});
