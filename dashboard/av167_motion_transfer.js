/* AV-167 Cross-ROM Motion Model Transfer.
 * A transfer candidate is fixed BEFORE the test game's future observation.
 * Source corpus: completed scored AV-165 forecasts from OTHER ROMs only,
 * latest comparable observation per distinct gameplay root.
 * Same-run agents and duplicate events never count as independent evidence.
 * Unknown ROM / unverified scene cannot claim transfer.
 * Selected-model and baseline errors are scored against the SAME later region.
 * Observation only; no controller writes, rewards or automatic promotion.
 */
(function(g){'use strict';const cp=x=>JSON.parse(JSON.stringify(x)),MODELS=['CONTINUE','HOLD','REVERSE'],MAX=256;
function validForecast(f){return f?.id&&f.root&&f.rom&&Number.isSafeInteger(f.issuedFrame)&&f.candidates&&MODELS.every(k=>f.candidates[k]===null||Number.isInteger(f.candidates[k])&&f.candidates[k]>=0&&f.candidates[k]<24)}
function validScore(c){return c?.id&&c.root&&c.rom&&Number.isSafeInteger(c.observedFrame)&&c.outcome==='SCORED'&&c.errors&&Number.isInteger(c.errors.CONTINUE)}
function create(seed=[]){const history=[],ids=new Set();for(const x of Array.isArray(seed)?seed:[]){if(x?.id&&x.root&&x.rom&&x.outcome==='SCORED'&&!ids.has(x.id)){history.push(cp(x));ids.add(x.id)}}
let pending=null,latest=null;
function corpus(rom,excludeRoot){const roots=new Map();for(const e of history){if(e.root===excludeRoot||e.rom===rom||!e.rom||e.outcome!=='SCORED'||!Number.isInteger(e.errors?.CONTINUE))continue;const prior=roots.get(e.root);if(!prior||e.observedFrame>prior.observedFrame)roots.set(e.root,e)}
const samples=[...roots.values()],roms=new Set(samples.map(s=>s.rom)),model={};for(const k of MODELS){const rows=samples.filter(r=>Number.isInteger(r.errors[k]));model[k]={roots:rows.length,meanError:rows.length?rows.reduce((sum,r)=>sum+r.errors[k],0)/rows.length:null}}return {roots:roots.size,sourceROMs:[...roms].sort(),model}}
function choose(f){const source=corpus(f.rom,f.root),baseline=source.model.CONTINUE;let selected='CONTINUE',status='INSUFFICIENT',reason='Require >=3 distinct source roots from another ROM';
if(f.candidates.CONTINUE===null){selected='NONE';status='UNSUPPORTED';reason='Continuation baseline not available'}
else if(source.roots>=3&&baseline.roots>=3){status='BASELINE';reason='No demonstrated cross-ROM improvement';
const eligible=MODELS.filter(k=>f.candidates[k]!==null&&source.model[k].roots>=3).sort((a,b)=>source.model[a].meanError-source.model[b].meanError||MODELS.indexOf(a)-MODELS.indexOf(b));
const best=eligible[0];if(best&&best!=='CONTINUE'&&baseline.meanError-source.model[best].meanError>=.25){selected=best;status='TRANSFER_TEST';reason='Source-ROM advantage >=0.25 grid units; candidate frozen for target-ROM test'}}
return {selected,status,reason,sourceRoots:source.roots,sourceROMs:source.sourceROMs,sourceCalibration:source.model}}
function ingest(packet){if(!packet||typeof packet!=='object')return null;let result=null;
const complete=packet.completed;if(validScore(complete)&&!ids.has(complete.id)){const matches=pending&&pending.id===complete.id&&pending.root===complete.root&&pending.rom===complete.rom;
const decision=matches?pending:null;const selected=decision?.selected??'CONTINUE',selectedError=Number.isInteger(complete.errors[selected])?complete.errors[selected]:null,baselineError=complete.errors.CONTINUE;
const row={id:complete.id,root:complete.root,rom:complete.rom,issuedFrame:complete.issuedFrame,observedFrame:complete.observedFrame,source:complete.source,sourceObservation:complete.sourceObservation,sourceROMs:decision?.sourceROMs??[],sourceRoots:decision?.sourceRoots??0,selectedRegion:complete.candidates?.[selected]??null,baselineRegion:complete.candidates?.CONTINUE??null,observedRegion:complete.observedRegion??null,selectionStatus:decision?.status??'NO_FROZEN_TEST',selected,baselineError,selectedError,improvement:selectedError===null?null:baselineError-selectedError,errors:cp(complete.errors),outcome:'SCORED',eligibleTransfer:!!decision&&decision.status==='TRANSFER_TEST',identity:'UNVERIFIED',scene:'UNKNOWN',reward:false,controllerAuthority:false};
history.push(row);ids.add(row.id);if(history.length>MAX)ids.delete(history.shift().id);result=row;if(matches)pending=null}
if(packet.completed&&pending&&packet.completed.id===pending.id)pending=null;
const forecast=packet.forecast;
if(validForecast(forecast)&&(!pending||pending.id!==forecast.id)){const pick=choose(forecast);pending={id:forecast.id,root:forecast.root,rom:forecast.rom,issuedFrame:forecast.issuedFrame,source:forecast.source,selected:pick.selected,expectedRegion:forecast.candidates[pick.selected]??null,status:pick.status,sourceROMs:pick.sourceROMs,sourceRoots:pick.sourceRoots,reason:pick.reason,scene:'UNKNOWN',sourceAncestry:'distinct gameplay roots; separate cartridge contexts'};}
latest=result||latest;return cp({completed:result,forecast:pending})}
function judge(targetROM){const roots=new Map();for(const r of history){if(r.rom!==targetROM||!r.eligibleTransfer||r.improvement===null)continue;const old=roots.get(r.root);if(!old||r.observedFrame>old.observedFrame)roots.set(r.root,r)}
const rows=[...roots.values()],n=rows.length,gain=n?rows.reduce((a,r)=>a+r.improvement,0)/n:null,losses=rows.filter(r=>r.improvement<0).length,wins=rows.filter(r=>r.improvement>0).length;
return cp({targetROM,roots:n,wins,losses,meanImprovement:gain,status:n<3?'INSUFFICIENT':losses===0&&wins>=2&&gain>=.25?'SUPPORTED':'NOT_SUPPORTED',automaticPromotion:false,reason:n<3?'Three distinct target-ROM gameplay roots required':'Prospective target-ROM comparison; never an identity or controller claim'})}
return {ingest,corpus,judge,state:()=>cp({history,latest,pending})}}
g.JaneMotionTransfer={create};})(typeof window==='undefined'?globalThis:window);