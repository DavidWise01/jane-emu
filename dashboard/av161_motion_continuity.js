/* AV-161 Neural Motion Continuity — observational tracker, NOT object recognition.
 * Uses AV-097 6x4 region pixel change. Each step is a temporal hotspot hypothesis.
 * Requires three consecutive non-global, adjacent hotspots with advancing emulator frames.
 * Flash/global changes break tracks; no player/opponent labels, no NES controller effects.
 */
(function(g){'use strict';const cp=x=>JSON.parse(JSON.stringify(x)),R=24,MAX=208;
const valid=p=>p?.source_root&&Number.isSafeInteger(p.frame)&&p.frame>=0&&p.baseline===false&&Array.isArray(p.regions)&&p.regions.length===R&&p.regions.every((r,i)=>r.id===i&&Number.isFinite(r.delta)&&r.delta>=0&&r.delta<=1);
const adjacent=(a,b)=>a!==null&&b!==null&&Math.abs(a%6-b%6)<=1&&Math.abs(Math.floor(a/6)-Math.floor(b/6))<=1;
function create(seed=[]){const history=[],seen=new Set();for(const e of Array.isArray(seed)?seed:[]){if(e?.id&&e.root&&Number.isSafeInteger(e.frame)&&!seen.has(e.id)){history.push(cp(e));seen.add(e.id)}}let root=null,lastFrame=-1,path=[],latest=history.at(-1)||null,seq=0;
function observe(p){if(!valid(p))return null;const key=p.source_root+':'+p.frame;if(seen.has(key)||root===p.source_root&&p.frame<=lastFrame)return null;
if(root!==p.source_root||p.frame-lastFrame>12){path=[];root=p.source_root}
lastFrame=p.frame;
const ranked=p.regions.map(r=>({id:r.id,delta:r.delta})).sort((a,b)=>b.delta-a.delta||a.id-b.id);
const total=ranked.reduce((n,r)=>n+r.delta,0),bright=ranked.filter(r=>r.delta>=.12).length;
const global=bright>=12||(Number.isFinite(p.delta)&&p.delta>=.42);
const hotspot=ranked[0].delta>=.12&&total>0&&!global?ranked[0].id:null;
if(global){path=[]}else if(hotspot===null){path=[]}else{
 const prev=path.at(-1);
 if(prev&&(!adjacent(prev.region,hotspot)||p.frame-prev.frame>12))path=[];
 path.push({frame:p.frame,region:hotspot,delta:ranked[0].delta});
 if(path.length>6)path.shift()
}
const duration=path.length>=2?path.at(-1).frame-path[0].frame:0,trackable=path.length>=3&&duration>=2;
const moving=trackable&&new Set(path.map(x=>x.region)).size>=2;
const status=global?'SCENE-WIDE':hotspot===null?'QUIET':!trackable?'PROVISIONAL':moving?'TRACKED':'STATIONARY';
const row={id:key,root:p.source_root,frame:p.frame,status,hotspot,peak:ranked[0].delta,global,brightRegions:bright,track:path.map(x=>({...x})),trackLength:path.length,distinctRegions:new Set(path.map(x=>x.region)).size,sourceHash:p.hash||null,semantic:'UNLABELED',identity:'UNVERIFIED',reward:false,controlAuthority:false,policy:'region-change continuity, not object segmentation or identity'};
history.push(row);seen.add(key);if(history.length>MAX)seen.delete(history.shift().id);latest=row;return cp(row)}
return {observe,state:()=>cp({latest,history})}}
g.JaneMotionContinuity={create};})(typeof window==='undefined'?globalThis:window);