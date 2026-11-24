'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwaEffect');
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
 await page.waitForFunction(()=>{const r=window.JANE_RUN_CONTEXT?.(),m=window.JANE_AV201_MONITOR?.snapshot?.(),p=window.JANE_AV253_RUNTIME?.snapshot?.(),i=window.JANE_AV215_INPUT_STATUS?.();if(!r||!m?.armed||r.root!==m.root||r.rom!==m.rom||p?.scope!==JSON.stringify([r.root,r.rom]))return false;
 const rows=[...(i?.rows||[]),...(i?.proofRows||[])].filter(x=>x.root===r.root&&x.rom===r.rom&&x.actor==='JANE'&&x.before.mode===1&&x.after.mode===1&&x.endFrame>x.startFrame&&x.endFrame<=r.frame&&p.rows.some(b=>b.actor===x.actor&&b.frame===x.startFrame&&b.action===x.button&&b.button===x.button));
 const aEffect=rows.find(x=>x.button==='A'&&x.before.palette!==0x16&&x.after.palette===0x16),bEffect=rows.find(x=>x.button==='B'&&x.before.palette!==0x2a&&x.after.palette===0x2a);
 if(aEffect&&bEffect&&aEffect.id!==bEffect.id){window.__av256Evidence={root:r.root,rom:r.rom,aEffect,bEffect};return true}return false;
 },null,{timeout:90000,polling:50});
 const proof=await page.evaluate(()=>window.__av256Evidence);
 assert.equal(proof.aEffect.after.palette,0x16);assert.equal(proof.bEffect.after.palette,0x2a);
 assert.equal(await page.locator('iframe').count(),1);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({kind:'AV256_HOME_BREW_AB_ACCEPTANCE',...proof,manualControllerInput:false,commercialVerified:false,attackJumpSemanticsVerified:false}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-256 A/B acceptance failed',err);process.exitCode=1;});
