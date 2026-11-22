/* AV-172 — Confidence Under Distribution Shift.
 * ROM is the cartridge context, motionSignature is an observable direction pair,
 * NOT a verified scene or game-mechanics identity.
 * Fixed first 16 fresh roots per epoch = calibration (AV-171).
 * Subsequent first 16 DIFFERENT-root outcomes with signature absent from
 * calibration = shifted challenge cohort. Seen signatures cannot fill it.
 * Unknown signatures never count as demonstrated distribution shift.
 * Exact one-sided 95% binomial lower bound tests positive paired gain frequency;
 * decision threshold 0.75. No optional stopping; no root counted twice.
 * Both AV-171 confidence support AND AV-170 stability required. Regressions
 * revoke advisory. No automatic model promotion, reward or NES control change.
 */
(function(g){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),N=16,ALPHA=.05,THRESH=.75;
const valid=x=>x?.id&&x.rom&&x.root&&Number.isSafeInteger(x.frame)&&x.frame>=0&&(x.kind==='EPOCH_START'&&Array.isArray(x.excludedRoots)||x.kind==='RECOVERY_TRIAL'&&Number.isFinite(x.gain));
function tail(k,n,p){let s=0;for(let j=k;j<=n;j++){let c=1;for(let t=1;t<=j;t++)c=c*(n-t+1)/t;s+=c*p**j*(1-p)**(n-j)}return s}
function lower(k,n){if(!k||!n)return 0;let lo=0,hi=1;for(let t=0;t<64;t++){const mid=(lo+hi)/2;if(tail(k,n,mid)>=ALPHA)hi=mid;else lo=mid}return (lo+hi)/2}
function create(seed=[]){const history=[],ids=new Set();for(const x of Array.isArray(seed)?seed:[]){if(valid(x)&&!ids.has(x.id)){history.push(cp(x));ids.add(x.id)}}
function ingest(e){if(!valid(e)||ids.has(e.id))return null;const row=cp(e);history.push(row);ids.add(row.id);return {event:row,assessment:assess(row.rom)}}
function assess(rom,confidence=null,stability=null){let epoch=null;for(const r of history){if(r.rom!==rom)continue;if(r.kind==='EPOCH_START'){epoch={id:r.id,frame:r.frame,excluded:new Set(r.excludedRoots),used:new Set(),calibration:[],shifted:[],familiar:[],unknown:[],signatures:new Set()};continue}
if(!epoch||r.kind!=='RECOVERY_TRIAL'||epoch.excluded.has(r.root)||epoch.used.has(r.root)||r.frame<=epoch.frame)continue;
epoch.used.add(r.root);const signature=typeof r.motionSignature==='string'&&/^-?[01],-?[01]$/.test(r.motionSignature)?r.motionSignature:null;
const point={root:r.root,frame:r.frame,gain:r.gain,signature};
if(epoch.calibration.length<N){epoch.calibration.push(point);if(signature!==null)epoch.signatures.add(signature)}
else if(signature===null)epoch.unknown.push(point);
else if(epoch.signatures.has(signature))epoch.familiar.push(point);
else if(epoch.shifted.length<N)epoch.shifted.push(point);
}}
if(!epoch)return cp({rom,status:'NO_EPOCH',calibrationRoots:0,shiftRoots:0,required:N,shiftLower:null,advisoryOnly:true});
const n=epoch.shifted.length,wins=epoch.shifted.filter(x=>x.gain>0).length,losses=epoch.shifted.filter(x=>x.gain<0).length,avg=n?epoch.shifted.reduce((s,x)=>s+x.gain,0)/n:null,lb=n?lower(wins,n):null;
const baselineConfirmed=confidence?.rom===rom&&confidence.status==='CONFIDENCE_SUPPORTED';
const stable=stability?.rom===rom&&stability.phase==='STABLE_ADVISORY'&&stability.adverseRoots===0;
const complete=epoch.calibration.length===N&&n===N;
const supported=complete&&baselineConfirmed&&stable&&losses===0&&avg>=.25&&lb>THRESH;
const status=epoch.calibration.length<N?'CALIBRATING':n<N?'SHIFT_TESTING':supported?'SHIFT_SUPPORTED':'SHIFT_WITHHELD';
return cp({rom,epoch:epoch.id,status,calibrationRoots:epoch.calibration.length,calibrationSignatures:[...epoch.signatures].sort(),shiftRoots:n,familiarRoots:epoch.familiar.length,unknownRoots:epoch.unknown.length,required:N,wins,losses,meanShiftGain:avg,shiftLower:lb,threshold:THRESH,confidence:0.95,baselineConfirmed,stable,complete,advisoryOnly:true,autoPromotion:false,controllerAuthority:false,reason:epoch.calibration.length<N?'Calibration cohort still incomplete':n<N?'Require 16 independent unfamiliar-signature gameplay roots':!baselineConfirmed?'AV-171 calibration confidence not supported':!stable?'AV-170 stability no longer supported':losses>0?'Negative shift outcomes contradict transfer':avg<.25?'Shift mean gain below minimum':lb<=THRESH?'Shift uncertainty could reverse the decision':'Independent shifted-root evidence meets preregistered advisory criteria'})}
return {ingest,assess,state:()=>cp({history,latest:history.at(-1)||null})}}
g.JaneShiftConfidence={create};})(typeof window==='undefined'?globalThis:window);