'use strict';
/* AV-218: actual NES defeat-to-restart START receipt survives the 60-frame handoff.
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
  await page.waitForFunction(()=>document.querySelector('#game')?.contentWindow?.JANE_ARENA_RAM?.read?.(5)===1,
    null,{timeout:60000});
  await page.waitForFunction(()=>window.JANE_AV201_MONITOR?.snapshot?.()?.completedCycles>=1,
    null,{timeout:90000});
  const after=await page.evaluate(()=>({
    run:window.JANE_RUN_CONTEXT(),monitor:window.JANE_AV201_MONITOR.snapshot(),
    input:window.JANE_AV215_INPUT_STATUS?.(),
    canvas:{width:document.querySelector('#game')?.contentWindow?.document.getElementById('nesCanvas')?.width,
      height:document.querySelector('#game')?.contentWindow?.document.getElementById('nesCanvas')?.height}
  }));
  const firstCycle=after.monitor.cycles[0];
  assert.equal(firstCycle.transfer?.from,'JANE');
  assert.equal(firstCycle.transfer?.to,'TOPH');
  assert.equal(firstCycle.restart?.actor,'TOPH');
  assert.equal(firstCycle.resumed?.actor,'TOPH');
  assert.equal(firstCycle.startReceipt?.actor,'TOPH',
    'post-defeat START must be a real completed action by incoming player');
  assert.equal(firstCycle.startReceipt?.source,'completed-original-nes-trial');
  assert.equal(firstCycle.startReceipt?.root,first.root);
  assert.equal(firstCycle.startReceipt?.rom,first.rom);
  assert.ok(firstCycle.startReceipt.frame>firstCycle.defeatFrame);
  assert.ok(firstCycle.resumed.frame>=firstCycle.restart.frame+60);
  assert.equal(firstCycle.resumed.startReceiptFrame,firstCycle.startReceipt.frame);
  assert.equal(after.run.root,first.root,'original game ancestry preserved');
  assert.equal(after.run.rom,first.rom,'original NES cartridge preserved');
  assert.equal(after.canvas?.width,256);
  assert.equal(after.canvas?.height,240);
  assert.equal(await page.locator('#av186-three-tools button[role="tab"]').count(),3);
  assert.deepEqual(errors,[],'browser errors invalidate the recovery evidence');
  console.log(JSON.stringify({kind:'AV-218-LIVE-NES-RESTART-RECEIPT',
    rom:first.rom,root:first.root,cycle:firstCycle,
    completedCycles:after.monitor.completedCycles,
    browserTestPassed:true,hostedPagesVerified:false}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-218 NES restart receipt verification failed',err);process.exitCode=1;});
