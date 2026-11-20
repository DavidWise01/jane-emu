/* AV-133: advisory neural maintenance; no controller or evidence mutations. */
(function(g){'use strict';
const names=['JANE','TOPH','PATRICIA'],copy=x=>JSON.parse(JSON.stringify(x));
function create(seed=[]){let scope='',last=-1,queue=[],history=Array.isArray(seed)?seed.filter(x=>x&&typeof x.id==='string'):[],seen=new Set(history.map(x=>x.id)),status='WAIT';
function tick(p,c,s,e,h){if(!p?.root||!p.rom||!names.includes(p.actor)||!Number.isSafeInteger(p.frame)||c?.frame!==p.frame||c.active!==p.actor)return false;
const k=JSON.stringify([p.root,p.rom]);if(scope!==k){scope=k;last=-1;queue=[]}if(p.frame<=last||p.frame%120!==0)return false;last=p.frame;
if(c.busy||![1,2].includes(c.phase)||!names.filter(n=>n!==p.actor).every(n=>c.states[n]?.mode==='WATCH')){status='DEFERRED';return false}
const groups=new Map(),labels=new Map();for(const x of e||[])if(x.kind==='LABEL'){if(!labels.has(x.action))labels.set(x.action,new Set());labels.get(x.action).add(x.outcome)}
for(const x of e||[])if(x.kind==='ACTION'&&x.rom===p.rom){const id=JSON.stringify([x.rom,x.actor,x.hash,x.button]);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(x)}
const candidates=[];for(const [id,rows] of groups){const bad=rows.filter(x=>labels.get(x.id)?.has('FAILURE')).length,good=rows.filter(x=>labels.get(x.id)?.has('SUCCESS')&&!labels.get(x.id)?.has('FAILURE')).length,weight=(good+1)/(good+bad+2),current=rows.filter(x=>x.root===p.root),age=current.length?p.frame-Math.max(...current.map(x=>x.end)):null;const reason=bad&&weight<.5?'WEAK':age!==null&&age>=600?'INACTIVE':!current.length?'UNSEEN_THIS_RUN':null;if(reason)candidates.push({key:id,reason,button:rows[0].button,sourceActor:rows[0].actor,weight,evidence:rows.map(x=>x.id)})}
for(const x of h||[])if(x.rom===p.rom&&x.status!=='PERSISTENT')candidates.push({key:x.key,reason:'HYPOTHESIS_REVIEW',button:x.button,evidence:x.evidence||[]});
const priority={WEAK:0,HYPOTHESIS_REVIEW:1,INACTIVE:2,UNSEEN_THIS_RUN:3};queue=candidates.sort((a,b)=>priority[a.reason]-priority[b.reason]||a.key.localeCompare(b.key));
const watchers=names.filter(n=>n!==p.actor);const tasks=queue.filter(x=>!seen.has(JSON.stringify([scope,x.key,x.reason]))).slice(0,2);
for(let i=0;i<tasks.length;i++){const x=tasks[i],id=JSON.stringify([scope,x.key,x.reason]);seen.add(id);history.push({...x,id,root:p.root,rom:p.rom,frame:p.frame,watcher:watchers[i],state:'REVIEW_REQUIRED'})}status=tasks.length?'REVIEW SCHEDULED':'NO NEW REVIEW';return tasks.length>0}
return {tick,state:()=>copy({status,queue,history})}}
g.JaneAutopoiesis={create};})(typeof window==='undefined'?globalThis:window);