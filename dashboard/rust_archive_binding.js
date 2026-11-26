(()=>{'use strict';
const legacy='jane.rust.archive.v1.',prefix='jane.rust.archive.v2.',api=window.JaneAV284;
let busy=false,blocked=false,scope=null,committed=0,head=null,prior=null,lastRaw=null;
let state={kind:'STANDBY',archived:0,authenticated:false,format:2};
window.JANE_RUST_ARCHIVE=()=>({...state});
const base=key=>prefix+encodeURIComponent(key)+'.';
async function update(e){
 if(busy||blocked||!e.detail?.live)return;
 const k=window.JANE_RUST_KERNEL,r=window.JANE_RUN_CONTEXT?.(),m=window.JANE_RUST_MEMORY?.();
 if(!k||!r?.root||!r.rom||m?.kind!=='OBSERVING'||!crypto.subtle)return;
 const key=JSON.stringify([r.root,r.rom]);
 if(scope!==null&&scope!==key){blocked=true;state={...state,kind:'SCOPE_CHANGED'};return}
 scope=key;const count=k.memory_generations();if(count<=committed)return;
 busy=true;
 try{
  // No unsafe fallback: Web Locks serializes cooperating same-origin writers.
  if(!navigator.locks?.request)throw Error('Web Locks unavailable');
  await navigator.locks.request(base(key),{mode:'exclusive'},async()=>{
   const b=base(key),target=b+committed;
   if(localStorage.getItem(legacy+encodeURIComponent(key))!==null)throw Error('legacy scope exists; no automatic migration');
   if(committed>0&&localStorage.getItem(b+(committed-1))!==lastRaw)throw Error('previous segment changed');
   if(localStorage.getItem(target)!==null)throw Error('segment exists; no overwrite');
   const g=api.extract(k,committed),raw=await api.sealSegment([r.root,r.rom],g,head,prior,k,crypto.subtle);
   const live=window.JANE_RUN_CONTEXT?.();
   if(JSON.stringify([live?.root,live?.rom])!==key)throw Error('scope changed during seal');
   if(localStorage.getItem(target)!==null||committed>0&&localStorage.getItem(b+(committed-1))!==lastRaw)throw Error('concurrent modification');
   localStorage.setItem(target,raw);
   if(localStorage.getItem(target)!==raw)throw Error('write readback mismatch');
   lastRaw=raw;head=JSON.parse(raw).digest;prior=g.rows.at(-1);committed++;
   state={kind:'ARCHIVED',archived:committed,authenticated:false,format:2,head};
  });
 }catch(err){blocked=true;state={...state,kind:'HOLD',error:String(err)}}finally{busy=false}
}
window.addEventListener('jane-av240-signal',update);
window.JANE_RUST_ARCHIVE_READ=async()=>{
 const k=window.JANE_RUST_KERNEL;if(!k||!crypto.subtle)return [];
 const out=[],groups=new Map();
 for(let i=0;i<localStorage.length;i++){
  const key=localStorage.key(i);
  if(key?.startsWith(legacy)){try{const p=await api.open(localStorage.getItem(key),k,crypto.subtle);if(key!==legacy+encodeURIComponent(JSON.stringify(p.scope)))throw Error('scope mismatch');out.push(p)}catch(e){out.push({kind:'INVALID_ARCHIVE',key})}}
  else if(key?.startsWith(prefix)){const dot=key.lastIndexOf('.'),b=key.slice(0,dot+1),suffix=key.slice(dot+1);if(!groups.has(b))groups.set(b,[]);groups.get(b).push({suffix,raw:localStorage.getItem(key)});}
 }
 for(const [b,entries] of groups){try{
  const s=JSON.parse(decodeURIComponent(b.slice(prefix.length,-1)));
  entries.sort((a,b)=>Number(a.suffix)-Number(b.suffix));
  if(entries.some((e,i)=>e.suffix!==String(i)))throw Error('gap or invalid index');
  out.push(await api.auditSegments(entries.map(e=>e.raw),s,k,crypto.subtle));
 }catch(e){out.push({kind:'INVALID_ARCHIVE',key:b,error:String(e)})}}
 return out;
};
})();