'use strict';
/* AV-201: real Chromium, 6502 loss ROM, observed game over and restart.
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
  const start=await page.evaluate(()=>window.JANE_RUN_CONTEXT());
  assert.equal(start.actor,'JANE','Jane controls initial game');
  await page.locator('#assistStart').click();
  await page.waitForFunction(()=>document.querySelector('#game')?.contentWindow?.JANE_ARENA_RAM?.read?.(5)===1,null,{timeout:60000});
  const playing=await page.evaluate(()=>({c:window.JANE_RUN_CONTEXT(),
    mode:document.querySelector('#game').contentWindow.JANE_ARENA_RAM.read(5)}));
  assert.equal(playing.mode,1);
  await page.waitForFunction(()=>window.JANE_AV201_MONITOR?.snapshot?.()?.gate?.defeat?.frame!=null,null,{timeout:60000});
  const dead=await page.evaluate(()=>({
    c:window.JANE_RUN_CONTEXT(),mode:document.querySelector('#game').contentWindow.JANE_ARENA_RAM.read(5),
    monitor:window.JANE_AV201_MONITOR.snapshot()}));
  assert.equal(dead.mode,2,'the running 6502 ROM must reach observed game over');
  assert.equal(dead.monitor.gate.verifiedRecovery,false,'defeat alone cannot prove restart');
  // The only restart command is the existing production START recovery UI.
  await page.locator('#assistStart').click();
  await page.waitForFunction(()=>document.querySelector('#game')?.contentWindow?.JANE_ARENA_RAM?.read?.(5)===1,null,{timeout:60000});
  await page.waitForFunction(()=>window.JANE_AV201_MONITOR?.snapshot?.()?.gate?.verifiedRecovery===true,null,{timeout:60000});
  const final=await page.evaluate(()=>window.JANE_AV201_MONITOR.snapshot());
  assert.equal(final.root,start.root,'game session must retain root');
  assert.equal(final.rom,start.rom,'game must retain same cartridge');
  assert.ok(final.gate.resumed.frame>=final.gate.start.frame+60);
  assert.equal(await page.locator('#av186-three-tools button[role="tab"]').count(),3);
  assert.deepEqual(errors,[],'no browser page exceptions');
  console.log(JSON.stringify({kind:'AV-201-CHROMIUM-RECOVERY',rom:start.rom,
    observedDefeatFrame:dead.monitor.gate.defeat.frame,
    startCompletedFrame:final.gate.start.frame,resumedFrame:final.gate.resumed.frame,
    oneNES:true,threeTools:true,hostedPagesVerified:false}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-196 Chromium gameplay failed',err);process.exitCode=1;});
