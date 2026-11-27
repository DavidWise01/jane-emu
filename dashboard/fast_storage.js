(function(g,f){const api=f();if(typeof module==='object'&&module.exports)module.exports=api;else g.JaneAV292=api;})(globalThis,function(){'use strict';
function create(write,clock=()=>performance.now()){
 const jobs=new Map();let stats={queued:0,coalesced:0,written:0,failed:0},enabled=false;
 const fresh=()=>({attempts:0,serializeMs:0,writeMs:0,maxWriteMs:0,codeUnits:0});let profile=fresh();
 return {queue(key,read,onError){stats.queued++;if(jobs.has(key))stats.coalesced++;jobs.set(key,{read,onError})},
 flush(limit=1){for(const [key,job] of jobs){if(limit--<=0)break;jobs.delete(key);try{
 if(!enabled){write(key,JSON.stringify(job.read()));}
 else{profile.attempts++;let t=clock(),raw;try{raw=JSON.stringify(job.read());}finally{profile.serializeMs+=Math.max(0,clock()-t)}profile.codeUnits+=typeof raw==='string'?raw.length:0;t=clock();try{write(key,raw)}finally{const d=Math.max(0,clock()-t);profile.writeMs+=d;profile.maxWriteMs=Math.max(profile.maxWriteMs,d)}}
 stats.written++;}catch(e){stats.failed++;job.onError?.(e)}}},
 snapshot(){return {...stats,pending:jobs.size}},
 enableProfile(v){enabled=v===true;profile=fresh()},
 profile(){return {enabled,...profile}}};
}
return {create};});
