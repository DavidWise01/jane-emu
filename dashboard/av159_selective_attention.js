/* AV-159 Selective Attention: deterministic visual-feature residual attribution.
 * The 48 features are abstract visual-vector coordinates, NOT asserted pixel positions.
 * Only scored AV-151 predictions qualify. Keeps exact action and game-root lineage.
 * Observational; no controller input, reward label, or learned policy promotion. */
(function(g){'use strict';const copy=x=>JSON.parse(JSON.stringify(x)),N=48;
function vector(a){return Array.isArray(a)&&a.length===N&&a.every(Number.isFinite)}
function create(seed=[]){const events=[],seen=new Set();for(const x of Array.isArray(seed)?seed:[]){if(x?.id&&x.root&&x.rom&&x.hash&&x.button&&Array.isArray(x.features)&&!seen.has(x.id)){events.push(copy(x));seen.add(x.id)}}
function observe(p){if(!p?.id||seen.has(p.id)||!p.root||!p.rom||!p.hash||!p.button||!Number.isSafeInteger(p.observedFrame)||p.status!=='SCORED'||!vector(p.delta)||!vector(p.predicted)||!Number.isSafeInteger(p.predictionRoots)||p.predictionRoots<3)return null;
const residual=p.delta.map((actual,i)=>Math.abs(actual-p.predicted[i]));
const total=residual.reduce((a,b)=>a+b,0),mean=total/N;
if(!Number.isFinite(total))return null;
const ranked=residual.map((value,index)=>({index,value,observed:p.delta[index],expected:p.predicted[index],share:total>0?value/total:0})).sort((a,b)=>b.value-a.value||a.index-b.index);
const top=ranked.slice(0,6),topShare=top.reduce((n,x)=>n+x.share,0);
const row={id:p.id,root:p.root,rom:p.rom,hash:p.hash,button:p.button,actor:p.actor,frame:p.observedFrame,roots:p.predictionRoots,features:residual,top,topShare,meanAbsoluteError:mean,concentration:total===0?'NONE':topShare>=.7?'CONCENTRATED':'DISTRIBUTED',status:'ATTRIBUTED',featureSpace:'AV-151 48-dimensional abstract visual signal; spatial layout not established',reward:false,actionAuthority:false,source:'single same-root action/result observation'};
events.push(row);seen.add(row.id);return copy(row)}
return {observe,state:()=>copy({latest:events.at(-1)||null,history:events})}}
g.JaneSelectiveAttention={create};})(typeof window==='undefined'?globalThis:window);