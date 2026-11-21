/* AV-155 Neural Attention Persistence.
 * Tracks same-ROM/scene/button surprise recurrence across DISTINCT live gameplay roots.
 * One latest classification per root; actor votes and repeat frames do not multiply evidence.
 * Every observation is retained as an append-only record; interpretations are derived only.
 * A surprise is never a reward or authorization to change NES inputs.
 */
(function(g){'use strict';const copy=x=>JSON.parse(JSON.stringify(x)),states=['SURPRISE','ROUTINE','UNPROVEN'],key=x=>JSON.stringify([x.rom,x.hash,x.button]);
function create(seed=[]){const journal=[],ids=new Set();
for(const x of Array.isArray(seed)?seed:[]){if(x?.id&&x.root&&x.rom&&x.hash&&x.button&&states.includes(x.status)&&!ids.has(x.id)){journal.push(copy(x));ids.add(x.id)}}
function ingest(e){if(!e?.id||!e.root||!e.rom||!e.hash||!e.button||!states.includes(e.status)||!Number.isSafeInteger(e.frame)||ids.has(e.id))return false;
journal.push({id:e.id,root:e.root,rom:e.rom,hash:e.hash,button:e.button,frame:e.frame,status:e.status,error:Number.isFinite(e.error)?e.error:null,threshold:Number.isFinite(e.threshold)?e.threshold:null,verified:false,source:'AV-152 sensory novelty; actor labels share game ancestry',reward:false});ids.add(e.id);return true}
function assess(rom,hash,button,routing){if(!rom||!hash||!button)return {status:'UNPROVEN',roots:0,surprises:0,routine:0,reason:'Exact scene required'};
const matches=journal.filter(x=>x.rom===rom&&x.hash===hash&&x.button===button),latest=new Map();
for(const x of matches){const before=latest.get(x.root);if(!before||x.frame>before.frame||x.frame===before.frame&&x.id>before.id)latest.set(x.root,x)}
const distinct=[...latest.values()],confirmed=distinct.filter(x=>x.status==='SURPRISE'&&routing?.status?.(x.id)?.check?.pass===true),routine=distinct.filter(x=>x.status==='ROUTINE'),unverified=distinct.filter(x=>x.status==='SURPRISE'&&!routing?.status?.(x.id)?.check?.pass);
const enough=distinct.length>=3;
let status='UNPROVEN',reason='Three distinct gameplay roots needed';
if(enough&&confirmed.length>=3){status='PERSISTENT';reason='Verified anomaly recurs on at least three distinct game roots'}
else if(enough&&routine.length>=3&&confirmed.length===0){status='SETTLED';reason='At least three distinct game roots now produce routine prediction error'}
else if(enough){status='MIXED';reason='Evidence varies across independent runs; keep attention open'}
return copy({rom,hash,button,status,roots:distinct.length,surprises:confirmed.length,routine:routine.length,unverified:unverified.length,sourceIds:distinct.map(x=>x.id),reason,reward:false,automaticPromotion:false,policy:'evidence persistence only; same root never counts twice; no control input'})}
return {ingest,assess,state:()=>copy({journal,count:journal.length})}}
g.JaneAttentionPersistence={create};})(typeof window==='undefined'?globalThis:window);