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
 const srv=server();await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 try{
 await page.goto('http://127.0.0.1:'+srv.address().port+'/dashboard/arena.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('cabinet ready'),null,{timeout:60000});
 await page.locator('#av201-demo').click();
 // Loading the legal test cartridge is the only permitted test interaction.
 await page.waitForFunction(()=>{const r=window.JANE_RUN_CONTEXT?.(),m=window.JANE_AV201_MONITOR?.snapshot?.(),p=window.JANE_AV253_RUNTIME?.snapshot?.();if(!r||!m?.armed||r.root!==m.root||r.rom!==m.rom||r.actor!=='JANE')return false;
 const title=m.observations.find(x=>x.kind==='AV203_START_QUEUED'&&x.mode===0&&x.actor==='JANE');
 const f=document.getElementById('game').contentWindow;
 const trials=f.JANE_PERCEPTION?.diagnostics?.()?.recentTrials||[];
 const start=trials.find(t=>t.button==='START'&&t.arenaRoot===r.root&&t.arenaActor==='JANE'&&t.rom===r.rom&&Number.isSafeInteger(t.startFrame)&&t.endFrame>t.startFrame&&title&&t.startFrame>=title.frame);
 const press=p?.scope===JSON.stringify([r.root,r.rom])&&p.rows.some(x=>x.actor==='JANE'&&x.action==='START'&&x.button==='START'&&x.frame===start?.startFrame);
 if(title&&start&&press&&f.JANE_ARENA_RAM?.read?.(5)===1){window.__av254Evidence={root:r.root,rom:r.rom,titleFrame:title.frame,startFrame:start.startFrame,endFrame:start.endFrame,playingFrame:r.frame};return true}return false;
 },null,{timeout:90000,polling:50});
 const proof=await page.evaluate(()=>window.__av254Evidence);
 assert.ok(proof.titleFrame<=proof.startFrame&&proof.startFrame<proof.endFrame&&proof.endFrame<=proof.playingFrame);
 assert.equal(await page.locator('iframe').count(),1);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({kind:'AV254_HOME BREW_TITLE_ACCEPTANCE',...proof,manualControllerInput:false,commercialVerified:false}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-254 title acceptance failed',err);process.exitCode=1;});
