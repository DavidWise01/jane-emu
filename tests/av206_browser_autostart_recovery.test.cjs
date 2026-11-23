'use strict';
/* AV-206: real Chromium automatic START, defeat, handoff and restart.
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
  const baseline=await page.evaluate(()=>window.JANE_RUN_CONTEXT());
  assert.equal(baseline.actor,'JANE');
  // No manual START or manual death calls. AV-205 must deliver real START.
  await page.waitForFunction(()=>document.querySelector('#game')?.contentWindow?.JANE_ARENA_RAM?.read?.(5)===1,null,{timeout:60000});
  const boot=await page.evaluate(()=>({
    ctx:window.JANE_RUN_CONTEXT(),policy:window.JANE_AV205_START_STATUS(),
    monitor:window.JANE_AV201_MONITOR.snapshot(),
    mode:document.querySelector('#game').contentWindow.JANE_ARENA_RAM.read(5),
    canvas:document.querySelector('#game').contentWindow.document.getElementById('nesCanvas')?.width
  }));
  assert.equal(boot.mode,1,'actual cartridge must enter playing state');
  assert.equal(boot.canvas,256,'NES canvas must remain present');
  const offers=boot.policy?.history?.filter(x=>x.event==='START_OFFER')||[];
  const receipts=boot.policy?.history?.filter(x=>x.event==='START_COMPLETED')||[];
  assert.ok(offers.length>0,'bounded priority must offer START');
  assert.ok(receipts.length>0,'original NES action loop must complete START');
  await page.waitForFunction(()=>window.JANE_RUN_CONTEXT?.()?.actor==='TOPH',null,{timeout:60000});
  const loss=await page.evaluate(()=>({
    ctx:window.JANE_RUN_CONTEXT(),monitor:window.JANE_AV201_MONITOR.snapshot(),
    mode:document.querySelector('#game').contentWindow.JANE_ARENA_RAM.read(5),
    policy:window.JANE_AV205_START_STATUS()
  }));
  assert.equal(loss.ctx.root,baseline.root);
  assert.equal(loss.ctx.rom,baseline.rom);
  assert.ok(loss.monitor.observations.some(x=>x.kind==='AV202_REAL_DEFEAT_HANDOFF'&&x.to==='TOPH'),
    'Toph must own the controller only after ROM defeat');
  await page.waitForFunction(()=>window.JANE_AV201_MONITOR?.snapshot?.()?.completedCycles>=1,null,{timeout:60000});
  const resume=await page.evaluate(()=>({
    ctx:window.JANE_RUN_CONTEXT(),monitor:window.JANE_AV201_MONITOR.snapshot(),
    mode:document.querySelector('#game').contentWindow.JANE_ARENA_RAM.read(5),
    policy:window.JANE_AV205_START_STATUS()
  }));
  assert.equal(resume.ctx.root,baseline.root);
  assert.equal(resume.ctx.rom,baseline.rom);
  assert.equal(resume.ctx.actor,'TOPH');
  assert.equal(resume.mode,1);
  assert.ok(resume.monitor.cycles[0].resumed.frame>=resume.monitor.cycles[0].restart.frame+60);
  assert.ok(resume.policy.history.some(x=>x.event==='START_COMPLETED'&&
    x.frame>resume.monitor.cycles[0].defeatFrame),
    'post-loss START must be completed by original action loop');
  assert.equal(await page.locator('#av186-three-tools button[role="tab"]').count(),3);
  console.log(JSON.stringify({kind:'AV-206-CHROMIUM-AUTO-START',
    boot,loss:{actor:loss.ctx.actor,mode:loss.mode},
    resume:{frame:resume.ctx.frame,completedCycles:resume.monitor.completedCycles},
    noManualStart:true,oneNES:true,hostedPagesVerified:false,errors}));
  assert.deepEqual(errors,[],'no browser JS errors');
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-206 Chromium gameplay failed',err);process.exitCode=1;});
