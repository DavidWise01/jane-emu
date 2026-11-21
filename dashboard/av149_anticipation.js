/* AV-149 Neural Anticipatory Regulation. Measured AV-131 simulated-credit rates,
   three 48-frame future sandbox forks. Advisory; never changes live NES controls. */
(function(g){'use strict';const N=['JANE','TOPH','PATRICIA'],copy=x=>JSON.parse(JSON.stringify(x));
function create(){let last=null,samples=[],latest=null;
function observe(p,m){if(!p?.root||!p.rom||!Number.isSafeInteger(p.frame)||!N.includes(p.actor)||!m?.banks)return false;
const scope=JSON.stringify([p.root,p.rom]),row={scope,frame:p.frame,banks:{}};
for(const n of N){const b=m.banks[n];if(!b||!['energy','spent','recovered'].every(k=>Number.isSafeInteger(b[k])&&b[k]>=0))return false;row.banks[n]={energy:b.energy,spent:b.spent,recovered:b.recovered}}
if(last?.scope!==scope){last=row;samples=[];return true}
if(p.frame<=last.frame)return false;
const dt=p.frame-last.frame;if(dt>720){samples=[];last=row;return true}
const rates={},valid=N.every(n=>{const a=row.banks[n],b=last.banks[n],spent=a.spent-b.spent,recovery=a.recovered-b.recovered;if(spent<0||recovery<0)return false;rates[n]={spent,recovery};return true});
if(valid){samples.push({scope,dt,rates});if(samples.length>12)samples.shift()}else samples=[];last=row;return true}
function assess(p,m,allostasis){if(!p?.root||!p.rom||!N.includes(p.actor)||!Number.isSafeInteger(p.frame)||!m?.banks||!Number.isSafeInteger(m.reserve)||!allostasis||allostasis.root!==p.root||allostasis.rom!==p.rom||allostasis.frame!==p.frame){latest={state:'WAIT',allow:false,reason:'No synchronized budget context'};return copy(latest)}
const scope=JSON.stringify([p.root,p.rom]),window=samples.filter(x=>x.scope===scope),frames=window.reduce((n,x)=>n+x.dt,0),calibrated=last?.scope===scope&&frames>=120,watchers=N.filter(n=>n!==p.actor).map(n=>{const b=m.banks[n],valid=Number.isSafeInteger(b?.energy),spent=window.reduce((sum,x)=>sum+x.rates[n].spent,0),recovered=window.reduce((sum,x)=>sum+x.rates[n].recovery,0),net=calibrated&&valid?Math.max(0,(spent-recovered)/frames):null,projected=net===null?null:Math.floor(b.energy-3*480-144*net);return {name:n,energy:valid?b.energy:null,spentPerFrame:frames?spent/frames:null,recoveredPerFrame:frames?recovered/frames:null,projected,margin:projected===null?null:projected-m.reserve}});
const margin=watchers.every(x=>x.margin!==null)?Math.min(...watchers.map(x=>x.margin)):null;
let state='CALIBRATING',reason='120 measured emulator frames required',allow=false;if(allostasis.state!=='READY'){state='BLOCKED';reason='AV-148 preflight not ready'}else if(calibrated&&margin!==null){if(margin>=0){state='SUSTAINABLE';reason='Three future sandbox forks fit observed net credit rate';allow=true}else{state='CONSERVE';reason='Three-fork runway threatens mandatory reserve'}}
latest={root:p.root,rom:p.rom,actor:p.actor,frame:p.frame,state,allow,reason,watchers,margin,observationFrames:frames,samples:window.length,horizonForks:3,horizonFrames:144,unit:'simulated credits',policy:'observation-derived estimate, AV-131 reserve remains authoritative'};return copy(latest)}
return {observe,assess,state:()=>copy({latest,observationFrames:samples.reduce((n,x)=>n+x.dt,0),samples:samples.length})}}
g.JaneAnticipation={create};})(typeof window==='undefined'?globalThis:window);