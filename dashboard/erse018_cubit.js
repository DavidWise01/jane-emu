/* ERSE-018 computational cubit; evidence checkpoints, not emulator save states. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ERSECubit=api})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
function create({store,now=()=>Date.now()}={}){
let archive=[],hot=[],lanes={JIT:Array(81).fill(null),OTF:Array(81).fill(null),PRE_SIST:Array(81).fill(null)},seq=0,failed=null;
try{const saved=store?.read?.();if(Array.isArray(saved))archive=saved.filter(x=>x&&typeof x.key==='string'&&Number.isSafeInteger(x.seq)).slice(-208);seq=archive.reduce((m,x)=>Math.max(m,x.seq),0)}catch(e){failed=String(e)}
function route(lane,key,value){if(!Object.hasOwn(lanes,lane))throw Error('unknown lane');let h=0;for(const c of key)h=(Math.imul(h,31)+c.charCodeAt(0))>>>0;const slot=h%81;lanes[lane][slot]={key,seq:value?.seq??null};return slot}
function pull(key,lane='JIT'){let item=hot.find(x=>x.key===key),tier='argon';if(!item){item=archive.findLast(x=>x.key===key);tier='lead'}route(lane,key,item);if(!item)return {hit:false,tier:'miss'};hot=[item,...hot.filter(x=>x.key!==key)].slice(0,17);return {hit:true,tier,record:clone(item)}}
function checkpoint(key,payload){if(typeof key!=='string'||!key||!payload||typeof payload!=='object')throw Error('invalid checkpoint');const record={key,seq:seq+1,time:now(),payload:clone(payload)};const next=[...archive,record].slice(-208);try{store?.write?.(next)}catch(e){failed=String(e);return {ok:false,error:failed}}archive=next;seq=record.seq;hot=[record,...hot.filter(x=>x.key!==key)].slice(0,17);route('PRE_SIST',key,record);failed=null;return {ok:true,record:clone(record)}}
function status(){return {argon:hot.length,lead:archive.length,sequence:seq,storage_error:failed,lanes:Object.fromEntries(Object.entries(lanes).map(([k,v])=>[k,v.filter(Boolean).length]))}}
return Object.freeze({pull,checkpoint,status})}
return Object.freeze({create,version:'ERSE-018',capacity:{argon:17,lead:208,lanes:81,interval_ms:3000}})
});