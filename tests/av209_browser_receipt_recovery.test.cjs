'use strict';
/* AV-209: controller action serialization, missed receipts, and live NES effects.
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
  // Only the PLAY LOSS ROM click is allowed: START and all gameplay
  // controls must be executed by production NES input handling.
  await page.waitForFunction(()=>document.querySelector('#game')?.contentWindow?.JANE_ARENA_RAM?.read?.(5)===1,null,{timeout:60000});
  await page.waitForFunction(()=>{
    const p=window.JANE_AV208_GAMEPLAY_STATUS?.();
    return p?.history?.some(t=>t.kind==='OFFER'&&t.button==='RIGHT')||false;
  },null,{timeout:60000});
  const samples=[];
  await page.waitForFunction(()=>{
    const f=document.querySelector('#game')?.contentWindow,mon=window.JANE_AV207_GAMEPLAY_STATUS?.();
    if(!f?.JANE_ARENA_RAM?.read)return false;
    const row={frame:f.JANE_PERCEPTION?.status?.()?.frame,x:f.JANE_ARENA_RAM.read(2),
      palette:f.JANE_ARENA_RAM.read(4),mode:f.JANE_ARENA_RAM.read(5)};
    (window.__av207samples??=[]).push(row);
    if(window.__av207samples.length>600)window.__av207samples.shift();
    return mon?.laps>=1;
  },null,{timeout:60000,polling:50});
  const observation=await page.evaluate(()=>{
    const f=document.querySelector('#game').contentWindow;
    const c=f.document.getElementById('nesCanvas');
    const ctx=c?.getContext('2d',{willReadFrequently:true});
    const state=window.JANE_AV208_GAMEPLAY_STATUS();
    return {samples:window.__av207samples||[],state,
      ctx:window.JANE_RUN_CONTEXT(),
      canvas:c?{width:c.width,height:c.height}:null,
      pixel:ctx?Array.from(ctx.getImageData(0,0,c.width,c.height).data.slice(0,12)):null};
  });
  assert.deepEqual(observation.canvas,{width:256,height:240});
  assert.equal(observation.ctx.root,first.root);
  assert.equal(observation.ctx.rom,first.rom);
  for(const button of ['RIGHT','A','LEFT','B'])
    assert.ok(observation.state.history.some(t=>t.kind==='RESULT'&&t.button===button&&t.changed===true),
      button+' must be offered by actual RAM-closed-loop gameplay');
  assert.ok(observation.state.laps>=1,
    'first full RIGHT A LEFT B cycle requires observing real NES RAM thresholds');
  const colors=new Set(observation.samples.map(x=>x.palette));
  const positions=observation.samples.map(x=>x.x);
  assert.ok(colors.has(0x16)||colors.has(0x2A),'real palette memory must change');
  assert.ok(Math.max(...positions)-Math.min(...positions)>=16,
    'real sprite x must move visibly');
  assert.equal(await page.locator('#av186-three-tools button[role="tab"]').count(),3);
  const receiptEvidence=observation.state.history.filter(e=>
    e.kind==='RESULT'||e.kind==='MISSING_RECEIPT');
  assert.ok(receiptEvidence.some(e=>e.kind==='RESULT'&&e.changed===true),
    'at least one completed action must affect NES RAM');
  assert.equal(observation.state.pending,null,
    'no unresolved button input when a full measured game lap completes');
  console.log(JSON.stringify({kind:'AV-209-INPUT-DELIVERY-DIAGNOSTIC',
    missingReceipts:observation.state.missingReceipts,
    successes:observation.state.successes,
    failures:observation.state.failures,
    deliveryUnknown:receiptEvidence.filter(e=>e.kind==='MISSING_RECEIPT').length,
    completedActions:receiptEvidence.filter(e=>e.kind==='RESULT').length}));
  assert.deepEqual(errors,[],'no browser JavaScript exceptions');
  console.log(JSON.stringify({kind:'AV-209-INPUT-RECEIPT-RECOVERY',oneNES:true,
    actor:observation.ctx.actor,rom:observation.ctx.rom,
    observedPalette:[...colors],xMin:Math.min(...positions),xMax:Math.max(...positions),
    laps:observation.state.laps,completedResults:observation.state.history.filter(t=>t.kind==='RESULT').length,holds:observation.state.holds,
    missingReceipts:observation.state.missingReceipts,
    completedResults:observation.state.history.filter(e=>e.kind==='RESULT').length,
    hostedPagesVerified:false}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-209 Chromium gameplay failed',err);process.exitCode=1;});
