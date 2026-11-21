/* AV-171 — Confidence-Weighted Recovery (read-only).
 * Preregistered fixed 16-root evaluation. One first valid RECOVERY_TRIAL per
 * distinct, non-excluded root in the latest EPOCH_START; no optional stopping.
 * Exact one-sided 95% binomial lower bound on strictly positive gain frequency,
 * under independent comparable Bernoulli-root assumptions. This is NOT a
 * bound on gain magnitude or a claim of causal transfer.
 * Recovery only if AV-170 stable, zero adverse roots, 16-root cohort completed,
 * mean gain >= .25, and p_lower > .75. No controller/action/reward promotion.
 */
(function(g){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),N=16,ALPHA=.05,THRESHOLD=.75;
function valid(x){return x?.id&&x.root&&x.rom&&Number.isSafeInteger(x.frame)&&x.frame>=0&&(x.kind==='EPOCH_START'&&Array.isArray(x.excludedRoots)||x.kind==='RECOVERY_TRIAL'&&Number.isFinite(x.gain))}
function binomialTail(k,n,p){let sum=0;for(let j=k;j<=n;j++){let comb=1;for(let i=1;i<=j;i++)comb=comb*(n-i+1)/i;sum+=comb*Math.pow(p,j)*Math.pow(1-p,n-j)}return sum}
function lower(wins,n){if(!wins||!n)return 0;let lo=0,hi=1;for(let i=0;i<64;i++){const mid=(lo+hi)/2;if(binomialTail(wins,n,mid)>=ALPHA)hi=mid;else lo=mid}return (lo+hi)/2}
function create(seed=[]){const journal=[],ids=new Set();for(const x of Array.isArray(seed)?seed:[]){if(valid(x)&&!ids.has(x.id)){journal.push(clone(x));ids.add(x.id)}}
function ingest(x){if(!valid(x)||ids.has(x.id))return null;const r=clone(x);journal.push(r);ids.add(r.id);return {event:r,assessment:assess(r.rom)}}
function assess(rom,stability){let epoch=null;for(const x of journal){if(x.rom!==rom)continue;if(x.kind==='EPOCH_START'){epoch={root:x.root,frame:x.frame,id:x.id,excluded:new Set(x.excludedRoots),samples:new Map()};continue}
if(!epoch||x.kind!=='RECOVERY_TRIAL'||epoch.excluded.has(x.root)||x.frame<=epoch.frame||epoch.samples.has(x.root)||epoch.samples.size>=N)continue;
epoch.samples.set(x.root,{root:x.root,frame:x.frame,gain:x.gain,positive:x.gain>0})}
if(!epoch)return clone({rom,status:'NO_EPOCH',roots:0,required:N,lowerBound:null,confidence:0.95,advisoryOnly:true});
const samples=[...epoch.samples.values()],n=samples.length,wins=samples.filter(x=>x.positive).length,losses=samples.filter(x=>x.gain<0).length,ties=n-wins-losses,average=n?samples.reduce((a,x)=>a+x.gain,0)/n:null,lb=n?lower(wins,n):null,fixedComplete=n===N;
const stable=stability?.rom===rom&&stability.phase==='STABLE_ADVISORY'&&stability.adverseRoots===0;
const supported=fixedComplete&&stable&&losses===0&&average>=.25&&lb>THRESHOLD;
return clone({rom,epoch:epoch.id,status:!fixedComplete?'COLLECTING':supported?'CONFIDENCE_SUPPORTED':'WITHHELD',roots:n,required:N,wins,losses,ties,meanGain:average,lowerBound:lb,threshold:THRESHOLD,confidence:0.95,stable,fixedComplete,advisoryOnly:true,autoPromotion:false,controllerAuthority:false,reason:!fixedComplete?'Fixed 16 distinct roots required; interim intervals are descriptive':!stable?'AV-170 stability evidence missing or contradictory':losses?'A contradictory root defeats the conservative gate':average<.25?'Mean improvement below minimum':lb<=THRESHOLD?'95% lower bound does not exceed 75%':'Exploratory independent-root success bound passed; no controller authority'})}
return {ingest,assess,state:()=>clone({journal,latest:journal.at(-1)||null})}}
g.JaneConfidenceRecovery={create};})(typeof window==='undefined'?globalThis:window);