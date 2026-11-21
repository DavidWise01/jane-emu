/* AV-160 Spatial Attention.
 * Pair actual AV-159 48D feature residuals with read-only AV-097 screen tracer 6x4 spatial change.
 * Matches MUST have same game root and observed frame within 3 emulator frames.
 * No assumed feature-to-pixel index map: association requires >=3 distinct roots per feature/region.
 * Tracer 24 regions describe pixel motion, NOT player/opponent/menu semantics.
 */
(function(g){'use strict';const copy=x=>JSON.parse(JSON.stringify(x)),N=48,R=24,MAX=208;
const featureOK=x=>x?.id&&x.root&&x.rom&&x.hash&&x.status==='ATTRIBUTED'&&Number.isSafeInteger(x.frame)&&Array.isArray(x.features)&&x.features.length===N&&x.features.every(y=>Number.isFinite(y)&&y>=0)&&Array.isArray(x.top);
const traceOK=x=>x?.source_root&&Number.isSafeInteger(x.frame)&&x.baseline===false&&Array.isArray(x.regions)&&x.regions.length===R&&x.regions.every((r,i)=>r.id===i&&Number.isFinite(r.delta)&&r.delta>=0&&r.delta<=1);
function create(seed=[]){const history=[],ids=new Set(),pending=new Map(),traces=new Map();
for(const x of Array.isArray(seed)?seed:[]){if(x?.id&&x.root&&x.rom&&Array.isArray(x.featureIndices)&&Array.isArray(x.regions)&&!ids.has(x.id)){history.push(copy(x));ids.add(x.id)}}
while(history.length>MAX)ids.delete(history.shift().id);
function remember(m,k,x){m.set(k,copy(x));if(m.size>24)m.delete(m.keys().next().value)}
function pair(f,t){if(!featureOK(f)||!traceOK(t)||f.root!==t.source_root||Math.abs(f.frame-t.frame)>3||ids.has(f.id))return null;const hot=t.regions.slice().sort((a,b)=>b.delta-a.delta||a.id-b.id),active=hot.filter(x=>x.delta>0),featureIndices=f.top.filter(x=>Number.isInteger(x.index)&&x.index>=0&&x.index<N&&x.value>0).slice(0,6).map(x=>x.index);
const record={id:f.id,root:f.root,rom:f.rom,hash:f.hash,button:f.button,actor:f.actor,frame:f.frame,traceFrame:t.frame,offset:t.frame-f.frame,featureIndices,regions:t.regions.map(x=>x.delta),hotspot:active.length?hot[0].id:null,changedFraction:t.delta,sourceTraceHash:t.hash,semantic:'UNLABELED',reward:false,authority:false,source:'paired AV-159 feature residual and AV-097 measured pixel movement, one emulator root'};
history.push(record);ids.add(record.id);if(history.length>MAX)ids.delete(history.shift().id);pending.delete(f.root);return copy(record)}
function feature(f){if(!featureOK(f)||ids.has(f.id))return null;remember(pending,f.root,f);const t=traces.get(f.root);return t?pair(f,t):null}
function trace(t){if(!traceOK(t))return null;remember(traces,t.source_root,t);const f=pending.get(t.source_root);return f?pair(f,t):null}
function assess(f){if(!f?.root||!f.rom||!f.hash||!Number.isInteger(f.feature))return {status:'UNPROVEN',reason:'Feature scope required'};
const roots=new Map();for(const x of history){if(x.root===f.root||x.rom!==f.rom||x.hash!==f.hash||!x.featureIndices.includes(f.feature)||x.hotspot===null)continue;const p=roots.get(x.root);if(!p||x.frame>p.frame)roots.set(x.root,x)}
const counts=Array(R).fill(0);for(const x of roots.values())counts[x.hotspot]++;
const best=counts.indexOf(Math.max(...counts)),votes=counts[best],total=roots.size;
return copy({status:total>=3&&votes>=3&&votes/total>=.75?'ASSOCIATED':'UNPROVEN',feature:f.feature,roots:total,region:total?best:null,votes,confidence:total?votes/total:0,reason:total>=3&&votes>=3&&votes/total>=.75?'Repeated co-occurrence only; not a causal or semantic map':'Need three distinct consistent game roots',semantic:'UNLABELED'})}
return {feature,trace,assess,state:()=>copy({history,latest:history.at(-1)||null,pending:pending.size})}}
g.JaneSpatialAttention={create};})(typeof window==='undefined'?globalThis:window);