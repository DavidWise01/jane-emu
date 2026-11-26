'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const mime={'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json;charset=utf-8'};
function server(){return http.createServer((req,res)=>{
 const uri=decodeURIComponent((req.url||'/').split('?')[0]);
 const target=path.resolve(ROOT,'.'+(uri==='/'?'/index.html':uri));
 if(!target.startsWith(ROOT+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(target,(err,data)=>{
  if(err){res.writeHead(404);return res.end('not found');}
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});res.end(data);
 });
});}

async function main(){
 const srv=server();await new Promise(r=>srv.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+srv.address().port+'/dashboard/arena.html');
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('cabinet ready'),null,{timeout:60000});
 await page.locator('#av201-demo').click();await page.waitForFunction(()=>window.JANE_RUN_CONTEXT?.().rom==='0b10970a'&&window.JANE_RUN_CONTEXT().frame>30,null,{timeout:60000});
 await page.getByLabel('EXPERIMENTAL 4× ADAPTIVE BUDGET').check();await page.getByLabel('EXPERIMENTAL 4× FRAME-SYNC PERCEPTION').check();await page.getByLabel('SKIP HIDDEN MONITOR PAINTS AT 4×+').check();await page.locator('#speed').selectOption('4');
 const snap=()=>page.evaluate(()=>({r:window.JANE_RUN_CONTEXT(),now:performance.now(),controller:window.JANE_AV291_STATUS().counts,budget:window.JANE_AV298_STATUS(),sync:window.JANE_AV300_STATUS(),clock:window.JANE_AV297_STATUS()[4]||{},memo:window.JANE_AV308_STATUS(),paint:window.JANE_AV307_STATUS(),parity:window.JANE_RUST_PARITY(),cycles:window.JANE_AV201_MONITOR?.snapshot?.().cycles?.length||0}));
 const start=await snap(),windows=[];let prev=start;for(let i=0;i<10;i++){await page.waitForFunction(f=>window.JANE_RUN_CONTEXT().frame>=f+360,prev.r.frame,{timeout:60000});const end=await snap();assert.equal(end.r.root,start.r.root);assert.equal(end.r.rom,start.r.rom);const frames=end.r.frame-prev.r.frame,ms=end.now-prev.now;assert.ok(frames>=360&&ms>0);windows.push({fps:frames*1000/ms,frames,ms,actor:end.r.actor,completion:end.controller.completion-prev.controller.completion,budget:end.budget.budget,captures:end.sync.accepted-prev.sync.accepted});prev=end;}
 const diff=(a,b,keys)=>Object.fromEntries(keys.map(k=>[k,(b[k]||0)-(a[k]||0)]));const fps=(prev.r.frame-start.r.frame)*1000/(prev.now-start.now),memo=diff(start.memo,prev.memo,['hits','misses','evictions']),paint=diff(start.paint,prev.paint,['calls','skipped','executed','workMs']),clock=diff(start.clock,prev.clock,['intervals','frames','elapsedMs','frameWorkMs','unmeasuredMs']),controller=diff(start.controller,prev.controller,['dispatch','completion','unmatched','abandoned']);const gates={continuity:windows.every(w=>w.completion>0),rust:prev.budget.parity.calls>start.budget.parity.calls&&prev.budget.parity.mismatches===0&&prev.parity.authority==='RUST_GUARDED',sync:prev.sync.accepted>start.sync.accepted,cache:prev.memo.size<=128&&memo.hits+memo.misses>0,paint:paint.calls===paint.skipped+paint.executed,layout:await page.locator('iframe').count()===1&&await page.locator('#av186-three-tools button[role="tab"]').count()===3,errors:errors.length===0,throughput:fps>=216&&windows.every(w=>w.fps>=192),rotation:prev.cycles>start.cycles};
 console.log(JSON.stringify({kind:'AV309R_4X_QUALIFICATION',fps,windows,gates,memo,paint,clock,controller,cycles:prev.cycles-start.cycles,operational:Object.values(gates).every(Boolean)?'PASS':'HOLD',thresholds:{overall:216,perWindow:192},manualControllerInput:false,errors}));for(const [key,value] of Object.entries(gates))assert.equal(value,true,key);
 }finally{await browser.close();await new Promise(r=>srv.close(r));}}
main().catch(e=>{console.error(e);process.exitCode=1});
