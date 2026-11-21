/* AV-146 Neural Criticality: deterministic bounded evidence-pressure monitor.
 * This is a software control heuristic, not a neuroscience measurement.
 * Only restricts isolated plasticity; never presses NES controls.
 */
(function(g){'use strict';const copy=x=>JSON.parse(JSON.stringify(x));const valid=p=>p?.root&&p.rom&&p.hash&&Number.isSafeInteger(p.frame)&&p.frame>=0;
function create(){let latest=null;function assess(p,learning,revisions,resonance){if(!valid(p)||!learning||learning.rom!==p.rom||learning.hash!==p.hash||learning.root!==p.root){latest={state:'WAIT',permit:false,reason:'No aligned evidence packet'};return copy(latest)}
const rows=(resonance||[]).filter(x=>x.rom===p.rom&&x.hash===p.hash&&x.frame<=p.frame&&x.frame>=p.frame-3600&&x.root===p.root),roots=new Set(rows.map(x=>x.root)),conflicts=rows.filter(x=>x.status==='DISSONANT').length,agreements=rows.filter(x=>x.status==='RESONANT').length,partials=rows.filter(x=>x.status==='PARTIAL').length;
const recent=(revisions||[]).filter(x=>x.rom===p.rom&&x.hash===p.hash&&x.goal===learning.goal),current=new Map();for(const r of recent)if(!current.has(r.key)||r.revision>current.get(r.key).revision)current.set(r.key,r);
const reconsidered=[...current.values()].filter(x=>x.state==='RECONSIDERED'||x.decision==='REJECT_CANDIDATE').length;
let state='QUIET',reason='Not enough supported recent observations',permit=false;
if(learning.status==='FREEZE'||reconsidered||conflicts>=2){state='VOLATILE';reason='Resistance or re-evaluation requires observation-only'}
else if(learning.status==='PERMIT'&&agreements>=2&&conflicts===0&&partials<=agreements){state='PRODUCTIVE';reason='Repeated agreement supports one bounded sandbox mutation';permit=true}
else if(learning.status==='PERMIT'){state='QUIET';reason='Ready pathway, but insufficient recent support for an exploratory fork'}
else if(rows.length>0){state='QUIET';reason='Observe more before increasing exploration'}
latest={root:p.root,rom:p.rom,hash:p.hash,frame:p.frame,state,permit,reason,agreements,conflicts,partials,reconsidered,observations:rows.length,roots:roots.size,policy:'additional sandbox-only brake; no action override or automatic promotion'};return copy(latest)}
return {assess,state:()=>copy({latest})}}g.JaneCriticality={create};})(typeof window==='undefined'?globalThis:window);