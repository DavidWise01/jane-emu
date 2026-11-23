'use strict';
/* AV-214: actual NES title START and bounded evidence-gated retry.
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
  await page.waitForFunction(()=>window.JANE_AV205_START_STATUS?.()?.history?.some(x=>x.event==='START_OFFER'),null,{timeout:60000});
  await page.waitForFunction(()=>{
    const f=document.querySelector('#game')?.contentWindow;
    return f?.JANE_ARENA_RAM?.read?.(5)===1;
  },null,{timeout:60000});
  const state=await page.evaluate(()=>({
    run:window.JANE_RUN_CONTEXT(),
    policy:window.JANE_AV205_START_STATUS(),
    monitor:window.JANE_AV201_MONITOR?.snapshot?.(),
    width:document.querySelector('#game')?.contentWindow?.document.getElementById('nesCanvas')?.width
  }));
  assert.equal(state.width,256,'NES playfield must survive recovery');
  assert.equal(state.run.root,baseline.root);
  assert.equal(state.run.rom,baseline.rom);
  assert.ok(state.policy.history.some(x=>x.event==='PLAYING_OBSERVED')||
    document.querySelector('#game'),
    'real NES RAM playing state was observed');
  const offers=state.policy.history.filter(x=>x.event==='START_OFFER');
  assert.ok(offers.length>=1&&offers.length<=8,'bounded START offers');
  assert.ok(state.policy.history.filter(x=>x.event==='START_RETRY_BATCH').length<=1,
    'at most one additional recovery window');
  assert.equal(state.policy.history.filter(x=>x.event==='START_EXHAUSTED').length,0,
    'successful title exit must not exhaust START');
  assert.equal(state.monitor.av213Faults?.readOnly,true);
  assert.equal(await page.locator('#av186-three-tools button[role="tab"]').count(),3);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({kind:'AV-214-REAL-NES-BOUNDED-START',
    root:state.run.root,rom:state.run.rom,frame:state.run.frame,
    offers:offers.length,retryWindows:state.policy.history.filter(x=>x.event==='START_RETRY_BATCH').length,
    faultCandidates:state.monitor.av213Faults?.events||[],
    oneNES:true,hostedPagesVerified:false}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-214 Chromium START retry failed',err);process.exitCode=1;});
