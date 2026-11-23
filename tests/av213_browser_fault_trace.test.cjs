'use strict';
/* AV-213: read-only fault isolation from original Chromium NES gameplay.
 * Same embedded NES; fail if actual completed START or post-restart evidence
 * is absent. This is homebrew behavior, not Punch-Out commercial ROM proof.
 */
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
 const srv=server();await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 try{
  await page.goto('http://127.0.0.1:'+srv.address().port+'/dashboard/arena.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#av201-demo').waitFor({timeout:30000});
  assert.equal(await page.locator('#av186-three-tools button[role="tab"]').count(),3);
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('cabinet ready'),null,{timeout:60000});
  await page.locator('#av201-demo').click();
  await page.waitForFunction(()=>window.JANE_AV201_MONITOR?.snapshot?.()?.root &&
    window.JANE_RUN_CONTEXT?.()?.rom!=='unloaded',null,{timeout:60000});
  const first=await page.evaluate(()=>window.JANE_RUN_CONTEXT());
  assert.equal(first.actor,'JANE');
  await page.waitForFunction(()=>window.JANE_AV201_MONITOR?.snapshot?.()?.av213Faults?.observations>=8,
    null,{timeout:60000});
  const initial=await page.evaluate(()=>({
    game:window.JANE_RUN_CONTEXT(),monitor:window.JANE_AV201_MONITOR.snapshot(),
    start:window.JANE_AV205_START_STATUS?.(),
    gameplay:window.JANE_AV208_GAMEPLAY_STATUS?.()
  }));
  await page.waitForFunction(frame=>window.JANE_RUN_CONTEXT?.()?.frame>=frame+120,
    first.frame,{timeout:60000});
  const final=await page.evaluate(()=>({
    game:window.JANE_RUN_CONTEXT(),monitor:window.JANE_AV201_MONITOR.snapshot(),
    start:window.JANE_AV205_START_STATUS?.(),
    gameplay:window.JANE_AV208_GAMEPLAY_STATUS?.(),
    screen:document.querySelector('#game')?.contentWindow?.document.getElementById('nesCanvas')?.width
  }));
  assert.equal(final.screen,256,'original NES canvas must exist');
  assert.equal(final.game.root,first.root,'diagnostic must observe same session');
  assert.equal(final.game.rom,first.rom,'diagnostic cannot replace ROM');
  assert.ok(final.monitor.av213Faults.observations>=initial.monitor.av213Faults.observations);
  assert.ok(final.monitor.av213Faults.lastFrame>=first.frame+120,
    'emulator must advance independently of wall clock');
  assert.equal(final.monitor.av213Faults.readOnly,true);
  assert.equal(await page.locator('#av186-three-tools button[role="tab"]').count(),3);
  assert.deepEqual(errors,[],'no page JS errors');
  console.log(JSON.stringify({kind:'AV-213-ORIGINAL-NES-FAULT-DIAGNOSTIC',
    originalNES:true,gameRoot:final.game.root,rom:final.game.rom,
    firstFrame:first.frame,finalFrame:final.game.frame,
    cartridgeMode:final.monitor.av213Faults.lastMode,
    startPolicy:final.start,gameplay:final.gameplay,
    faultCandidates:final.monitor.av213Faults.events,
    browserTestPassed:true,hostedPagesVerified:false}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-213 original NES diagnostic failed',err);process.exitCode=1;});
