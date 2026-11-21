/* AV-166 — Motion Model Generalization.
 * Judge FROZEN AV-165 selections on unseen gameplay roots. Never select after outcome.
 * Two buckets: familiar/unseen motion-direction signatures. No scene semantics inferred.
 * Root-wise latest eligible paired trial (selected vs CONTINUE under same observation).
 * No auto promotion or controller write. Same emulator run is one evidence ancestry.
 */
(function(g){'use strict';const cp=x=>JSON.parse(JSON.stringify(x)),CAP=256,MODELS=['CONTINUE','HOLD','REVERSE'];
const direction=x=>x?.velocity&&Number.isInteger(x.velocity.dx)&&Number.isInteger(x.velocity.dy)?x.velocity.dx+','+x.velocity.dy:null;
const valid=x=>x?.id&&x.root&&Number.isSafeInteger(x.issuedFrame)&&Number.isSafeInteger(x.observedFrame)&&x.observedFrame>x.issuedFrame&&x.outcome==='SCORED'&&MODELS.includes(x.selected)&&x.errors&&MODELS.every(k=>x.errors[k]===null||Number.isInteger(x.errors[k])&&x.errors[k]>=0)&&Number.isInteger(x.errors.CONTINUE)&&Number.isInteger(x.errors[x.selected]);
function create(seed=[]){const history=[],seen=new Set();for(const x of Array.isArray(seed)?seed:[]){if(x?.id&&x.root&&Number.isSafeInteger(x.observedFrame)&&!seen.has(x.id)){history.push(cp(x));seen.add(x.id)}}
function observe(t){if(!valid(t)||seen.has(t.id))return null;const signature=direction(t);
const prior=new Set(history.filter(x=>x.root!==t.root&&x.signature!==null).map(x=>x.signature));
const novelty=signature===null?'UNCLASSIFIED':prior.has(signature)?'FAMILIAR_MOTION':'UNSEEN_MOTION';
const baseline=t.errors.CONTINUE,chosen=t.errors[t.selected],improvement=baseline-chosen;
const row={id:t.id,root:t.root,issuedFrame:t.issuedFrame,observedFrame:t.observedFrame,source:t.source,sourceObservation:t.sourceObservation,signature,novelty,selected:t.selected,selectedRegion:t.candidates?.[t.selected]??null,baselineRegion:t.candidates?.CONTINUE??null,observedRegion:t.observedRegion??null,selectionRoots:t.selectionRoots,baselineError:baseline,selectedError:chosen,improvement,beatsBaseline:improvement>0,losesBaseline:improvement<0,sourceLineage:'single emulator root; distinct agents do not add roots',sceneIdentity:'UNKNOWN',reward:false,automaticPromotion:false};
history.push(row);seen.add(row.id);return cp(row)}
function judge(scope='ALL',excludeRoot=null){const relevant=history.filter(x=>x.root!==excludeRoot&&(scope==='ALL'||x.novelty===scope)),roots=new Map();for(const e of relevant){const previous=roots.get(e.root);if(!previous||e.observedFrame>previous.observedFrame)roots.set(e.root,e)}
const rows=[...roots.values()],n=rows.length,wins=rows.filter(x=>x.improvement>0).length,losses=rows.filter(x=>x.improvement<0).length,delta=n?rows.reduce((s,x)=>s+x.improvement,0)/n:null;
const eligible=n>=3&&wins>=2&&losses===0&&delta>=.25&&rows.some(x=>x.selected!=='CONTINUE');
return cp({scope,roots:n,wins,losses,meanImprovement:delta,hitRate:n?rows.filter(x=>x.selectedError===0).length/n:null,baselineHitRate:n?rows.filter(x=>x.baselineError===0).length/n:null,status:n<3?'INSUFFICIENT':eligible?'SUPPORTED':'NOT_SUPPORTED',automaticPromotion:false,reason:n<3?'Requires >=3 distinct scored gameplay roots':eligible?'Paired selected-model advantage with zero root-wise losses; observational evidence only':'Generalization criterion not met; preserve original model'})}
return {observe,judge,state:()=>cp({history,latest:history.at(-1)||null,summary:judge(),unseen:judge('UNSEEN_MOTION')})}}
g.JaneMotionGeneralization={create};})(typeof window==='undefined'?globalThis:window);