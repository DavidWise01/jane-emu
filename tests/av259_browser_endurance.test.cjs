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
 await page.waitForFunction(()=>{const r=window.JANE_RUN_CONTEXT?.(),m=window.JANE_AV201_MONITOR?.snapshot?.(),i=window.JANE_AV215_INPUT_STATUS?.();if(!r||!m?.armed||r.root!==m.root||r.rom!==m.rom||r.actor!=='JANE')return false;
 const cycles=m.cycles.slice(0,6),actors=['JANE','TOPH','PATRICIA'];
 if(cycles.length!==6||new Set(cycles.map(c=>c.defeatId)).size!==6)return false;
 if(!cycles.every((c,k)=>c.ownerAtDefeat===actors[k%3]&&c.transfer?.from===actors[k%3]&&c.transfer?.to===actors[(k+1)%3]&&c.startReceipt?.actor===actors[(k+1)%3]&&c.startReceipt.root===r.root&&c.startReceipt.rom===r.rom&&c.restart?.actor===actors[(k+1)%3]&&c.resumed?.actor===actors[(k+1)%3]&&c.resumed.frame>=c.restart.frame+60&&c.restart.frame>=c.defeatFrame&&(k===0||c.defeatFrame>cycles[k-1].resumed.frame)))return false;
 const rows=[...(i?.rows||[]),...(i?.proofRows||[])];
 const effects=cycles.map((c,k)=>rows.find(x=>x.root===r.root&&x.rom===r.rom&&x.actor===c.transfer.to&&x.startFrame>=c.restart.frame&&x.endFrame>x.startFrame&&x.endFrame<(cycles[k+1]?.defeatFrame??r.frame+1)&&x.before.mode===1&&x.after.mode===1&&x.kind==='NES_EFFECT_OBSERVED'&&x.changed===true));
 if(effects.some(x=>!x)||new Set(effects.map(x=>x.id)).size!==6)return false;
 window.__av259Evidence={root:r.root,rom:r.rom,cycles,effects,frame:r.frame};return true;
 },null,{timeout:180000,polling:50});
 const proof=await page.evaluate(()=>window.__av259Evidence);
 assert.deepEqual(proof.cycles.map(c=>c.transfer.to),['TOPH','PATRICIA','JANE','TOPH','PATRICIA','JANE']);
 assert.equal(proof.effects.length,6);assert.equal(await page.locator('iframe').count(),1);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({kind:'AV259_REPEATED_ROTATION_ACCEPTANCE',...proof,manualControllerInput:false,commercialVerified:false}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-259 repeated rotation acceptance failed',err);process.exitCode=1;});
