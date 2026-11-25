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
const srv=server();await new Promise(r=>srv.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
await page.goto('http://127.0.0.1:'+srv.address().port+'/dashboard/arena.html',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('cabinet ready'),null,{timeout:60000});
await page.waitForFunction(()=>window.JANE_RUST_STATUS?.state==='READY_SHADOW',null,{timeout:30000});
await page.locator('#av201-demo').click();
await page.waitForFunction(()=>window.JANE_AV262_STATUS?.().length>0 && window.JANE_AV263_STATUS?.().rows?.length>1 && document.querySelector('#shadow4d output')?.textContent.startsWith('LIVE'),null,{timeout:90000});
assert.equal(await page.locator('iframe').count(),1);
const canvas=page.locator('#shadow4d canvas');
const pane=await canvas.evaluate(c=>c.closest('[role=tabpanel]')?.id);
assert.match(pane||'',/^av186-pane-(play|learn|verify)$/);
const tab=page.locator('#'+pane.replace('pane','tab'));
await tab.click();assert.equal(await tab.getAttribute('aria-selected'),'true');
await canvas.scrollIntoViewIfNeeded();assert.ok(await canvas.isVisible());
const before=await canvas.evaluate(c=>c.toDataURL());await page.waitForTimeout(350);assert.notEqual(await canvas.evaluate(c=>c.toDataURL()),before);
const proof=await page.evaluate(()=>({effect:window.JANE_AV262_STATUS()[0],spatial:window.JANE_AV263_STATUS(),objects:window.JANE_AV264_STATUS(),proximity:window.JANE_AV265_STATUS(),navigation:window.JANE_AV266_STATUS(),evaluation:window.JANE_AV267_STATUS(),signal:document.querySelector('#shadow4d output').textContent}));
assert.notEqual(proof.effect.dx,0);assert.notEqual(proof.effect.paletteBefore,proof.effect.paletteAfter);assert.ok(Array.isArray(proof.objects.objects));assert.ok(Array.isArray(proof.proximity));assert.ok(Array.isArray(proof.evaluation.rows));assert.deepEqual(errors,[]);
await page.waitForFunction(()=>Object.values(window.JANE_RUST_PARITY?.().counts||{}).length===4&&Object.values(window.JANE_RUST_PARITY().counts).every(c=>c.calls>=1),null,{timeout:90000});
const parity=await page.evaluate(()=>window.JANE_RUST_PARITY());assert.equal(parity.first,null);assert.equal(parity.authority,'RUST_GUARDED');assert.ok(Object.values(parity.counts).every(c=>c.rustReturns>0&&c.rustReturns===c.calls));assert.ok(Object.values(parity.counts).every(c=>c.mismatches===0));assert.deepEqual(errors,[]);await page.waitForFunction(()=>window.JANE_RUST_STATE?.().returns>=3,null,{timeout:90000});const state=await page.evaluate(()=>window.JANE_RUST_STATE());assert.equal(state.mismatches,0);assert.equal(state.authority,'RUST_GUARDED');assert.deepEqual(errors,[]);console.log(JSON.stringify({kind:'AV277R_RUST_STATE',parity,state,manualControllerInput:false,commercialVerified:false}));
}finally{await browser.close();await new Promise(r=>srv.close(r));}}
main().catch(e=>{console.error(e);process.exitCode=1});
