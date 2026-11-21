/* AV-170 Recovery Stability and Hysteresis — read-only advisory.
 * Consume AV-169 EPOCH_START + immutable RECOVERY_TRIAL records, never agent votes.
 * A candidate needs >=3 fresh gameplay roots, >=2 wins, zero losses, mean gain >= .25.
 * Require a FOURTH distinct fresh root with positive gain to affirm candidate.
 * After affirmation, one adverse NEW root -> WATCH, two -> BASELINE_ADVISED.
 * After revocation, previously seen roots cannot re-arm: start a fresh epoch.
 * No NES controller changes, promotion or reward writes.
 */
(function(g){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),MAX=512;
function valid(r){return r?.id&&r.rom&&r.root&&Number.isSafeInteger(r.frame)&&r.frame>=0&&(r.kind==='EPOCH_START'&&Array.isArray(r.excludedRoots)||r.kind==='RECOVERY_TRIAL'&&Number.isFinite(r.gain))}
function create(seed=[]){const journal=[],ids=new Set();for(const x of Array.isArray(seed)?seed:[]){if(valid(x)&&!ids.has(x.id)){journal.push(cp(x));ids.add(x.id)}}function ingest(r){if(!valid(r)||ids.has(r.id))return null;const e=cp(r);journal.push(e);ids.add(e.id);return {event:e,assessment:assess(e.rom)}}
function assess(rom){const rows=journal.filter(x=>x.rom===rom);let current=null,history=[];for(const r of rows){
 if(r.kind==='EPOCH_START'){current={start:r.frame,excluded:new Set(r.excludedRoots),seen:new Map(),phase:'BASELINE',confirmedAt:null,adverse:new Set(),activationRoots:new Set()};history.push({frame:r.frame,phase:'BASELINE',reason:'Explicit root-exclusion epoch'})}
 else if(current&&r.kind==='RECOVERY_TRIAL'&&!current.excluded.has(r.root)&&r.frame>current.start){
  const prior=current.seen.get(r.root);if(prior&&r.frame<=prior.frame)continue;
  // One root is one vote. Freeze already counted roots at state transitions.
  if(prior)continue;
  current.seen.set(r.root,r);
  const records=[...current.seen.values()],wins=records.filter(x=>x.gain>0).length,losses=records.filter(x=>x.gain<0).length;
  const meanGain=records.reduce((s,x)=>s+x.gain,0)/records.length;
  if(current.phase==='BASELINE'&&records.length>=3&&wins>=2&&losses===0&&meanGain>=.25){current.phase='CANDIDATE';current.activationRoots=new Set(current.seen.keys());history.push({frame:r.frame,phase:'CANDIDATE',reason:'Three fresh roots meet recovery criteria'})}
  else if(current.phase==='CANDIDATE'&&!current.activationRoots.has(r.root)){
   if(r.gain>0){current.phase='STABLE_ADVISORY';current.confirmedAt=r.frame;history.push({frame:r.frame,phase:'STABLE_ADVISORY',reason:'Fourth independent root confirms prospectively'})}
   else {current.phase='BASELINE_ADVISED';history.push({frame:r.frame,phase:'BASELINE_ADVISED',reason:'Prospective contradiction before confirmation'})}
  }
  else if((current.phase==='STABLE_ADVISORY'||current.phase==='WATCH')&&current.confirmedAt!==null&&r.frame>current.confirmedAt){
   if(r.gain<0)current.adverse.add(r.root);
   if(current.adverse.size>=2){current.phase='BASELINE_ADVISED';history.push({frame:r.frame,phase:'BASELINE_ADVISED',reason:'Two independent post-confirmation regressions'})}
   else if(current.adverse.size===1){current.phase='WATCH';history.push({frame:r.frame,phase:'WATCH',reason:'One new regression requires monitoring'})}
  }
 }
}
if(!current)return cp({rom,phase:'NO_EPOCH',roots:0,adverseRoots:0,confirmation:false,transitions:[],advisoryOnly:true});
return cp({rom,phase:current.phase,roots:current.seen.size,adverseRoots:current.adverse.size,confirmation:current.confirmedAt!==null,transitions:history,advisoryOnly:true,autoPromotion:false,controllerAuthority:false,reason:history.at(-1)?.reason||'No new evidence'})}
return {ingest,assess,state:()=>cp({journal,latest:journal.at(-1)||null})}}
g.JaneRecoveryStability={create};})(typeof window==='undefined'?globalThis:window);