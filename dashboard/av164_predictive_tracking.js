/* AV-164 — Neural Predictive Tracking: calibrated regional motion forecasts.
 * Only completed prospective AV-163 trials, not forecasts or agent votes, are evidence.
 * Each gameplay root contributes its latest eligible result to calibration.
 * Direction-change classification is relative to the preceding scored local forecast;
 * it is diagnostic, not a claim of object identity or improved control performance.
 * No gameplay modification, no reward, no retroactive prediction selection.
 */
(function(g){'use strict';const clone=x=>JSON.parse(JSON.stringify(x)),CAP=256;
const scored=x=>x?.id&&x.root&&Number.isSafeInteger(x.issuedFrame)&&Number.isSafeInteger(x.observedFrame)&&x.observedFrame>x.issuedFrame&&['HIT','NEAR','MISS','INVALIDATED','EXPIRED'].includes(x.outcome);
const dir=x=>x?.velocity&&Number.isInteger(x.velocity.dx)&&Number.isInteger(x.velocity.dy)?[x.velocity.dx,x.velocity.dy]:null;
function create(seed=[]){const log=[],ids=new Set();for(const x of Array.isArray(seed)?seed:[]){if(x?.id&&x.root&&Number.isSafeInteger(x.issuedFrame)&&!ids.has(x.id)){log.push(clone(x));ids.add(x.id)}}let lastRoot=null,lastDirection=null;
function record(p){if(!scored(p)||ids.has(p.id))return null;
const v=dir(p),changed=lastRoot===p.root&&lastDirection&&v?(lastDirection[0]!==v[0]||lastDirection[1]!==v[1]):null;
if(lastRoot!==p.root){lastRoot=p.root;lastDirection=null}if(v)lastDirection=v;
const valid=['HIT','NEAR','MISS'].includes(p.outcome),correct=p.outcome==='HIT',near=p.outcome==='NEAR';
const row={id:p.id,root:p.root,issuedFrame:p.issuedFrame,observedFrame:p.observedFrame,expectedRegion:p.expectedRegion,observedRegion:p.observedRegion??null,outcome:p.outcome,velocity:v,changeDetected:changed,valid,hit:correct,near,source:p.source,sourceObservation:p.sourceObservation??null,reward:false,authority:false,ancestry:'one emulator root; role observations share ancestry'};
log.push(row);ids.add(row.id);return clone(row)}
function metrics(excludeRoot=null){const latest=new Map();
for(const x of log){if(x.root===excludeRoot||!x.valid)continue;const prev=latest.get(x.root);if(!prev||x.observedFrame>prev.observedFrame)latest.set(x.root,x)}
const rows=[...latest.values()],n=rows.length,hits=rows.filter(x=>x.hit).length,close=rows.filter(x=>x.hit||x.near).length,changes=rows.filter(x=>x.changeDetected===true).length;
return clone({roots:n,hits,close,hitRate:n?hits/n:null,withinOneRate:n?close/n:null,directionChangeRuns:changes,calibrated:n>=3,reason:n>=3?'Observed held-out root-wise rates; not proof of improvement':'Need three distinct scored gameplay roots'})}
function gate(root){const previous=metrics(root);return clone({eligible:previous.calibrated,root,previousRoots:previous.roots,priorHitRate:previous.hitRate,policy:'read-only historical calibration; never automatically replace AV-163 baseline'})}
return {record,metrics,gate,state:()=>clone({history:log,latest:log.at(-1)||null,totals:metrics()})}}
g.JanePredictiveTracking={create};})(typeof window==='undefined'?globalThis:window);