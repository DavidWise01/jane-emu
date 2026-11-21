/* AV-158 Neural Attentional Equilibrium.
 * Cross-root habituation and sensitization compete under a bounded attention gain.
 * Last observation per gameplay root; different agent roles do NOT create witnesses.
 * No time-driven decay, only evidence-triggered equilibrium corrections.
 * Raw observations remain immutable, no rewards or controller side effects.
 */
(function(g){'use strict';const clone=x=>JSON.parse(JSON.stringify(x));
const eligible=x=>x&&x.id&&x.root&&x.rom&&x.hash&&x.button&&Number.isSafeInteger(x.frame)&&['ALERT','SENSITIZED','RECOVERING','OBSERVE','UNVERIFIED'].includes(x.state);
function create(seed=[]){const history=[],ids=new Set();for(const row of Array.isArray(seed)?seed:[]){if(row?.id&&row.root&&row.rom&&row.hash&&row.button&&!ids.has(row.id)){history.push(clone(row));ids.add(row.id)}}
function assess(sample){if(!eligible(sample)||ids.has(sample.id))return null;
const scope=history.filter(x=>x.root!==sample.root&&x.rom===sample.rom&&x.hash===sample.hash&&x.button===sample.button&&x.verified),latest=new Map();
for(const e of scope){const prev=latest.get(e.root);if(!prev||e.frame>prev.frame)latest.set(e.root,e)}
const signals=[...latest.values()],calm=signals.filter(x=>x.sourceState==='FAMILIAR').length,awake=signals.filter(x=>x.sourceState==='REAWAKENED').length;
let state='OBSERVE',factor=1,reason='Wait for verified cross-run evidence';
if(!sample.verified){state='UNVERIFIED';reason='Unverified evidence has no authority to adjust priority'}
else if(signals.length<2){state='OBSERVE';reason='Fewer than two independent prior gameplay roots'}
else if(awake>=2&&calm===0){state='SENSITIZED';factor=1;reason='Repeated distinct-root change holds attention at baseline ceiling'}
else if(calm>=2&&awake===0){state='HABITUATED';factor=.35;reason='Repeated familiar observations lower attention'}
else if(calm>0&&awake>0){state='BALANCED';factor=.7;reason='Conflicting verified roots preserve a moderate attention margin'}
else if(sample.sourceState==='REAWAKENED'){state='ALERT';factor=1;reason='New change requests observation'}
const original=Number.isSafeInteger(sample.originalPriority)?sample.originalPriority:sample.priority;
if(!Number.isSafeInteger(original)||original<1||original>100)return null;
const priority=Math.max(1,Math.min(original,Math.round(original*factor)));
const row={id:sample.id,root:sample.root,rom:sample.rom,hash:sample.hash,button:sample.button,frame:sample.frame,sourceState:sample.sourceState,verified:sample.verified===true,priorRoots:signals.length,calmRoots:calm,awakeRoots:awake,state,priority,originalPriority:original,factor,reason,reward:false,controlOverride:false,policy:'observed cross-root equilibrium only; append-only event; no autonomous play changes'};
history.push(row);ids.add(row.id);return clone(row)}
return {assess,state:()=>clone({history,latest:history.at(-1)||null})}}
g.JaneAttentionalEquilibrium={create};})(typeof window==='undefined'?globalThis:window);