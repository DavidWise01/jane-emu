'use strict';
/* AV-217: actual NES game-over splits action evidence before accepted player handoff.
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
  await page.waitForFunction(()=>window.JANE_AV215_INPUT_STATUS?.()?.rows?.length>=1,
    null,{timeout:60000});
  const before=await page.evaluate(()=>window.JANE_AV215_INPUT_STATUS());
  await page.waitForFunction(()=>{
    const x=window.JANE_AV215_INPUT_STATUS?.();
    return x?.boundaries?.some(b=>b.kind==='CARTRIDGE_MODE_BOUNDARY'&&b.mode===2);
  },null,{timeout:90000});
  const after=await page.evaluate(()=>({
    trace:window.JANE_AV215_INPUT_STATUS(),
    run:window.JANE_RUN_CONTEXT(),
    monitor:window.JANE_AV201_MONITOR?.snapshot?.(),
    canvasWidth:document.querySelector('#game')?.contentWindow?.document.getElementById('nesCanvas')?.width
  }));
  assert.equal(after.canvasWidth,256,'original NES playfield retained');
  assert.equal(after.run.root,first.root,'single NES run preserved');
  assert.equal(after.run.rom,first.rom,'single original cartridge preserved');
  const b=after.trace.boundaries.filter(x=>x.mode===2);
  assert.ok(b.length>=1,'actual game-over RAM must split episode');
  assert.ok(after.trace.episodes.every(e=>e.root===first.root&&e.rom===first.rom));
  // This diagnostic does not require a particular player to win.
  const acceptedHandoff=after.monitor.observations?.find(e=>e.kind==='AV202_REAL_DEFEAT_HANDOFF');
  assert.ok(acceptedHandoff,'actual NES defeat must trigger accepted next-player rotation');
  assert.equal(await page.locator('#av186-three-tools button[role="tab"]').count(),3);
  assert.deepEqual(errors,[],'no browser JavaScript errors');
  console.log(JSON.stringify({kind:'AV-217-NES-LIFE-BOUNDARY',
    root:first.root,rom:first.rom,actorAfter:after.run.actor,
    boundaries:b,episodes:after.trace.episodes,
    acceptedHandoff,hostedPagesVerified:false}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-217 NES life boundary verification failed',err);process.exitCode=1;});
