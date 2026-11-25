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

async function main(){const srv=server();await new Promise(r=>srv.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));try{await page.goto('http://127.0.0.1:'+srv.address().port+'/dashboard/arena.html');await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('cabinet ready'),null,{timeout:60000});await page.locator('#av201-demo').click();await page.waitForFunction(()=>window.JANE_RUN_CONTEXT?.().rom==='0b10970a'&&window.JANE_RUN_CONTEXT().frame>30,null,{timeout:60000});await page.locator('#speed').selectOption('4');const start=await page.evaluate(()=>({frame:window.JANE_RUN_CONTEXT().frame,now:performance.now()}));await page.waitForFunction(f=>window.JANE_RUN_CONTEXT().frame>=f+240,start.frame,{timeout:30000});const end=await page.evaluate(()=>({frame:window.JANE_RUN_CONTEXT().frame,now:performance.now(),fast:window.JANE_FAST_STATUS(),effects:window.JANE_AV215_INPUT_STATUS()?.rows?.length||0}));assert.ok(end.fast.frames>=240);assert.equal(await page.locator('iframe').count(),1);assert.deepEqual(errors,[]);await page.locator('#speed').selectOption('1');const f=await page.evaluate(()=>window.JANE_RUN_CONTEXT().frame);await page.waitForFunction(n=>window.JANE_RUN_CONTEXT().frame>=n+60,f,{timeout:15000});console.log(JSON.stringify({kind:'AV289R_FAST_CLOCK',start,end,actualFps:(end.frame-start.frame)*1000/(end.now-start.now),manualControllerInput:false}));}finally{await browser.close();await new Promise(r=>srv.close(r));}}main().catch(e=>{console.error(e);process.exitCode=1});