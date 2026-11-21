/* AV-163 Neural Motion Prediction.
 * One-step regional trajectory forecast from AV-161 track.
 * Issue BEFORE the following observation, score only subsequent same-root
 * non-global visible change <= 6 emulator frames later.
 * A 6x4 spatial hotspot is not a verified object, velocity or identity.
 * Read-only; immutable predictions never alter NES actions or rewards.
 */
(function(g){'use strict';const cp=x=>JSON.parse(JSON.stringify(x)),MAX=208,limit=6;
const valid=x=>x?.id&&x.root&&Number.isSafeInteger(x.frame)&&Array.isArray(x.track)&&['TRACKED','STATIONARY','PROVISIONAL','QUIET','SCENE-WIDE'].includes(x.status);
const xy=i=>({x:i%6,y:Math.floor(i/6)}),distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
function create(seed=[]){const events=[],ids=new Set();for(const e of Array.isArray(seed)?seed:[]){if(e?.id&&e.root&&Number.isSafeInteger(e.issuedFrame)&&!ids.has(e.id)){events.push(cp(e));ids.add(e.id)}}let pending=null,lastRoot=null,lastFrame=-1;
function observe(m){if(!valid(m))return null;if(m.root===lastRoot&&m.frame<=lastFrame)return null;const rootChanged=lastRoot!==m.root;if(rootChanged){pending=null;lastRoot=m.root}lastFrame=m.frame;
let completed=null;
if(pending&&m.frame>pending.issuedFrame){const gap=m.frame-pending.issuedFrame;
 let outcome='NO_EVIDENCE',distanceError=null;
 if(gap>limit)outcome='EXPIRED';
 else if(m.status==='SCENE-WIDE')outcome='INVALIDATED';
 else if(m.status==='QUIET')outcome='NO_EVIDENCE';
 else if(Number.isInteger(m.hotspot)&&m.hotspot>=0&&m.hotspot<24){distanceError=distance(xy(m.hotspot),xy(pending.expectedRegion));outcome=distanceError===0?'HIT':distanceError===1?'NEAR':'MISS'}
 if(outcome!=='NO_EVIDENCE'){completed={...pending,observedFrame:m.frame,observedRegion:Number.isInteger(m.hotspot)?m.hotspot:null,outcome,distanceError,identity:'UNVERIFIED',reward:false,sourceObservation:m.id};events.push(cp(completed));ids.add(completed.id);if(events.length>MAX)ids.delete(events.shift().id);pending=null}
}
if(m.status==='SCENE-WIDE'||rootChanged&&m.status!=='TRACKED'){pending=null}
if(!pending&&m.status==='TRACKED'&&m.track.length>=3&&!m.global&&Number.isInteger(m.hotspot)){
 const points=m.track.filter(p=>Number.isInteger(p.region)&&p.region>=0&&p.region<24&&Number.isSafeInteger(p.frame));const a=points.at(-2),b=points.at(-1);
 if(a&&b&&b.frame>a.frame){const v0=xy(a.region),v1=xy(b.region),dx=Math.sign(v1.x-v0.x),dy=Math.sign(v1.y-v0.y);if(dx||dy){const nx=v1.x+dx,ny=v1.y+dy;if(nx>=0&&nx<6&&ny>=0&&ny<4){pending={id:'PREDICT:'+m.id,root:m.root,issuedFrame:m.frame,source:m.id,sourceRegions:[a.region,b.region],expectedRegion:ny*6+nx,velocity:{dx,dy},horizon:limit,method:'last regional displacement, one grid step; no semantic identity'}}}}}
return cp({latest:completed,forecast:pending})}
return {observe,state:()=>cp({latest:events.at(-1)||null,history:events,pending})}}
g.JaneMotionPrediction={create};})(typeof window==='undefined'?globalThis:window);