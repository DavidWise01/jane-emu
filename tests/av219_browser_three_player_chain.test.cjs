'use strict';
/* AV-219: actual NES Jane-to-Toph-to-Patricia unassisted consecutive restarts.
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
  const initial=await page.evaluate(()=>window.JANE_RUN_CONTEXT());
  assert.equal(initial.actor,'JANE');
  await page.waitForFunction(()=>window.JANE_AV201_MONITOR?.snapshot?.()?.av219Chain?.complete===true,
    null,{timeout:180000});
  const result=await page.evaluate(()=>({
    run:window.JANE_RUN_CONTEXT(),
    monitor:window.JANE_AV201_MONITOR.snapshot(),
    input:window.JANE_AV215_INPUT_STATUS?.(),
    canvas:{width:document.querySelector('#game')?.contentWindow?.document.getElementById('nesCanvas')?.width,
      height:document.querySelector('#game')?.contentWindow?.document.getElementById('nesCanvas')?.height}
  }));
  const chain=result.monitor.av219Chain;
  assert.equal(chain.verifiedCycles,2);
  assert.equal(chain.complete,true);
  assert.deepEqual(chain.receipts.map(x=>x.to),['TOPH','PATRICIA']);
  assert.ok(chain.receipts[0].resumedFrame>=chain.receipts[0].startFrame);
  assert.ok(chain.receipts[1].resumedFrame>=chain.receipts[1].startFrame);
  assert.equal(result.monitor.cycles[0].startReceipt.actor,'TOPH');
  assert.equal(result.monitor.cycles[1].startReceipt.actor,'PATRICIA');
  assert.notEqual(result.monitor.cycles[0].defeatId,result.monitor.cycles[1].defeatId);
  assert.equal(result.run.root,initial.root,'same original NES session');
  assert.equal(result.run.rom,initial.rom,'same original NES cartridge');
  assert.equal(result.canvas?.width,256);
  assert.equal(result.canvas?.height,240);
  assert.equal(await page.locator('#av186-three-tools button[role="tab"]').count(),3);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({kind:'AV-219-REAL-NES-THREE-PLAYER-CHAIN',
    root:result.run.root,rom:result.run.rom,chain,
    inputEpisodes:result.input?.episodes?.length||0,
    unassistedController:true,hostedPagesVerified:false}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-219 NES multi-life continuity verification failed',err);process.exitCode=1;});
