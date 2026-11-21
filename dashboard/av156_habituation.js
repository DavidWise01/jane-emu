/* AV-156 Habituation: verified cross-root recurrence reduces attention priority.
 * Materially different error reawakens attention; no lost evidence or controller changes. */
(function(g){'use strict';const copy=x=>JSON.parse(JSON.stringify(x)),states=['FAMILIAR','REAWAKENED','NOVEL','UNVERIFIED'];
function create(seed=[]){const events=[],ids=new Set();for(const e of Array.isArray(seed)?seed:[]){if(e?.id&&states.includes(e.state)&&!ids.has(e.id)){events.push(copy(e));ids.add(e.id)}}while(events.length>256)ids.delete(events.shift().id);
function assess(s,routing){if(!s?.id||!s.root||!s.rom||!s.hash||!s.button||s.status!=='SURPRISE'||s.attention!==true||!Number.isFinite(s.error)||!Number.isFinite(s.threshold)||s.threshold<=0||ids.has(s.id))return null;
const latest=new Map();for(const e of events){if(e.root===s.root||e.rom!==s.rom||e.hash!==s.hash||e.button!==s.button||!e.verified)continue;const prior=latest.get(e.root);if(!prior||e.frame>prior.frame)latest.set(e.root,e)}
const rows=[...latest.values()],sort=rows.map(e=>e.ratio).sort((a,b)=>a-b),median=sort.length?sort[Math.floor(sort.length/2)]:null,ratio=s.error/s.threshold,verified=routing?.status?.(s.id)?.check?.pass===true;
let state='UNVERIFIED',reason='Unverified novelty must not become familiar',factor=1;
if(verified){state='NOVEL';reason='Insufficient verified distinct prior runs';if(rows.length>=3&&median!==null){if(ratio>=median*2){state='REAWAKENED';reason='Prediction error doubled relative to prior-root median'}else if(ratio<=median*1.5){state='FAMILIAR';factor=.35;reason='Recurring verified novelty; reduce only queue priority'}else reason='Changed error magnitude preserves attention'}}
const original=Math.min(100,Math.max(1,Math.round(20*ratio))),priority=Math.max(1,Math.round(original*factor));
const row={id:s.id,root:s.root,rom:s.rom,hash:s.hash,button:s.button,frame:s.frame,ratio,verified,priorRoots:rows.length,priorMedian:median,state,priority,originalPriority:original,reason,reward:false,source:'same hive, distinct gameplay roots',policy:'append-only priority adjustment; never erase source or influence live controls'};
events.push(row);ids.add(row.id);if(events.length>256)ids.delete(events.shift().id);return copy(row)}
return {assess,state:()=>copy({history:events,latest:events.at(-1)||null})}}
g.JaneHabituation={create};})(typeof window==='undefined'?globalThis:window);