/* AV-168 — Transfer Failure Diagnosis.
 * Read-only analysis of completed AV-167 transfer trials and source provenance.
 * Causes are observable patterns, not asserted causal game mechanics.
 * Three distinct target-game roots with adverse paired outcomes trigger advisory
 * BASELINE; never changes the actual NES controller or AV-167 forecast.
 * Immutable, deduplicated evidence; same run has one root regardless of agent role.
 */
(function(g){'use strict';const cp=x=>JSON.parse(JSON.stringify(x)),MAX=256;
const valid=x=>x?.id&&x.root&&x.rom&&Number.isSafeInteger(x.issuedFrame)&&Number.isSafeInteger(x.observedFrame)&&x.observedFrame>x.issuedFrame&&x.outcome==='SCORED'&&Number.isInteger(x.baselineError)&&x.baselineError>=0&&Number.isInteger(x.selectedError)&&x.selectedError>=0;
function create(seed=[]){const history=[],ids=new Set();for(const e of Array.isArray(seed)?seed:[]){if(e?.id&&e.root&&e.rom&&Number.isSafeInteger(e.observedFrame)&&!ids.has(e.id)){history.push(cp(e));ids.add(e.id)}}
function diagnose(x){if(!valid(x)||ids.has(x.id))return null;
const change=x.selectedError-x.baselineError,eligible=x.eligibleTransfer===true,alternativeErrors=x.errors||{};
let classification='NO_TRANSFER',reason='No selected cross-ROM transfer to diagnose';
if(eligible){if(change>0){const hold=Number.isInteger(alternativeErrors.HOLD)?alternativeErrors.HOLD:null,rev=Number.isInteger(alternativeErrors.REVERSE)?alternativeErrors.REVERSE:null;classification=hold!==null&&hold<x.selectedError?'HOLD_ALTERNATIVE':rev!==null&&rev<x.selectedError?'REVERSAL_ALTERNATIVE':'MOTION_MISMATCH';reason='Transferred regional forecast worse than paired baseline; alternatives describe errors, not causes'}
else if(change===0){classification='TIE';reason='No measured advantage over continuation baseline'}
else {classification='IMPROVED';reason='Observed target-region error below paired continuation baseline'}}
const row={id:x.id,root:x.root,rom:x.rom,issuedFrame:x.issuedFrame,observedFrame:x.observedFrame,selected:x.selected,sourceROMs:Array.isArray(x.sourceROMs)?x.sourceROMs.slice():[],sourceRoots:x.sourceRoots??0,baselineError:x.baselineError,selectedError:x.selectedError,selectedRegion:x.selectedRegion??null,baselineRegion:x.baselineRegion??null,observedRegion:x.observedRegion??null,fallbackApplied:false,delta:change,eligibleTransfer:eligible,classification,reason,sourceObservation:x.sourceObservation||null,sceneIdentity:'UNKNOWN',mechanisticCause:'UNVERIFIED',fallbackApplied:false,reward:false,controllerAuthority:false};
history.push(row);ids.add(row.id);return cp(row)}
function gate(rom,excludeRoot=null){const latest=new Map();for(const x of history){if(x.rom!==rom||x.root===excludeRoot||!x.eligibleTransfer)continue;const prior=latest.get(x.root);if(!prior||x.observedFrame>prior.observedFrame)latest.set(x.root,x)}
const rows=[...latest.values()],rootIds=[...latest.keys()],n=rows.length,failures=rows.filter(x=>x.delta>0).length,wins=rows.filter(x=>x.delta<0).length,ties=rows.filter(x=>x.delta===0).length,meanDelta=n?rows.reduce((a,x)=>a+x.delta,0)/n:null;
const unsafe=n>=3&&(failures>=2||meanDelta>=.25);
return cp({rom,rootIds,roots:n,failures,wins,ties,meanDelta,status:n<3?'UNCALIBRATED':unsafe?'BASELINE_ADVISED':'MONITOR',reason:n<3?'Need three distinct target gameplay roots':unsafe?'Evidence contradicts transfer; use continuation baseline for future model selection':'Insufficient contrary evidence; do not assert transfer improvement',advisoryOnly:true,controllerOverride:false})}
return {diagnose,gate,state:()=>cp({history,latest:history.at(-1)||null})}}
g.JaneTransferDiagnosis={create};})(typeof window==='undefined'?globalThis:window);