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
 try{const results=[];for(const enabled of [false,true,true,false]){
 const ctx=await browser.newContext({viewport:{width:1440,height:960}});try{const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+srv.address().port+'/dashboard/arena.html');
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('cabinet ready'),null,{timeout:60000});
 await page.evaluate(v=>{window.JANE_AV329_PRESENTATION=v;window.JANE_AV324_STORAGE_ENABLE(true);window.JANE_AV323_FULLER_GENERATIONS=true},enabled);
 await page.getByLabel('SKIP HIDDEN MONITOR PAINTS AT 4×+').check();
 await page.getByLabel('EXPERIMENTAL 4× ADAPTIVE BUDGET').check();
 await page.getByLabel('EXPERIMENTAL 4× FRAME-SYNC PERCEPTION').check();
 await page.locator('#av201-demo').click();await page.waitForFunction(()=>window.JANE_RUN_CONTEXT?.().rom==='0b10970a'&&window.JANE_RUN_CONTEXT().frame>30,null,{timeout:60000});await page.locator('#speed').selectOption('4');
 const snap=()=>page.evaluate(()=>({r:window.JANE_RUN_CONTEXT(),now:performance.now(),render:window.JANE_AV329_STATUS(),visual:{...window.__av306Render},storage:window.JANE_AV324_STORAGE_STATUS(),controller:window.JANE_AV291_STATUS().counts,authority:window.JANE_RUST_PARITY().authority,playerText:document.getElementById('players').textContent,activeText:document.getElementById('activeIndicator').textContent}));
 // Repeat identical status render calls via existing profile path is not necessary;
 // natural gameplay observations determine whether dedup actually fires.
 const start=await snap();await page.waitForFunction(f=>window.JANE_RUN_CONTEXT().frame>=f+1440,start.r.frame,{timeout:120000});const end=await snap();
 const d=(a,b)=>Object.fromEntries(Object.keys(b).filter(k=>typeof b[k]==='number').map(k=>[k,b[k]-(a[k]||0)]));
 const row={enabled,fps:(end.r.frame-start.r.frame)*1000/(end.now-start.now),frames:end.r.frame-start.r.frame,render:d(start.render,end.render),visual:d(start.visual,end.visual),storage:d(start.storage,end.storage),storageMaxWriteMs:end.storage.maxWriteMs,completion:end.controller.completion-start.controller.completion,errors,authority:end.authority};
 console.log(JSON.stringify({kind:'AV329R_ARM',...row}));results.push(row);
 assert.equal(end.r.root,start.r.root);assert.equal(end.r.rom,start.r.rom);assert.equal(end.authority,'RUST_GUARDED');assert.ok(row.completion>0);assert.ok(row.render.rafScheduled>0);if(enabled)assert.ok(row.render.timerScheduled>0);else assert.equal(row.render.timerScheduled,0);assert.ok(row.visual.callbacks>0);
 assert.ok(end.activeText.includes(end.r.actor));assert.ok(end.playerText.includes('JANE')&&end.playerText.includes('TOPH')&&end.playerText.includes('PATRICIA'));assert.equal(await page.locator('iframe').count(),1);assert.equal(await page.locator('#av186-three-tools button[role="tab"]').count(),3);assert.deepEqual(errors,[]);
 }finally{await ctx.close()}}
 console.log(JSON.stringify({kind:'AV329R_PRESENTATION',results,operational:'HOLD_PENDING_QUALIFICATION'}));
 }finally{await browser.close();await new Promise(r=>srv.close(r));}}
main().catch(e=>{console.error(e);process.exitCode=1});
