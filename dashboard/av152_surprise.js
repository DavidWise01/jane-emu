/* AV-152 Neural Surprise Regulation.
 * A surprising visual prediction residual deserves ATTENTION, not a reward.
 * Novelty is calibrated against prior distinct live roots in the exact ROM/scene/action scope.
 * All observations retain their individual source ancestry; agent votes never count as independent roots.
 */
(function(g){'use strict';const clone=x=>JSON.parse(JSON.stringify(x)),finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0,scope=x=>JSON.stringify([x.rom,x.hash,x.button]);function median(a){const s=[...a].sort((a,b)=>a-b),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2}
function create(seed=[]){const history=[],ids=new Set();for(const x of Array.isArray(seed)?seed:[]){if(x?.id&&x.root&&x.rom&&x.hash&&x.button&&['UNPROVEN','ROUTINE','SURPRISE'].includes(x.status)&&!ids.has(x.id)){history.push(clone(x));ids.add(x.id)}}while(history.length>208)ids.delete(history.shift().id);let latest=history.at(-1)||null;
function assess(observation,codingHistory){if(!observation?.id||!observation.root||!observation.rom||!observation.hash||!observation.button||observation.status!=='SCORED'||!finite(observation.meanAbsoluteError)||!Number.isSafeInteger(observation.observedFrame)||ids.has(observation.id))return null;
const byRoot=new Map();for(const x of codingHistory||[]){if(x.id===observation.id||x.root===observation.root||scope(x)!==scope(observation)||x.status!=='SCORED'||!finite(x.meanAbsoluteError)||!Number.isSafeInteger(x.observedFrame))continue;const old=byRoot.get(x.root);if(!old||x.observedFrame>old.observedFrame)byRoot.set(x.root,x)}
const roots=[...byRoot],errors=roots.map(([,x])=>x.meanAbsoluteError),calibrated=errors.length>=3;
const center=calibrated?median(errors):null,mad=calibrated?median(errors.map(n=>Math.abs(n-center))):null,threshold=calibrated?center+Math.max(0.05,3*1.4826*mad,center*0.5):null,novel=calibrated&&observation.meanAbsoluteError>threshold;
const row={id:observation.id,root:observation.root,rom:observation.rom,hash:observation.hash,actor:observation.actor,button:observation.button,frame:observation.observedFrame,error:observation.meanAbsoluteError,calibrationRoots:roots.map(([root])=>root),median: center,mad,threshold,status:!calibrated?'UNPROVEN':novel?'SURPRISE':'ROUTINE',attention:novel,goalVerdict:null,learningReward:false,policy:'surprise directs investigation only; neither success nor independent reward'};
history.push(row);ids.add(row.id);if(history.length>208)ids.delete(history.shift().id);latest=row;return clone(row)}
return {assess,state:()=>clone({latest,history})}}
g.JaneSurprise={create};})(typeof window==='undefined'?globalThis:window);