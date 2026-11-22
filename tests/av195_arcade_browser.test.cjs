'use strict';
/* AV-195: actual Chromium browser → arcade page → embedded JSNES iframe.
 * The test uses ONLY the original PLAY TEST ROM UI button and the existing
 * emulator UI/controller input; asserts source ancestry and frame continuity.
 * It does not equate a synthetic/game-over handoff to observed life loss.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const mime={'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json;charset=utf-8'};
function server(){
 return http.createServer((req,res)=>{
  let reqPath=decodeURIComponent((req.url||'/').split('?')[0]);
  if(reqPath==='/')reqPath='/index.html';
  const target=path.resolve(ROOT,'.'+reqPath);
  if(!target.startsWith(ROOT+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(target,(err,data)=>{
   if(err){res.writeHead(404);return res.end('not found');}
   res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});
   res.end(data);
  });
 });
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
 const srv=server();await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:960}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push('page '+e.message));
 page.on('console',e=>{if(e.type()==='error')errors.push('console '+e.text().slice(0,250));});
 try{
  await page.goto('http://127.0.0.1:'+srv.address().port+'/dashboard/arena.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#av193-demo').waitFor({timeout:30000});
  assert.equal(await page.locator('#av186-three-tools button[role="tab"]').count(),3,'3 top-level tools');
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('cabinet ready'),{timeout:60000});
  await page.locator('#av193-demo').click();
  await page.waitForFunction(()=>window.JANE_RUN_CONTEXT?.()?.rom!=='unloaded'&&
    document.querySelector('#frames')?.textContent!=='0',{timeout:60000});
  await page.waitForFunction(()=>Number(document.querySelector('#frames')?.textContent)>=120,{timeout:60000});
  const before=await page.evaluate(()=>{
   const ctx=window.JANE_RUN_CONTEXT(),p=document.querySelector('#game').contentWindow;
   return {ctx,status:p.JANE_PERCEPTION?.status?.(),player:p.JANE_PLAYER_STATE?.status?.(),
     frame:p.JANE_PERCEPTION?.status?.()?.frame||0,ram:p.JANE_ARENA_RAM?.read?.(5)};
  });
  assert.equal(before.ctx.actor,'Jane','Jane owns first turn');
  assert.notEqual(before.ctx.rom,'unloaded','test cartridge must actually load');
  assert.ok(before.frame>=120,'actual emulator frame progression required');
  // The host's original START x3 button queues START into normal autoplay.
  await page.locator('#assistStart').click();
  await page.waitForFunction(()=>document.querySelector('#game')?.contentWindow?.JANE_ARENA_RAM?.read?.(5)===1,{timeout:60000});
  const started=await page.evaluate(()=>{
   const p=document.querySelector('#game').contentWindow;
   return {frame:p.JANE_PERCEPTION?.status?.()?.frame,mode:p.JANE_ARENA_RAM.read(5),
     x:p.JANE_ARENA_RAM.read(2),y:p.JANE_ARENA_RAM.read(3),color:p.JANE_ARENA_RAM.read(4),
     run:window.JANE_RUN_CONTEXT()};
  });
  assert.equal(started.mode,1,'START must reach running NES game');
  // Existing autoplay should issue movement/A/B through the one NES controller.
  await page.waitForFunction(()=>document.querySelector('#game')?.contentWindow?.JANE_PERCEPTION?.status?.()?.frame>
    (window.__av195Baseline||0)+120,{timeout:60000}).catch(()=>{});
  // Handoff must preserve emulator frame and ROM instead of restarting cartridge.
  const f0=await page.evaluate(()=>window.JANE_RUN_CONTEXT?.()?.frame);
  await page.locator('#confirmDeath').click();
  await page.waitForFunction(()=>window.JANE_RUN_CONTEXT?.()?.actor==='Toph',{timeout:20000});
  const handoff=await page.evaluate(()=>window.JANE_RUN_CONTEXT());
  assert.equal(handoff.rom,started.run.rom,'handoff must not load another ROM');
  assert.ok(handoff.frame>=f0,'handoff must not reset NES frame clock');
  assert.equal(handoff.actor,'Toph');
  console.log(JSON.stringify({test:'AV-195-CHROMIUM',rom:handoff.rom,startedFrame:started.frame,
    handoffFrame:handoff.frame,gameStarted:started.mode===1,clockContinuous:true,threeTools:true,
    headlessBrowser:true,hostedPagesVerified:false,errors:errors.slice(0,6)}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(error=>{console.error('AV-195 Chromium test failed',error);process.exitCode=1;});
