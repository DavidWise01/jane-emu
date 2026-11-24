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
 page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto('http://127.0.0.1:'+srv.address().port+'/dashboard/arena.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('cabinet ready'),null,{timeout:60000});
 await page.locator('#av201-demo').click();
 await page.waitForFunction(()=>{const r=window.JANE_RUN_CONTEXT?.(),p=window.JANE_AV253_RUNTIME?.snapshot?.();if(!r||p?.scope!==JSON.stringify([r.root,r.rom]))return false;
 const f=document.getElementById('game').contentWindow,trials=f.JANE_PERCEPTION?.diagnostics?.()?.recentTrials||[];
 for(const t of trials){if(t.arenaRoot!==r.root||t.rom!==r.rom||!Number.isSafeInteger(t.startFrame)||t.endFrame<=t.startFrame||typeof t.button!=='string')continue;const parts=t.button.split('+');if(parts.length!==2||!parts.some(b=>['UP','DOWN','LEFT','RIGHT'].includes(b))||!parts.some(b=>['A','B'].includes(b)))continue;
 const presses=p.rows.filter(b=>b.actor===t.arenaActor&&b.frame===t.startFrame&&b.action===t.button);
 if(parts.every(b=>presses.some(x=>x.button===b))){window.__av257Evidence={root:r.root,rom:r.rom,actor:t.arenaActor,action:t.button,startFrame:t.startFrame,endFrame:t.endFrame,presses};return true}}
 return false;
 },null,{timeout:90000,polling:50});
 const proof=await page.evaluate(()=>window.__av257Evidence);
 assert.equal(new Set(proof.presses.map(p=>p.button)).size,2);
 assert.equal(await page.locator('iframe').count(),1);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({kind:'AV257_NATIVE_COMBO_ACCEPTANCE',...proof,manualControllerInput:false,combinedGameEffectVerified:false}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-257 combined action acceptance failed',err);process.exitCode=1;});
