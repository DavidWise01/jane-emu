/* AV-147 Neural Homeorhesis: append-only developmental trajectory.
   Records exactly what the evidence ledger concluded, not invented improvement.
   A newly rejected candidate or loss of prior candidate support prevents new sandbox mutation.
   No live controller inputs are issued by this module. */
(function(g){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),decisions=new Set(['REEXAMINE','RETAIN_CANDIDATE','REJECT_CANDIDATE']);
function create(seed=[]){
  const history=[],ids=new Set(),last=new Map();
  function valid(e){return e&&typeof e.id==='string'&&e.key&&e.rom&&e.hash&&e.goal&&Number.isSafeInteger(e.revision)&&e.revision>=1&&decisions.has(e.decision)}
  for(const x of Array.isArray(seed)?seed:[]){if(!x?.eventId||ids.has(x.eventId)||!x.rom||!x.hash||!x.goal)continue;const row=copy(x);history.push(row);ids.add(row.eventId);const prev=last.get(row.key);if(!prev||prev.revision<row.revision)last.set(row.key,row)}
  let latest=history.at(-1)||null;
  function ingest(events){let count=0;for(const e of events||[]){if(!valid(e)||ids.has(e.id))continue;const prior=last.get(e.key);if(prior&&e.revision<=prior.revision)continue;
    const regression=e.decision==='REJECT_CANDIDATE'||(prior?.decision==='RETAIN_CANDIDATE'&&e.decision!=='RETAIN_CANDIDATE');
    const transition=regression?'RESISTANCE':e.decision==='RETAIN_CANDIDATE'?(prior?.decision==='RETAIN_CANDIDATE'?'PERSISTING':'CANDIDATE_SUPPORTED'):'OBSERVING';
    const row={eventId:e.id,key:e.key,rom:e.rom,hash:e.hash,goal:e.goal,revision:e.revision,decision:e.decision,transition,previousId:prior?.eventId||null,initialId:prior?.initialId||e.id,rootCount:Array.isArray(e.roots)?new Set(e.roots).size:0,trialCount:Array.isArray(e.evidence)?new Set(e.evidence).size:0,sourceAncestry:e.sourceAncestry||'shared agent pool',automaticPromotion:false};
    history.push(row);ids.add(row.eventId);last.set(row.key,row);latest=row;count++;
  }return count}
  function assess(rom,hash,goal){if(!rom||!hash||!goal)return {status:'UNPROVEN',allow:true,reason:'No exact scope'};
    const rows=[...last.values()].filter(x=>x.rom===rom&&x.hash===hash&&x.goal===goal),resistance=rows.filter(x=>x.transition==='RESISTANCE'),supported=rows.filter(x=>x.decision==='RETAIN_CANDIDATE'),stable=rows.filter(x=>x.transition==='PERSISTING');
    const status=resistance.length?'RESISTANCE':supported.length?'ADVANCING':rows.length?'STABLE':'UNPROVEN';
    const reason=resistance.length?'Prior candidate support lost or rejected; maintain original and require reassessment':supported.length?'Candidate evidence supported; original remains preserved':rows.length?'Monitoring unchanged or inconclusive conclusions':'No developmental checkpoints available';
    return copy({rom,hash,goal,status,allow:status!=='RESISTANCE',reason,checkpoints:rows.length,supported:supported.length,stable:stable.length,resistance:resistance.length,roots:Math.max(0,...rows.map(x=>x.rootCount)),policy:'observe trajectory only; no automatic candidate promotion; freeze experimental mutation on regression'})
  }
  return {ingest,assess,state:()=>copy({latest,history})}
}
g.JaneHomeorhesis={create};})(typeof window==='undefined'?globalThis:window);