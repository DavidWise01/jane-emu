(function(g,f){const api=f();if(typeof module==='object'&&module.exports)module.exports=api;else g.JaneAV321=api;})(globalThis,function(){'use strict';
function create(){
 let active=false, since=0, previous=null;
 const fresh=()=>({tasks:0,taskMs:0,blockingMs:0,maxTaskMs:0,self:0,descendant:0,other:0,invalid:0,timers:0,latenessMs:0,maxLatenessMs:0,late50:0,late100:0});
 let s=fresh();
 function enable(v,now){active=v===true;since=now;previous=null;s=fresh();}
 function ingest(e){if(!active)return false;const t=e?.startTime,d=e?.duration;if(!Number.isFinite(t)||!Number.isFinite(d)||d<50){s.invalid++;return false;}if(t<since)return false;s.tasks++;s.taskMs+=d;s.blockingMs+=d-50;s.maxTaskMs=Math.max(s.maxTaskMs,d);const n=e.name;s[n==='self'?'self':n==='same-origin-descendant'?'descendant':'other']++;return true;}
 function timer(now,period){if(!active)return false;if(!Number.isFinite(now)||!Number.isFinite(period)||period<=0||previous!==null&&now<previous){s.invalid++;previous=null;return false;}if(previous!==null){const late=Math.max(0,now-previous-period);s.timers++;s.latenessMs+=late;s.maxLatenessMs=Math.max(s.maxLatenessMs,late);if(late>=50)s.late50++;if(late>=100)s.late100++;}previous=now;return true;}
 return {enable,ingest,timer,status:()=>({active,...s})};
}
return {create};});
