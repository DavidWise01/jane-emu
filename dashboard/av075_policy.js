/* AV-075 — deterministic, evidence-only experiment selector.
   Shared by the live dashboard and its Node test suite.
   Does not operate emulator inputs or award game rewards.
*/
(function(root, factory){
  const policy = factory();
  if(typeof module==='object' && module.exports) module.exports=policy;
  root.JaneAV075=policy;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const BUTTONS=['START','A','B','UP','DOWN','LEFT','RIGHT','SELECT'];
  const MISSING=3;
  const safe = x => typeof x==='string' && x.length>0 && x.length<=128;
  function choose(input){
    const x=input||{}, assoc=Array.isArray(x.associations)?x.associations:[],
      rom=safe(x.rom)?x.rom:'', ctx=safe(x.context)?x.context:'',
      word=safe(x.word)?x.word.toUpperCase().replace(/\s+/g,'_'):'',
      reading=Boolean(x.confirmed);
    if(!rom)return {state:'ABSTAIN',reason:'Load a cartridge to establish a ROM fingerprint.',candidates:[]};
    if(!ctx)return {state:'OBSERVE',reason:'No exact live pre-action screen fingerprint. Observe and record the screen before experimenting.',candidates:[]};
    if(!reading||!word||word==='UNKNOWN'||word.includes('?')){
      return {state:'READ',reason:'Current word has not been freshly confirmed. Locate/teach its glyphs before learning what a button means.',candidates:[]};
    }
    if(!Array.isArray(x.associations)){
      return {state:'ABSTAIN',reason:'Git evidence index is unavailable. No historical comparison is possible.',candidates:[]};
    }
    const candidates=BUTTONS.map(button=>{
      const rows=assoc.filter(a=>a.rom===rom&&a.context_bound===true&&a.context===ctx&&a.word===word&&a.button===button);
      // Pool index already deduplicates starting-state roots. Never sum unrelated index rows as independent evidence.
      const beneficial=Math.max(0,...rows.map(a=>Number(a.beneficial_roots)||0)),
        harmful=Math.max(0,...rows.map(a=>Number(a.harmful_or_conflicting_roots)||0)),
        other=Math.max(0,...rows.map(a=>Number(a.other_roots)||0)),
        missing=Math.max(0,MISSING-beneficial),
        supported=rows.some(a=>a.status==='SUPPORTED_PROVISIONAL') && beneficial>=MISSING && harmful===0;
      const reason=harmful?'contested or harmful evidence; block':supported?'already provisionally supported':missing+' independent beneficial roots still missing';
      return {button,beneficial,harmful,other,missing,reason,
        state:harmful?'BLOCK':supported?'SUPPORTED':'UNTESTED',
        score:harmful?-999:supported?-100:missing*10-other};
    });
    const eligible=candidates.filter(c=>c.state==='UNTESTED').sort((a,b)=>b.score-a.score||BUTTONS.indexOf(a.button)-BUTTONS.indexOf(b.button));
    const best=eligible[0]||null;
    const allBlocked=candidates.every(c=>c.state!=='UNTESTED');
    return {state:best?'PROPOSE':allBlocked?'ABSTAIN':'OBSERVE',
      reason:best?'Evidence gap: '+best.reason+'. Requires a new independent starting state and an explicit human outcome label; no automatic button is sent.':'No eligible experiment; preserve contested lessons without reuse.',
      word,rom,context:ctx,candidates,selected:best?best.button:null};
  }
  return Object.freeze({choose,BUTTONS:Object.freeze([...BUTTONS]),version:'AV-075'});
});