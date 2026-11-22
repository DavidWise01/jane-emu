'use strict';
/* AV-196: real Chromium screen-canvas and three-player rotation.
 * Loads the original local homebrew cartridge through the production arcade.
 * Inputs are directed to the SAME JSNES instance embedded by the cabinet.
 * Manual life-loss buttons test handoff plumbing, NOT actual game defeats.
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
  await page.locator('#av193-demo').waitFor({timeout:30000});
  assert.equal(await page.locator('#av186-three-tools button[role="tab"]').count(),3);
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('cabinet ready'),null,{timeout:60000});
  await page.locator('#av193-demo').click();
  await page.waitForFunction(()=>window.JANE_RUN_CONTEXT?.()?.rom!=='unloaded'&&
   Number(document.querySelector('#frames')?.textContent)>=120,null,{timeout:60000});
  await page.locator('#assistStart').click();
  await page.waitForFunction(()=>document.querySelector('#game')?.contentWindow?.JANE_ARENA_RAM?.read?.(5)===1,null,{timeout:60000});
  // Find the real 256x240 gameplay canvas from the embedded original cabinet.
  const details=await page.evaluate(()=>{
   const f=document.querySelector('#game').contentWindow;
   return {canvases:[...f.document.querySelectorAll('canvas')].map(c=>({id:c.id,w:c.width,h:c.height})),
    jsnesType:typeof f.jsnes,nesType:typeof f.nes,
    lexicalType:f.eval('typeof nes')};
  });
  assert.ok(details.canvases.some(c=>c.id==='nesCanvas'&&c.w===256&&c.h===240),'actual 256x240 NES canvas missing: '+JSON.stringify(details));
  const inspect=()=>page.evaluate(()=>{
   const f=document.querySelector('#game').contentWindow;
   const canvas=f.document.getElementById('nesCanvas')||[...f.document.querySelectorAll('canvas')].find(c=>c.width===256&&c.height===240);
   if(!canvas)return {error:'NES display canvas not found'};
   const data=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;
   const counts=new Map(),box={minX:Infinity,maxX:-1,minY:Infinity,maxY:-1,n:0};
   const outside=data.slice((90*canvas.width+90)*4,(90*canvas.width+90)*4+3).join(',');
   for(let y=96;y<145;y++)for(let x=100;x<180;x++){
    const k=(y*canvas.width+x)*4,col=[data[k],data[k+1],data[k+2]].join(',');
    counts.set(col,(counts.get(col)||0)+1);
    if(col!==outside){box.n++;box.minX=Math.min(box.minX,x);box.maxX=Math.max(box.maxX,x);box.minY=Math.min(box.minY,y);box.maxY=Math.max(box.maxY,y);}
   }
   const colors=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
   return {canvas:{width:canvas.width,height:canvas.height},box,colors,
    frame:f.JANE_PERCEPTION?.status?.()?.frame,ctx:window.JANE_RUN_CONTEXT(),
    ram:{x:f.JANE_ARENA_RAM.read(2),y:f.JANE_ARENA_RAM.read(3),mode:f.JANE_ARENA_RAM.read(5)}};
  });
  // Pixel proof: the real embedded NES framebuffer has a visible player
  // immediately after the production START button. No test controller used.
  const start=await inspect();
  assert.ok(!start.error,JSON.stringify(start));
  assert.ok(start.box.n>=32&&start.box.n<=160,'START must reveal localized NES sprite in browser: '+JSON.stringify(start));
  assert.equal(start.ram.mode,1,'game start mode must survive into visible scene');
  const initialRoot=start.ctx.root,initialRom=start.ctx.rom;
  const handoffStages=[];
  // Full three-person controller round trip (operator-confirmed transfer only).
  let last=await page.evaluate(()=>window.JANE_RUN_CONTEXT());
  for(const actor of ['TOPH','PATRICIA','JANE']){
   await page.waitForFunction(frame=>window.JANE_RUN_CONTEXT?.()?.frame>=frame+120,last.frame,{timeout:60000});
   await page.locator('#confirmDeath').click();
   await page.waitForFunction(a=>String(window.JANE_RUN_CONTEXT?.()?.actor).toUpperCase()===a,actor,{timeout:15000});
   const current=await page.evaluate(()=>window.JANE_RUN_CONTEXT());
   assert.equal(current.root,last.root,'handoff must preserve session root');
   assert.equal(current.rom,last.rom,'handoff must preserve cartridge');
   assert.ok(current.frame>=last.frame,'handoff may not rewind emulator');
   handoffStages.push({actor,frame:current.frame});
   last=current;
  }
  const final=await inspect();
  assert.ok(final.frame>start.frame+360,'one live NES clock must advance across all three handoffs');
  assert.equal(final.ctx.root,initialRoot);
  assert.equal(final.ctx.rom,initialRom);
  console.log(JSON.stringify({kind:'AV-196-CHROMIUM-CANVAS',
   startSprite:start.box,fullRotation:true,handoffStages,frameStart:start.frame,
   frameFinish:final.frame,rom:final.ctx.rom,threeTools:true,hostedPagesVerified:false,
   realDefeatVerified:false,keyboardPortVerified:false,actionSchedulerVerified:false,
   browserErrors:errors}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-196 Chromium gameplay failed',err);process.exitCode=1;});
