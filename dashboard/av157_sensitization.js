/* AV-157 Neural Sensitization.
 * A bounded, temporary boost after two verified REAWAKENED residuals from
 * different gameplay roots. Decays after two different familiar roots.
 * One observed root is one source; shared agent roles are not independent trials.
 * Does not issue NES actions, promote rewards, or alter original observations. */
(function(g){'use strict';const copy=x=>JSON.parse(JSON.stringify(x)),valid=x=>x&&x.id&&x.root&&x.rom&&x.hash&&x.button&&['FAMILIAR','REAWAKENED','NOVEL','UNVERIFIED'].includes(x.state);
function create(seed=[]){const history=[],ids=new Set();for(const x of Array.isArray(seed)?seed:[]){if(x?.id&&x.root&&x.rom&&x.hash&&x.button&&!ids.has(x.id)){history.push(copy(x));ids.add(x.id)}}
function assess(h){if(!valid(h)||ids.has(h.id))return null;
const scoped=history.filter(x=>x.rom===h.rom&&x.hash===h.hash&&x.button===h.button&&x.root!==h.root&&x.verified),latest=new Map();
for(const x of scoped){const old=latest.get(x.root);if(!old||x.frame>old.frame)latest.set(x.root,x)}
const distinct=[...latest.values()],awake=distinct.filter(x=>x.state==='REAWAKENED'),calm=distinct.filter(x=>x.state==='FAMILIAR');
let state='OBSERVE',factor=1,reason='Insufficient distinct-root evidence for temporary sensitization';
if(h.verified&&h.state==='REAWAKENED'&&awake.length>=1){state='SENSITIZED';factor=1;reason='Two verified reawakenings from separate roots; full attention for this event'}
else if(h.verified&&h.state==='FAMILIAR'&&calm.length>=1){state='RECOVERING';factor=0.35;reason='Two separate familiar roots; reduce attention toward habituated baseline'}
else if(h.verified&&h.state==='REAWAKENED'){state='ALERT';reason='First distinct verified reawakening; monitor without permanent gain'}
else if(!h.verified){state='UNVERIFIED';reason='Unverified event cannot contribute to sensitization'}
const sourcePriority=h.originalPriority??h.priority,priority=Math.max(1,Math.min(100,Math.round(sourcePriority*factor)));
const row={id:h.id,root:h.root,rom:h.rom,hash:h.hash,button:h.button,frame:h.frame,verified:h.verified===true,sourceState:h.state,state,priority,originalPriority:sourcePriority,awakeRoots:awake.length,calmRoots:calm.length,reason,reward:false,controllerOverride:false,policy:'temporary scope-based attention gain; resets with evidence, never invents separate witnesses'};
history.push(row);ids.add(row.id);return copy(row)}
return {assess,state:()=>copy({history,latest:history.at(-1)||null})}}
g.JaneSensitization={create};})(typeof window==='undefined'?globalThis:window);