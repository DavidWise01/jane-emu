'use strict';
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

async function run(browser,url,enabled){
 const ctx=await browser.newContext({viewport:{width:1440,height:960}}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('cabinet ready'),null,{timeout:60000});
 await page.waitForFunction(()=>window.JANE_RUST_STATUS?.state==='READY_SHADOW',null,{timeout:30000});
 if(enabled){const c=page.getByLabel('RUST DEFENSE EXPERIMENT (homebrew only)');const pane=await c.evaluate(x=>x.closest('[role=tabpanel]')?.id);if(pane)await page.locator('#'+pane.replace('pane','tab')).click();await c.check();}
 await page.locator('#av201-demo').click();
 await page.waitForFunction(()=>{const r=window.JANE_RUN_CONTEXT?.(),m=window.JANE_AV201_MONITOR?.snapshot?.();return r?.rom==='0b10970a'&&m?.root===r.root&&m.cycles.length>=3&&m.cycles.slice(0,3).every(c=>c.resumed&&c.restart&&c.transfer)},null,{timeout:180000});
 const evidence=await page.evaluate(()=>{const r=window.JANE_RUN_CONTEXT(),m=window.JANE_AV201_MONITOR.snapshot(),q=window.JANE_AV282_STATUS(),i=window.JANE_AV215_INPUT_STATUS();const cycles=m.cycles.slice(0,3),end=cycles[2].defeatFrame;return {rom:r.rom,root:r.root,cycles:cycles.map(c=>({actor:c.ownerAtDefeat,defeat:c.defeatFrame,restart:c.restart.frame,resumed:c.resumed.frame})),receipts:q.rows.filter(x=>x.end<=end),effects:[...(i?.rows||[]),...(i?.proofRows||[])].filter(x=>x.endFrame<=end).length,funnel:window.JANE_AV288_STATUS(),parity:window.JANE_RUST_PARITY()};});
 assert.equal(await page.locator('iframe').count(),1);assert.deepEqual(errors,[]);assert.deepEqual(evidence.cycles.map(c=>c.actor),['JANE','TOPH','PATRICIA']);return evidence;
 }finally{await ctx.close()}
}
function adjudicate(a,b){const durations=x=>[x.cycles[1].defeat-x.cycles[0].restart,x.cycles[2].defeat-x.cycles[1].restart];const base=durations(a),treatment=durations(b);return {status:b.receipts.length===0?'NO_INTERVENTION':'DESCRIPTIVE_ONLY',baselineFrames:base,treatmentFrames:treatment,delta:treatment.map((x,i)=>x-base[i]),causalVerified:false,matchedInitialState:false,reason:'Fresh contexts and same ROM; exact initial emulator state and randomized replicated treatment not established'};}
async function main(){const srv=server();await new Promise(r=>srv.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{const url='http://127.0.0.1:'+srv.address().port+'/dashboard/arena.html';const baseline=await run(browser,url,false),treatment=await run(browser,url,true);assert.equal(baseline.receipts.length,0);assert.ok(Object.keys(treatment.funnel.counts).some(k=>k.startsWith('PERCEPTION:')));assert.ok(Object.keys(treatment.funnel.counts).some(k=>k.startsWith('OFFER:')));assert.equal(baseline.rom,treatment.rom);console.log(JSON.stringify({kind:'AV288R_OPPORTUNITY_FUNNEL',baseline,treatment,comparison:adjudicate(baseline,treatment)}));}finally{await browser.close();await new Promise(r=>srv.close(r));}}
main().catch(e=>{console.error(e);process.exitCode=1});
