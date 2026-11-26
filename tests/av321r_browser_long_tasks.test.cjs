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
 assert.equal(await page.evaluate(()=>window.JANE_AV321_STATUS().active),false);
 await page.locator('#speed').selectOption('4');await page.evaluate(()=>window.JANE_AV321_ENABLE(true));
 const start=await page.evaluate(()=>window.JANE_RUN_CONTEXT());await page.waitForFunction(f=>window.JANE_RUN_CONTEXT().frame>=f+720,start.frame,{timeout:90000});
 const evidence=await page.evaluate(()=>({timing:window.JANE_AV321_STATUS(),run:window.JANE_RUN_CONTEXT(),clock:window.JANE_AV297_STATUS()}));
 console.log(JSON.stringify({kind:'AV321R_LONG_TASKS',evidence,errors}));
 assert.equal(evidence.timing.supported,true);assert.ok(evidence.timing.timers>0);assert.equal(evidence.timing.invalid,0);assert.equal(evidence.timing.tasks,evidence.timing.self+evidence.timing.descendant+evidence.timing.other);assert.ok(evidence.timing.blockingMs>=0&&evidence.timing.blockingMs<=evidence.timing.taskMs);
 assert.equal(evidence.run.root,start.root);assert.equal(evidence.run.rom,start.rom);assert.deepEqual(errors,[]);
 await page.evaluate(()=>window.JANE_AV321_ENABLE(false));assert.equal(await page.evaluate(()=>window.JANE_AV321_STATUS().active),false);
 }finally{await browser.close();await new Promise(r=>srv.close(r));}}
main().catch(e=>{console.error(e);process.exitCode=1});
