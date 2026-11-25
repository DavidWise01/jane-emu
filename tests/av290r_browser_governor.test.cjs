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

async function main(){const srv=server();await new Promise(r=>srv.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));try{await page.goto('http://127.0.0.1:'+srv.address().port+'/dashboard/arena.html');await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('cabinet ready'),null,{timeout:60000});await page.locator('#av201-demo').click();await page.waitForFunction(()=>window.JANE_RUN_CONTEXT?.().rom==='0b10970a'&&window.JANE_RUN_CONTEXT().frame>30,null,{timeout:60000});const measurements=[];for(const speed of ['4','8','1']){await page.locator('#speed').selectOption(speed);const start=await page.evaluate(()=>({frame:window.JANE_RUN_CONTEXT().frame,now:performance.now()}));await page.waitForFunction(f=>window.JANE_RUN_CONTEXT().frame>=f+240,start.frame,{timeout:30000});await page.waitForFunction(s=>window.JANE_AV290_STATUS?.().target===60*Number(s)&&window.JANE_AV290_STATUS().fps!==null,speed,{timeout:15000});const end=await page.evaluate(()=>({frame:window.JANE_RUN_CONTEXT().frame,now:performance.now(),governor:window.JANE_AV290_STATUS(),fast:window.JANE_FAST_STATUS(),cycles:window.JANE_AV201_MONITOR?.snapshot?.().cycles?.length}));measurements.push({speed,start,end,actualFps:(end.frame-start.frame)*1000/(end.now-start.now)});}assert.equal(await page.locator('iframe').count(),1);assert.deepEqual(errors,[]);console.log(JSON.stringify({kind:'AV290R_SPEED_GOVERNOR',measurements,manualControllerInput:false}));}finally{await browser.close();await new Promise(r=>srv.close(r));}}main().catch(e=>{console.error(e);process.exitCode=1});