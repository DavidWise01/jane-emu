/* AV-169 Transfer Recovery and Recalibration.
 * Start a recovery epoch ONLY when AV-168 first advises baseline, snapshotting
 * the triggering target roots. Those roots CANNOT be reused as recovery proof.
 * Thereafter, collect prospective paired transfer-vs-baseline outcomes from NEW
 * target gameplay roots. One latest observation per new root. Require >=3
 * distinct new roots, >=2 wins, zero losses, mean paired gain >=0.25.
 * Explicitly retain adverse tests and revoke a candidate on contradiction.
 * ADVISORY ONLY: no controller changes, no automatic promotion or reward.
 */
(function(g){'use strict';const cp=x=>JSON.parse(JSON.stringify(x)),MAX=256;
const valid=x=>x?.id&&x.root&&x.rom&&Number.isSafeInteger(x.observedFrame)&&x.observedFrame>=0&&x.eligibleTransfer===true&&Number.isInteger(x.baselineError)&&Number.isInteger(x.selectedError);
function create(seed=[]){const history=[],seen=new Set();for(const r of Array.isArray(seed)?seed:[]){if(r?.id&&r.root&&r.rom&&Number.isSafeInteger(r.frame)&&!seen.has(r.id)){history.push(cp(r));seen.add(r.id)}}const epochs=new Map();
function recoverState(rom){let epoch=null;for(const r of history.filter(x=>x.rom===rom)){if(r.kind==='EPOCH_START'){epoch={startId:r.id,startFrame:r.frame,excludedRoots:new Set(r.excludedRoots||[]),fresh:new Map()}}
else if(r.kind==='RECOVERY_TRIAL'&&epoch&&r.root&&!epoch.excludedRoots.has(r.root)){const prev=epoch.fresh.get(r.root);if(!prev||r.frame>prev.frame)epoch.fresh.set(r.root,r)}}return epoch}
function metrics(rom){const e=epochs.get(rom)||recoverState(rom);if(!e)return cp({rom,status:'MONITOR',roots:0,wins:0,losses:0,ties:0,meanGain:null,baselineAdvised:false,recoveryAdvised:false});
const rows=[...e.fresh.values()],n=rows.length,wins=rows.filter(x=>x.gain>0).length,losses=rows.filter(x=>x.gain<0).length,ties=rows.filter(x=>x.gain===0).length,meanGain=n?rows.reduce((a,x)=>a+x.gain,0)/n:null;
return cp({rom,status:n<3?'RECOVERING':wins>=2&&losses===0&&meanGain>=.25?'RECOVERY_CANDIDATE':'BASELINE_ADVISED',roots:n,wins,losses,ties,meanGain,startFrame:e.startFrame,excludedRoots:e.excludedRoots.size,baselineAdvised:true,recoveryAdvised:n>=3&&wins>=2&&losses===0&&meanGain>=.25,autoRestore:false})}
function observe(sample,gate){if(!sample?.id||!sample.root||!sample.rom||!Number.isSafeInteger(sample.observedFrame)||seen.has(sample.id))return null;
const rom=sample.rom;let epoch=epochs.get(rom)||recoverState(rom),record=null;
if(!epoch&&gate?.rom===rom&&gate.status==='BASELINE_ADVISED'){const excluded=new Set((gate.rootIds||[]).filter(Boolean));excluded.add(sample.root);epoch={startId:'RECOVERY:'+rom+':'+sample.id,startFrame:sample.observedFrame,excludedRoots:excluded,fresh:new Map()};epochs.set(rom,epoch);record={id:epoch.startId,kind:'EPOCH_START',rom,root:sample.root,frame:sample.observedFrame,excludedRoots:[...excluded],policy:'baseline advisory triggered; all prior roots excluded from recovery cohort',reward:false,controllerOverride:false};history.push(cp(record))}
else if(epoch&&valid(sample)&&!epoch.excludedRoots.has(sample.root)&&sample.observedFrame>epoch.startFrame){const gain=sample.baselineError-sample.selectedError;record={id:sample.id,kind:'RECOVERY_TRIAL',rom,root:sample.root,frame:sample.observedFrame,gain,baselineError:sample.baselineError,selectedError:sample.selectedError,classification:sample.classification,motionSignature:sample.motionSignature??null,sourceObservation:sample.sourceObservation||null,reward:false,controllerOverride:false};history.push(cp(record));const prev=epoch.fresh.get(sample.root);if(!prev||record.frame>prev.frame)epoch.fresh.set(sample.root,record)}
seen.add(sample.id);if(history.length>MAX)history.splice(0,history.length-MAX);
return record?cp({record,metrics:metrics(rom)}):null}
function state(){return cp({history,latest:history.at(-1)||null})}
return {observe,metrics,state}}
g.JaneTransferRecovery={create};})(typeof window==='undefined'?globalThis:window);