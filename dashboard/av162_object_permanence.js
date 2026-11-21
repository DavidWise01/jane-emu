/* AV-162 — Neural Object Permanence: bounded regional motion hypothesis.
 * Observes AV-161 outputs, not objects or sprite identities.
 * A confirmed TRACKED sequence may enter HOLD on quiet frames; RETURN_CANDIDATE
 * requires spatial adjacency within <=6 emulator frames (not wall-clock time).
 * Global scene changes, root changes and discontinuities invalidate memory.
 * No auto gameplay actions, rewards, or object-identity assertions.
 */
(function(g){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),MAX=256,WINDOW=6;
const valid=x=>x?.id&&x.root&&Number.isSafeInteger(x.frame)&&x.frame>=0&&['TRACKED','STATIONARY','PROVISIONAL','QUIET','SCENE-WIDE'].includes(x.status)&&Array.isArray(x.track);
const near=(a,b)=>Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&a<24&&b>=0&&b<24&&Math.abs(a%6-b%6)<=1&&Math.abs(Math.floor(a/6)-Math.floor(b/6))<=1;
function create(seed=[]){const history=[],seen=new Set();for(const x of Array.isArray(seed)?seed:[]){if(x?.id&&x.root&&Number.isSafeInteger(x.frame)&&!seen.has(x.id)){history.push(copy(x));seen.add(x.id)}}while(history.length>MAX)seen.delete(history.shift().id);
let root=null,last=-1,anchor=null,hold=null;
function observe(x){if(!valid(x)||seen.has(x.id)||root===x.root&&x.frame<=last)return null;
if(root!==x.root){root=x.root;anchor=null;hold=null;last=-1}
const gap=last<0?0:x.frame-last;last=x.frame;
if(gap>12){anchor=null;hold=null}
let state='NO_HYPOTHESIS',reason='No confirmed moving-region path',remaining=0;
if(x.status==='SCENE-WIDE'){anchor=null;hold=null;state='INVALIDATED';reason='Scene-wide transition invalidates continuity'}
else if(x.status==='TRACKED'&&x.trackLength>=3&&Number.isInteger(x.hotspot)){
 if(hold&&x.frame-hold.firstQuiet<=WINDOW&&near(hold.region,x.hotspot)){state='RETURN_CANDIDATE';reason='Tracked change returned near held region; identity not established'}
 else {state='TRACKED';reason='Coherent region-change track observed'}
 anchor={region:x.hotspot,frame:x.frame,source:x.id};hold=null
}
else if(x.status==='QUIET'){
 if(anchor&&!hold)hold={region:anchor.region,firstQuiet:x.frame,source:anchor.source};
 if(hold&&x.frame-hold.firstQuiet<=WINDOW){remaining=WINDOW-(x.frame-hold.firstQuiet);state='HELD';reason='Short absence preserved for bounded reappearance check'}
 else if(hold){state='EXPIRED';reason='Unseen motion hypothesis exceeded 6 emulator frames';hold=null;anchor=null}
}
else if(hold){
 if(x.frame-hold.firstQuiet>WINDOW){state='EXPIRED';reason='Reappearance arrived after permitted window';hold=null;anchor=null}
 else if(Number.isInteger(x.hotspot)&&near(hold.region,x.hotspot)){state='RETURN_CANDIDATE';reason='Nearby regional change after absence; identity still unverified';anchor={region:x.hotspot,frame:x.frame,source:x.id};hold=null}
 else {state='INVALIDATED';reason='Region change conflicts with held motion location';anchor=null;hold=null}
}
else if(x.status==='STATIONARY'){state='STATIONARY';reason='Region change stationary; do not invent an object identity';anchor=null}
const row={id:x.id,root:x.root,frame:x.frame,status:state,observedStatus:x.status,region:Number.isInteger(x.hotspot)?x.hotspot:null,heldRegion:hold?.region??null,remainingFrames:remaining,lastConfirmedSource:anchor?.source??null,sourceHash:x.sourceHash||null,reason,identity:'UNVERIFIED',confidence:'HYPOTHESIS_ONLY',semantic:'UNLABELED',reward:false,controllerAuthority:false};
history.push(row);seen.add(row.id);if(history.length>MAX)seen.delete(history.shift().id);return copy(row)}
return {observe,state:()=>copy({latest:history.at(-1)||null,history,hold:hold?{...hold}:null})}}
g.JaneObjectPermanence={create};})(typeof window==='undefined'?globalThis:window);