/* AV-150 predictive homeostasis: immutable predicted vs observed AV-131 simulated credits.
 * Calibrate only against observed energy after >=144 emulator frames on the SAME game root.
 * Counterfactual fork costs are excluded from scored observations.
 * Forecast correction is a conservative additive uncertainty buffer, not live control.
 */
(function(g){'use strict';const copy=x=>JSON.parse(JSON.stringify(x)),names=['JANE','TOPH','PATRICIA'],H=144;
function create(seed=[]){const history=Array.isArray(seed)?seed.filter(x=>x?.id&&x.root&&x.rom&&Number.isSafeInteger(x.frame)&&x.predicted&&x.snapshot).map(copy).slice(-208):[],ids=new Set(history.map(x=>x.id));let latest=null;
function arm(p,forecast,m){if(!p?.root||!p.rom||!names.includes(p.actor)||!Number.isSafeInteger(p.frame)||!forecast||forecast.root!==p.root||forecast.rom!==p.rom||forecast.frame!==p.frame||!['SUSTAINABLE','CONSERVE'].includes(forecast.state)||!Array.isArray(forecast.watchers)||!m?.banks)return false;
const previous=history.filter(x=>x.root===p.root&&x.rom===p.rom&&x.actor===p.actor).at(-1);if(previous&&p.frame-previous.frame<240)return false;
const predicted={},snapshot={};for(const watcher of forecast.watchers){const b=m.banks[watcher.name],net=watcher.spentPerFrame-watcher.recoveredPerFrame;if(!b||!Number.isSafeInteger(b.energy)||!Number.isFinite(net)||!names.includes(watcher.name))return false;snapshot[watcher.name]=b.energy;predicted[watcher.name]=Math.floor(b.energy-H*Math.max(0,net))}
const id=JSON.stringify([p.root,p.rom,p.actor,p.frame]);if(ids.has(id))return false;
const row={id,root:p.root,rom:p.rom,actor:p.actor,frame:p.frame,targetFrame:p.frame+H,snapshot,predicted,observed:null,error:null,state:'PENDING',source:'AV-149 measured-rate forecast; excludes hypothetical future forks',unit:'simulated credits'};
history.push(row);ids.add(id);if(history.length>208)ids.delete(history.shift().id);latest=row;return true}
function observe(p,m){if(!p?.root||!p.rom||!Number.isSafeInteger(p.frame)||!m?.banks)return 0;let n=0;for(const row of history){if(row.state!=='PENDING'||row.root!==p.root||row.rom!==p.rom||p.frame<row.targetFrame)continue;
let ok=true;const observed={},error={};for(const name of Object.keys(row.predicted)){const energy=m.banks[name]?.energy;if(!Number.isSafeInteger(energy)){ok=false;break}observed[name]=energy;error[name]=row.predicted[name]-energy}
if(!ok)continue;row.observed=observed;row.error=error;row.observedFrame=p.frame;row.state='SCORED';latest=row;n++}return n}
function assess(p,forecast){if(!p?.root||!p.rom||!forecast||forecast.root!==p.root||forecast.rom!==p.rom){return {state:'WAIT',allow:false,reason:'No aligned forecast'}}
const scoped=history.filter(x=>x.root===p.root&&x.rom===p.rom&&x.state==='SCORED');const last=scoped.slice(-8),worst=Math.max(0,...last.flatMap(row=>Object.values(row.error||{}))),margin=Number.isFinite(forecast.margin)?forecast.margin:null;
const ready=last.length>=2,state=forecast.state!=='SUSTAINABLE'?'BLOCKED':!ready?'CALIBRATING':margin!==null&&margin>=worst?'CALIBRATED':'CORRECT';
return copy({root:p.root,rom:p.rom,frame:p.frame,state,allow:state==='CALIBRATED',reason:state==='CALIBRATED'?'Forecast margin exceeds observed worst-case overprediction':state==='CORRECT'?'Observed forecast overprediction exceeds available reserve margin':state==='CALIBRATING'?'Need two independent-in-time scored predictions':'AV-149 does not permit experimental fork',samples:last.length,worstOverprediction:worst,rawMargin:margin,adjustedMargin:margin===null?null:margin-worst,policy:'score only observed no-fork credit trend, retain immutable predicted snapshots; no auto-promotion'})}
return {arm,observe,assess,state:()=>copy({latest,history})}}
g.JanePredictiveHomeostasis={create};})(typeof window==='undefined'?globalThis:window);