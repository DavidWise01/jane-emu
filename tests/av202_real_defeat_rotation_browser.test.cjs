'use strict';
/* AV-202: three actual ROM-observed defeats and continuous owner rotation.
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
  // Three genuine cartridge game-over transitions, never manual confirmDeath.
  for(const expected of ['TOPH','PATRICIA','JANE']){
    await page.locator('#assistStart').click();
    await page.waitForFunction(()=>document.querySelector('#game')?.contentWindow?.JANE_ARENA_RAM?.read?.(5)===1,null,{timeout:60000});
    await page.waitForFunction(actor=>window.JANE_RUN_CONTEXT?.()?.actor===actor,expected,{timeout:60000});
    const next=await page.evaluate(()=>window.JANE_RUN_CONTEXT());
    assert.equal(next.root,first.root,'handoff may not reset root');
    assert.equal(next.rom,first.rom,'handoff may not reload cartridge');
    assert.ok(next.frame>prior.frame,'live NES must advance');
    const data=await page.evaluate(()=>window.JANE_AV201_MONITOR.snapshot());
    assert.ok(data.observations.some(x=>x.kind==='AV202_REAL_DEFEAT_HANDOFF'&&x.to===next.actor),
      'ownership changed only after a ROM-observed loss');
    events.push({from:prior.actor,to:next.actor,frame:next.frame,
      cartridgeLossEvidence:true});
    prior=next;
  }
  assert.equal(await page.locator('#handoffs').textContent(),'3');
  assert.deepEqual(errors,[],'no page errors');
  console.log(JSON.stringify({kind:'AV-202-LIVE-CHROMIUM-ROTATION',
    events,oneNES:true,threeTools:true,
    manuallyConfirmed:false,hostedPagesVerified:false}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-196 Chromium gameplay failed',err);process.exitCode=1;});
