/* AV-148 Neural Allostasis — preflight simulated-credit forecasting.
 * No physical energy inference. Never changes live controller or metabolic accounting.
 * More conservative than AV-131 reserve; existing metabolic gate remains authoritative. */
(function(g){'use strict';const copy=x=>JSON.parse(JSON.stringify(x)),names=['JANE','TOPH','PATRICIA'],FORK=480;
function create(){let latest=null;function assess(p,metabolic,critical,trajectory){
if(!p?.root||!p.rom||!names.includes(p.actor)||!Number.isSafeInteger(p.frame)||!metabolic?.banks||!Number.isSafeInteger(metabolic.reserve)){latest={state:'WAIT',allow:false,reason:'Missing exact emulator or credit state'};return copy(latest)}
const watchers=names.filter(n=>n!==p.actor),reserve=metabolic.reserve,observed=watchers.map(name=>{const bank=metabolic.banks[name],energy=bank?.energy;return {name,energy:Number.isSafeInteger(energy)?energy:null,remaining:Number.isSafeInteger(energy)?energy-FORK:null}});
const hardDenied=observed.some(b=>b.remaining===null||b.remaining<reserve),outstanding=Number.isSafeInteger(metabolic.reserved)?metabolic.reserved:0;
const minimum=Math.min(...observed.map(x=>x.remaining??-Infinity)),headroom=minimum-reserve;
const volatile=critical?.state==='VOLATILE'||trajectory?.status==='RESISTANCE',productive=critical?.state==='PRODUCTIVE'&&critical.permit===true;
let state='OBSERVE',reason='Await productive, evidence-qualified learning window',allow=false;
if(volatile){state='PROTECT';reason='Criticality or developmental regression protects experiment reserve'}
else if(hardDenied){state='RECOVER';reason='Watcher credits would breach mandatory 20% floor'}
else if(outstanding>0){state='HOLD';reason='An isolated fork already has an outstanding reservation'}
else if(productive&&headroom>=FORK){state='READY';reason='One isolated fork affordable with 480-credit extra headroom';allow=true}
else if(productive){state='CONSERVE';reason='Hard reserve safe, but insufficient buffer for another experimental cycle'}
latest={root:p.root,rom:p.rom,actor:p.actor,frame:p.frame,state,allow,reason,headroom,minimum,watchers:observed,hardReserve:reserve,forkCost:FORK,outstanding,critical:critical?.state||'WAIT',trajectory:trajectory?.status||'UNPROVEN',unit:'simulated credits',policy:'preflight sandbox budget only; AV-131 reserve remains final authority'};
return copy(latest)}
return {assess,state:()=>copy({latest})}}
g.JaneAllostasis={create};})(typeof window==='undefined'?globalThis:window);