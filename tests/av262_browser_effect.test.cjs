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
async function main(){const srv=server();await new Promise(r=>srv.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));try{await page.goto('http://127.0.0.1:'+srv.address().port+'/dashboard/arena.html',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('cabinet ready'),null,{timeout:60000});await page.locator('#av201-demo').click();await page.waitForFunction(()=>window.JANE_AV262_STATUS?.().length>0,null,{timeout:90000});const proof=await page.evaluate(()=>window.JANE_AV262_STATUS()[0]);assert.ok(proof.dx!==0);assert.notEqual(proof.paletteBefore,proof.paletteAfter);assert.equal(await page.locator('iframe').count(),1);assert.deepEqual(errors,[]);console.log(JSON.stringify({kind:'AV262_DUAL_EFFECT_ACCEPTANCE',proof,manualControllerInput:false,commercialVerified:false}));}finally{await browser.close();await new Promise(r=>srv.close(r));}}main().catch(e=>{console.error('AV-262 dual effect acceptance failed',e);process.exitCode=1});