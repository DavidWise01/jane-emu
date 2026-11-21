/* AV-151 Neural Predictive Coding.
   Learn *observed* visual-vector transitions from a single shared NES emulator.
   Only predict when 3 distinct earlier live roots support the same (rom, scene, button).
   No pixel semantics inferred, no independent witnesses invented, no input override.
 */
(function(g){'use strict';const clone=x=>JSON.parse(JSON.stringify(x)),N=48,finite=v=>Array.isArray(v)&&v.length===N&&v.every(x=>Number.isFinite(x)),scope=p=>JSON.stringify([p.root,p.rom,p.actor]),key=p=>JSON.stringify([p.rom,p.hash,p.button]);
function create(seed=[]){const rows=[],ids=new Set();for(const x of Array.isArray(seed)?seed:[]){if(x?.id&&x?.root&&x?.rom&&x?.hash&&typeof x.button==='string'&&finite(x.delta)&&!ids.has(x.id)){rows.push(clone(x));ids.add(x.id)}}while(rows.length>208)ids.delete(rows.shift().id);let pending=null,latest=null,rejected={scope:0,stale:0,missing:0};
function predict(p){const roots=new Map();for(const x of rows){if(x.root===p.root||key(x)!==key(p))continue;if(!roots.has(x.root))roots.set(x.root,[]);roots.get(x.root).push(x)}if(roots.size<3)return {status:'UNCALIBRATED',roots:roots.size,predicted:null};
const samples=[...roots].map(([,v])=>v.at(-1).delta),predicted=Array.from({length:N},(_,i)=>samples.reduce((a,v)=>a+v[i],0)/samples.length);return {status:'PREDICTED',roots:roots.size,predicted}}
function arm(p,visual){if(!p?.root||!p.rom||!p.actor||!p.hash||typeof p.button!=='string'||!Number.isSafeInteger(p.frame)||!finite(visual))return false;
const id=JSON.stringify([p.root,p.rom,p.actor,p.frame,p.button]);if(ids.has(id))return false;const model=predict(p);
pending={id,root:p.root,rom:p.rom,actor:p.actor,hash:p.hash,frame:p.frame,button:p.button,before:visual.slice(),prediction:model.predicted,predictionRoots:model.roots,end:null};return true}
function finish(p){if(!pending||scope(p)!==scope(pending)||p.frame!==pending.frame||p.button!==pending.button){rejected.scope++;return false}if(!Number.isSafeInteger(p.end)||p.end<p.frame){rejected.stale++;return false}pending.end=p.end;return true}
function sense(p){if(!pending||pending.end===null)return false;if(!p?.root||scope(p)!==scope(pending)){pending=null;rejected.scope++;return false}if(!Number.isSafeInteger(p.frame)||p.frame<=pending.end)return false;if(p.frame-pending.end>6){pending=null;rejected.stale++;return false}if(!finite(p.vec)){rejected.missing++;return false}
const x=pending;pending=null;const delta=p.vec.map((v,i)=>v-x.before[i]),error=x.prediction?delta.reduce((a,v,i)=>a+Math.abs(v-x.prediction[i]),0)/N:null;
const row={id:x.id,root:x.root,rom:x.rom,actor:x.actor,hash:x.hash,frame:x.frame,end:x.end,observedFrame:p.frame,button:x.button,delta,predicted:x.prediction,predictionRoots:x.predictionRoots,meanAbsoluteError:error,status:error===null?'UNCALIBRATED':'SCORED',ancestry:'one live emulator per root; three actor votes are not three roots'};
if(ids.has(row.id))return false;ids.add(row.id);rows.push(row);if(rows.length>208)ids.delete(rows.shift().id);latest={...row,delta:undefined,predicted:undefined};return true}
function state(){return clone({latest,history:rows,rejected,pending:pending?{root:pending.root,rom:pending.rom,actor:pending.actor,frame:pending.frame,end:pending.end}:null})}
return {arm,finish,sense,predict,state}}
g.JanePredictiveCoding={create};})(typeof window==='undefined'?globalThis:window);