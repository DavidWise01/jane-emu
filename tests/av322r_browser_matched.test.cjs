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

async function main(){
 const srv=server();await new Promise(r=>srv.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const arms={A:{paint:false,budget:true,sync:true},B:{paint:true,budget:true,sync:true},C:{paint:true,budget:false,sync:true},D:{paint:true,budget:true,sync:false}};
 const results=[];
 // Balanced order for each pair; fresh browser context, same ROM and viewport.
 for(const [pair,order] of [['paint',['A','B','B','A']],['budget',['C','B','B','C']],['sync',['D','B','B','D']]]){
 for(const arm of order){
 const cfg=arms[arm],ctx=await browser.newContext({viewport:{width:1440,height:960}});try{
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+srv.address().port+'/dashboard/arena.html');
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('cabinet ready'),null,{timeout:60000});
 await page.getByLabel('EXPERIMENTAL 4× ADAPTIVE BUDGET').setChecked(cfg.budget);
 await page.getByLabel('EXPERIMENTAL 4× FRAME-SYNC PERCEPTION').setChecked(cfg.sync);
 await page.getByLabel('SKIP HIDDEN MONITOR PAINTS AT 4×+').setChecked(cfg.paint);
 await page.locator('#av201-demo').click();await page.waitForFunction(()=>window.JANE_RUN_CONTEXT?.().rom==='0b10970a'&&window.JANE_RUN_CONTEXT().frame>30,null,{timeout:60000});
 await page.locator('#speed').selectOption('4');
 await page.waitForFunction(()=>window.JANE_RUN_CONTEXT().frame>=180,null,{timeout:60000});
 await page.evaluate(()=>{window.JANE_AV320_ENABLE(true);window.JANE_AV321_ENABLE(true)});
 const snap=()=>page.evaluate(()=>({r:window.JANE_RUN_CONTEXT(),now:performance.now(),controller:window.JANE_AV291_STATUS().counts,parity:window.JANE_RUST_PARITY(),paint:window.JANE_AV307_STATUS(),budget:window.JANE_AV298_STATUS(),sync:window.JANE_AV300_STATUS(),hot:window.JANE_AV201_MONITOR.hotStatus()}));
 const start=await snap();const windows=[];let prev=start;
 for(let i=0;i<3;i++){await page.waitForFunction(f=>window.JANE_RUN_CONTEXT().frame>=f+360,prev.r.frame,{timeout:60000});const end=await snap();assert.equal(end.r.root,start.r.root);assert.equal(end.r.rom,start.r.rom);const frames=end.r.frame-prev.r.frame,ms=end.now-prev.now;windows.push({frames,ms,fps:frames*1000/ms,completion:end.controller.completion-prev.controller.completion});prev=end;}
 const probes=await page.evaluate(()=>({scheduler:window.JANE_AV320_STATUS(),tasks:window.JANE_AV321_STATUS(),counter:window.JANE_AV201_MONITOR.auditCompletedCycles()}));
 const row={pair,arm,cfg,frames:prev.r.frame-start.r.frame,fps:(prev.r.frame-start.r.frame)*1000/(prev.now-start.now),windows,probes,paint:{skipped:prev.paint.skipped-start.paint.skipped,executed:prev.paint.executed-start.paint.executed},captures:prev.sync.accepted-start.sync.accepted,authority:prev.parity.authority,errors,valid:errors.length===0&&windows.every(w=>w.completion>0)&&prev.parity.authority==='RUST_GUARDED'&&probes.counter.match===true};
 results.push(row);console.log(JSON.stringify({kind:'AV322R_ARM',...row}));
 }finally{await ctx.close()}}
 }
 const comparisons=['paint','budget','sync'].map(pair=>{const rows=results.filter(r=>r.pair===pair),base=rows.filter(r=>r.arm!=='B'),intervention=rows.filter(r=>r.arm==='B'),mean=a=>a.reduce((s,r)=>s+r.fps,0)/a.length;return {pair,control:mean(base),intervention:mean(intervention),delta:mean(intervention)-mean(base),valid:rows.every(r=>r.valid)}});
 console.log(JSON.stringify({kind:'AV322R_MATCHED_TRIALS',comparisons,operational:'HOLD_PENDING_QUALIFICATION',manualControllerInput:false}));
 assert.equal(results.length,12);assert.ok(results.every(r=>r.valid),'continuity/authority/evidence');
 }finally{await browser.close();await new Promise(r=>srv.close(r));}}
main().catch(e=>{console.error(e);process.exitCode=1});
