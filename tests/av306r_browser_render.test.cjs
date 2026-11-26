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

async function main(){const srv=server();await new Promise(r=>srv.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+srv.address().port+'/dashboard/arena.html');await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('cabinet ready'),null,{timeout:60000});await page.locator('#av201-demo').click();await page.waitForFunction(()=>window.JANE_RUN_CONTEXT?.().rom==='0b10970a'&&window.JANE_RUN_CONTEXT().frame>30,null,{timeout:60000});await page.locator('#speed').selectOption('4');const snap=()=>page.evaluate(()=>({r:window.JANE_RUN_CONTEXT(),now:performance.now(),render:window.JANE_AV306_STATUS(),controller:window.JANE_AV291_STATUS().counts,clock:window.JANE_AV297_STATUS()[4]}));const windows=[];for(const off of [false,true,true,false]){await page.getByLabel('SUSPEND DECORATIVE 4D RENDER').setChecked(off);const start=await snap();await page.waitForFunction(f=>window.JANE_RUN_CONTEXT().frame>=f+360,start.r.frame,{timeout:60000});const end=await snap();assert.equal(end.r.root,start.r.root);assert.equal(end.r.rom,start.r.rom);assert.equal(end.render.active,off);const delta={draws:end.render.draws-start.render.draws,hidden:end.render.hidden-start.render.hidden,suspended:end.render.suspended-start.render.suspended,callbacks:end.render.callbacks-start.render.callbacks};if(off){assert.equal(delta.draws,0);assert.ok(delta.suspended>0)}assert.ok(end.controller.completion>start.controller.completion);windows.push({off,fps:(end.r.frame-start.r.frame)*1000/(end.now-start.now),frames:end.r.frame-start.r.frame,render:delta,completions:end.controller.completion-start.controller.completion});}assert.equal(await page.locator('iframe').count(),1);assert.deepEqual(errors,[]);console.log(JSON.stringify({kind:'AV306R_RENDER_ISOLATION',windows,visibleBaseline:windows.filter(x=>!x.off).every(x=>x.render.draws>0),manualControllerInput:false}));}finally{await browser.close();await new Promise(r=>srv.close(r));}}main().catch(e=>{console.error(e);process.exitCode=1});
