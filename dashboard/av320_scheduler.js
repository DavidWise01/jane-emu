(function(g,f){const api=f();if(typeof module==='object'&&module.exports)module.exports=api;else g.JaneAV320=api;})(globalThis,function(){'use strict';
function create(){
 let enabled=false,prior=null,active=null;
 const fresh=()=>({callbacks:0,intervals:0,intervalMs:0,executionMs:0,gapMs:0,maxIntervalMs:0,maxExecutionMs:0,maxGapMs:0,invalid:0});
 let stats=fresh();
 function enable(v){enabled=v===true;prior=null;active=null;stats=fresh();}
 function begin(now){if(!enabled)return false;if(!Number.isFinite(now)||active!==null||prior&&now<prior.end){stats.invalid++;prior=null;return false;}active=now;if(prior){const interval=now-prior.start,gap=now-prior.end;stats.intervals++;stats.intervalMs+=interval;stats.gapMs+=gap;stats.maxIntervalMs=Math.max(stats.maxIntervalMs,interval);stats.maxGapMs=Math.max(stats.maxGapMs,gap);}return true;}
 function end(now){if(!enabled||active===null)return false;const start=active;active=null;if(!Number.isFinite(now)||now<start){stats.invalid++;prior=null;return false;}const duration=now-start;stats.callbacks++;stats.executionMs+=duration;stats.maxExecutionMs=Math.max(stats.maxExecutionMs,duration);prior={start,end:now};return true;}
 return {enable,begin,end,status:()=>({enabled,...stats})};
}
return {create};});
