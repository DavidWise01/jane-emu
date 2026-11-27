'use strict';
/* AV-227: original NES completed effects survive the live diagnostics ring and remain source-qualified.
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
  await page.evaluate(()=>{window.JANE_AV325_EXPERIMENT=true});
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
  const life=await page.evaluate(()=>window.JANE_AV226_LIFE_EFFECTS?.());
  const retained=await page.evaluate(()=>window.JANE_AV215_INPUT_STATUS?.()?.proofRows||[]);
  console.log(JSON.stringify({kind:'AV325R_EFFECT_OBSERVATION',life,retained,adviser:await page.evaluate(()=>window.JANE_AV325_STATUS())}));
  assert.ok(retained.some(x=>x.actor==='TOPH'&&x.button==='A'&&
    x.changed&&x.kind==='NES_EFFECT_OBSERVED'),'Toph completed A must be retained');
  assert.ok(retained.some(x=>x.actor==='TOPH'&&x.button==='B'&&
    x.changed&&x.kind==='NES_EFFECT_OBSERVED'),'Toph completed B must be retained');
  assert.ok(retained.some(x=>x.actor==='PATRICIA'&&x.button==='A'&&
    x.changed&&x.kind==='NES_EFFECT_OBSERVED'),'Patricia completed A must be retained');
  assert.ok(retained.some(x=>x.actor==='PATRICIA'&&x.button==='B'&&
    x.changed&&x.kind==='NES_EFFECT_OBSERVED'),'Patricia completed B must be retained');
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
  // The source-qualified chain is necessary but not sufficient: each incoming
  // player must also yield at least one completed original NES input record.
  const observed=result.input?.rows||[];
  assert.equal(life?.complete,true,
    'Toph and Patricia must each show in-life movement and separate A/B effects');
  assert.equal(life?.qualifiedLives,2);
  assert.deepEqual(life.players.map(x=>x.actor),['TOPH','PATRICIA']);
  assert.ok(life.players.every(x=>x.movement>=1&&x.hasA&&x.hasB));
  assert.equal(result.canvas?.width,256);
  assert.equal(result.canvas?.height,240);
  assert.equal(await page.locator('#av186-three-tools button[role="tab"]').count(),3);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({kind:'AV325R_RECOVERED_EFFECTS',
    root:result.run.root,rom:result.run.rom,chain,life,retainedCount:retained.length,
    inputEpisodes:result.input?.episodes?.length||0,
    tophEffects:observed.filter(e=>e.actor==='TOPH'&&e.changed).length,
    patriciaEffects:observed.filter(e=>e.actor==='PATRICIA'&&e.changed).length,
    unassistedController:true,hostedPagesVerified:false}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-227 retained NES life effects verification failed',err);process.exitCode=1;});
