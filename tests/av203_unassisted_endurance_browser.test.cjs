'use strict';
/* AV-203: three unassisted ROM-observed defeats, handoffs and restarts.
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
  assert.equal(await page.locator('#av186-three-tools button[role="tab"]').count(),3);
  const events=[];
  let prior=first;
  // No assistStart clicks: after PLAY LOSS ROM the existing reciprocal
  // scheduler must start the cartridge and recover after all three losses.
  for(let index=0;index<3;index++){
    const expected=['TOPH','PATRICIA','JANE'][index];
    await page.waitForFunction(n=>window.JANE_AV201_MONITOR?.snapshot?.()?.completedCycles>=n,
      index+1,{timeout:90000});
    const data=await page.evaluate(()=>window.JANE_AV201_MONITOR.snapshot());
    const next=await page.evaluate(()=>window.JANE_RUN_CONTEXT());
    const cycle=data.cycles[index];
    assert.ok(cycle?.transfer&&cycle?.restart&&cycle?.resumed,
      'loss, handoff and completed START plus 60 resumed frames required');
    assert.equal(cycle.transfer.from,prior.actor,'owner must transfer in order');
    assert.equal(cycle.transfer.to,expected,'next owner must match rotation');
    assert.equal(next.actor,expected);
    assert.equal(next.root,first.root,'same NES session root throughout');
    assert.equal(next.rom,first.rom,'no new ROM load');
    assert.ok(next.frame>prior.frame,'real emulator frame count must advance');
    assert.ok(cycle.resumed.frame>=cycle.restart.frame+60);
    events.push({from:prior.actor,to:expected,
      defeatFrame:cycle.defeatFrame,handoffFrame:cycle.transfer.frame,
      restartFrame:cycle.restart.frame,resumedFrame:cycle.resumed.frame});
    prior=next;
  }
  assert.equal(await page.locator('#handoffs').textContent(),'3');
  const summary=await page.evaluate(()=>window.JANE_AV201_MONITOR.snapshot());
  assert.ok(summary.recoveryRequests>=4,'boot and three loss recoveries must be queued');
  assert.equal(summary.completedCycles,3);
  console.log(JSON.stringify({kind:'AV-203-UNASSISTED-NES-ENDURANCE',
    events,queued:summary.recoveryRequests,completed:summary.completedCycles,
    noManualStart:true,noManualDefeat:true,oneNES:true,threeTools:true,
    hostedPagesVerified:false}));
  assert.deepEqual(errors,[],'no page errors');
  console.log(JSON.stringify({kind:'AV-202-LIVE-CHROMIUM-ROTATION',
    events,oneNES:true,threeTools:true,
    manuallyConfirmed:false,hostedPagesVerified:false}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-203 Chromium endurance failed',err);process.exitCode=1;});
