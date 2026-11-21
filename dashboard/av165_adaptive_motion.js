/* AV-165 Adaptive Motion Models — prospective frozen comparison.
 * Candidate models: CONTINUE, HOLD, REVERSE. Every available candidate issued
 * before subsequent observation and all score against the same future region.
 * Model selection uses completed prior-root outcomes, excluding the current root.
 * No object identity, no input control, no training reward or retroactive selection.
 */
(function(g){'use strict';const cp=x=>JSON.parse(JSON.stringify(x)),MODELS=['CONTINUE','HOLD','REVERSE'],CAP=208,HORIZON=6;
const xy=i=>({x:i%6,y:Math.floor(i/6)}),index=(x,y)=>x>=0&&x<6&&y>=0&&y<4?6*y+x:null,dist=(a,b)=>Math.abs(a%6-b%6)+Math.abs(Math.floor(a/6)-Math.floor(b/6));
const eligible=m=>m?.id&&m.root&&Number.isSafeInteger(m.frame)&&['TRACKED','STATIONARY','PROVISIONAL','QUIET','SCENE-WIDE'].includes(m.status)&&Array.isArray(m.track);
function create(seed=[]){const history=[],ids=new Set();for(const r of Array.isArray(seed)?seed:[]){if(r?.id&&r.root&&Number.isSafeInteger(r.issuedFrame)&&!ids.has(r.id)){history.push(cp(r));ids.add(r.id)}}let pending=null,root=null,frame=-1;
function evidence(excludeRoot){const last=new Map();for(const r of history){if(r.root===excludeRoot||r.outcome!=='SCORED')continue;const prior=last.get(r.root);if(!prior||r.observedFrame>prior.observedFrame)last.set(r.root,r)}
const rows=[...last.values()],summary={};for(const name of MODELS){const scored=rows.filter(r=>Number.isInteger(r.errors?.[name]));summary[name]={roots:scored.length,meanError:scored.length?scored.reduce((s,r)=>s+r.errors[name],0)/scored.length:null,hits:scored.filter(r=>r.errors[name]===0).length}}return {rows:rows.length,models:summary}}
function select(excludeRoot,candidates){const cal=evidence(excludeRoot),base=cal.models.CONTINUE;
if(candidates.CONTINUE===null)return {model:'NONE',roots:cal.rows,reason:'Continuation leaves the 6x4 grid'};
if(base.roots<3)return {model:'CONTINUE',roots:cal.rows,reason:'Not enough prior-root tests; freeze baseline'};
const winning=MODELS.filter(name=>candidates[name]!==null&&cal.models[name].roots>=3).sort((a,b)=>cal.models[a].meanError-cal.models[b].meanError||MODELS.indexOf(a)-MODELS.indexOf(b))[0];
if(winning!=='CONTINUE'&&cal.models.CONTINUE.meanError-cal.models[winning].meanError>=.25)return {model:winning,roots:cal.rows,reason:'Prior-root mean error advantage >= 0.25 region'};
return {model:'CONTINUE',roots:cal.rows,reason:'Insufficient held-out advantage; preserve baseline'}}
function observe(m){if(!eligible(m)||m.root===root&&m.frame<=frame)return null;const changedRoot=m.root!==root;if(changedRoot){root=m.root;pending=null;frame=-1}frame=m.frame;let completed=null;
if(pending&&m.frame>pending.issuedFrame){const elapsed=m.frame-pending.issuedFrame;
if(elapsed>HORIZON||m.status==='SCENE-WIDE'||Number.isInteger(m.hotspot)&&m.hotspot>=0&&m.hotspot<24){const scored=elapsed<=HORIZON&&m.status!=='SCENE-WIDE'&&Number.isInteger(m.hotspot)&&m.hotspot>=0&&m.hotspot<24;
const errors=Object.fromEntries(MODELS.map(name=>[name,scored&&pending.candidates[name]!==null?dist(pending.candidates[name],m.hotspot):null]));
completed={...pending,outcome:scored?'SCORED':elapsed>HORIZON?'EXPIRED':'INVALIDATED',observedFrame:m.frame,observedRegion:scored?m.hotspot:null,errors,selectedError:scored?errors[pending.selected]:null,sourceObservation:m.id,identity:'UNVERIFIED',reward:false,controlAuthority:false};history.push(cp(completed));ids.add(completed.id);if(history.length>CAP)ids.delete(history.shift().id);pending=null}
}
if(!pending&&m.status==='TRACKED'&&m.track.length>=3&&!m.global){const valid=m.track.filter(x=>Number.isSafeInteger(x.frame)&&Number.isInteger(x.region)&&x.region>=0&&x.region<24),a=valid.at(-2),b=valid.at(-1);
if(a&&b&&b.frame>a.frame){const x=xy(a.region),y=xy(b.region),dx=Math.sign(y.x-x.x),dy=Math.sign(y.y-x.y);
if(dx||dy){const candidates={CONTINUE:index(y.x+dx,y.y+dy),HOLD:b.region,REVERSE:index(y.x-dx,y.y-dy)};
const pick=select(m.root,candidates);
if(pick.model!=='NONE')pending={id:'AV165:'+m.id,root:m.root,issuedFrame:m.frame,source:m.id,from:b.region,velocity:{dx,dy},candidates,selected:pick.model,selectionReason:pick.reason,selectionRoots:pick.roots,horizon:HORIZON,immutable:true}}}}
return cp({completed,forecast:pending})}
return {observe,evidence,select,state:()=>cp({history,pending,latest:history.at(-1)||null})}}
g.JaneAdaptiveMotion={create};})(typeof window==='undefined'?globalThis:window);