(function(g,f){const api=f();if(typeof module==='object'&&module.exports)module.exports=api;else g.JaneAV328=api;})(globalThis,function(){'use strict';
function create(){let enabled=false,epoch=0,rows=new Map(),ids=new WeakMap(),next=0;const cap=32;
function enable(v){enabled=v===true;epoch++;rows=new Map();ids=new WeakMap();next=0}
function begin(cb,now){if(!enabled||typeof cb!=='function'||!Number.isFinite(now))return null;let id=ids.get(cb);if(id===undefined){if(next>=cap)id='overflow';else{id=String(next++);ids.set(cb,id)}}let row=rows.get(id);if(!row){row={id,name:id==='overflow'?'OVERFLOW':String(cb.name||'anonymous').slice(0,80),calls:0,workMs:0,maxMs:0,invalid:0};rows.set(id,row)}return {id,now,epoch}}
function end(token,now){if(!token||!enabled||token.epoch!==epoch)return false;const row=rows.get(token.id);if(!row)return false;if(!Number.isFinite(now)||now<token.now){row.invalid++;return false}const d=now-token.now;row.calls++;row.workMs+=d;row.maxMs=Math.max(row.maxMs,d);return true}
return {enable,begin,end,status:()=>({enabled,cap,rows:[...rows.values()].map(x=>({...x})),note:'Callback identity within probe epoch; names diagnostic only, overflow not attributed.'})}}
return {create};});
