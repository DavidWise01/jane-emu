/* AV-154 Neural Attention Routing — one shared evidence ancestry, two analytical roles.
 * Investigator traces the cited error; checker validates roots and recomputes the numeric claim.
 * Agent names are role labels on ONE shared execution, NOT independent witness roots.
 * Source and decisions are append-only. Human explicitly acknowledges before AV-153 closes.
 */
(function(g){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),ROLES=['JANE','TOPH','PATRICIA'],finite=x=>Number.isFinite(x)&&x>=0;
function create(seed=[]){const events=[],ids=new Set();for(const e of Array.isArray(seed)?seed:[]){if(e&&e.id&&['INVESTIGATED','CHECKED','ACKNOWLEDGED'].includes(e.kind)&&!ids.has(e.id)){events.push(copy(e));ids.add(e.id)}}
function add(row){if(ids.has(row.id))return false;events.push(copy(row));ids.add(row.id);return true}
function route(item,surpriseRows,codingRows){if(!item?.source||!item.root||!item.rom||!item.hash||!ROLES.includes(item.assigned)||ids.has('INVESTIGATED:'+item.source))return false;
const investigator=item.assigned,checker=ROLES.find(x=>x!==item.actor&&x!==investigator)||ROLES.find(x=>x!==investigator);
const surprise=(surpriseRows||[]).find(x=>x.id===item.source&&x.root===item.root&&x.rom===item.rom&&x.hash===item.hash);
const observed=(codingRows||[]).find(x=>x.id===item.source&&x.root===item.root&&x.rom===item.rom&&x.hash===item.hash);
const lineage=!!surprise&&!!observed&&surprise.attention===true&&surprise.status==='SURPRISE'&&observed.status==='SCORED'&&finite(surprise.error)&&finite(surprise.threshold)&&surprise.threshold>0&&Math.abs(surprise.error-observed.meanAbsoluteError)<1e-8;
const first={id:'INVESTIGATED:'+item.source,kind:'INVESTIGATED',source:item.source,root:item.root,rom:item.rom,hash:item.hash,investigator,checker,sourceMatched:lineage,error:surprise?.error??null,threshold:surprise?.threshold??null,originalFrame:item.frame,claim:'source tracing; role assignment is not independent corroboration'};
add(first);
const roots=surprise?.calibrationRoots||[],distinct=roots.length>=3&&new Set(roots).size===roots.length&&!roots.includes(item.root);
const recomputed=lineage&&finite(observed.meanAbsoluteError)&&observed.meanAbsoluteError>surprise.threshold&&distinct&&observed.predictionRoots>=3;
const second={id:'CHECKED:'+item.source,kind:'CHECKED',source:item.source,checker,investigator,pass:!!recomputed,distinctRoots:distinct?roots.length:0,sourceMatched:lineage,verdict:recomputed?'ATTENTION_CONFIRMED':'REEXAMINE',reward:false,claim:'numeric and ancestry check of same evidence, not a second measurement'};
add(second);return true}
function status(source){const relevant=events.filter(e=>e.source===source),investigation=relevant.find(e=>e.kind==='INVESTIGATED'),check=relevant.find(e=>e.kind==='CHECKED'),ack=relevant.find(e=>e.kind==='ACKNOWLEDGED');return copy({investigation:investigation||null,check:check||null,acknowledged:!!ack,ready:!!check?.pass&&!ack,reviewable:!!check?.pass&&!ack})}
function acknowledge(source,agent){const q=status(source);if(!q.reviewable||agent!==q.investigation.investigator)return false;return add({id:'ACKNOWLEDGED:'+source,kind:'ACKNOWLEDGED',source,agent,reason:'HUMAN_REVIEWED',reward:false})}
return {route,status,acknowledge,state:()=>copy({events,openInvestigations:events.filter(x=>x.kind==='INVESTIGATED').length,sharedAncestry:true})}}
g.JaneAttentionRouting={create};})(typeof window==='undefined'?globalThis:window);