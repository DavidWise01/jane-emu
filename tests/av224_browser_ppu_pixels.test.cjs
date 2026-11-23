'use strict';
/* AV-224: verify actual NES painted sprite after PPU palette/OAM staging.
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
  const first=await page.evaluate(()=>window.JANE_RUN_CONTEXT());
  assert.equal(first.actor,'JANE');
  await page.waitForFunction(()=>{
    const f=document.querySelector('#game')?.contentWindow;
    return f?.JANE_ARENA_RAM?.read?.(5)===1 &&
      f?.document.getElementById('nesCanvas')?.width===256;
  },null,{timeout:60000});
  await page.waitForFunction(()=>window.JANE_AV215_INPUT_STATUS?.()?.rows?.some(
    x=>x.kind==='NES_EFFECT_OBSERVED'&&['LEFT','RIGHT','UP','DOWN'].includes(x.button)),
    null,{timeout:60000});
  // AV-224: do not compare a new NES RAM position with the previous painted
  // framebuffer. Allow Chromium to present a matching original NES frame.
  await page.waitForFunction(()=>{
    const f=document.querySelector('#game')?.contentWindow;
    const c=f?.document.getElementById('nesCanvas'),ram=f?.JANE_ARENA_RAM;
    const ctx=c?.getContext('2d');
    if(!ctx||!ram||ram.read(5)!==1||c.width!==256||c.height!==240)return false;
    const x=ram.read(2),y=ram.read(3);
    if(x<8||x>247||y<8||y>231)return false;
    const sprite=ctx.getImageData(x+4,y+4,1,1).data;
    const background=ctx.getImageData(1,1,1,1).data;
    const visible=sprite[0]!==background[0]||sprite[1]!==background[1]||
      sprite[2]!==background[2];
    if(visible)window.__av224PixelProof={
      mode:ram.read(5),x,y,sprite:[...sprite],background:[...background],
      width:c.width,height:c.height,
      root:window.JANE_RUN_CONTEXT?.()?.root,
      rom:window.JANE_RUN_CONTEXT?.()?.rom};
    return visible;
  },null,{timeout:60000,polling:'raf'});
  // Preserve the exact observed successful browser frame. Re-sampling later
  // may land on a different NES frame or another life.
  const pixels=await page.evaluate(()=>window.__av224PixelProof);
  assert.equal(pixels.width,256);
  assert.equal(pixels.height,240);
  assert.equal(pixels.root,first.root,'same original NES');
  assert.equal(pixels.rom,first.rom);
  assert.equal(pixels.mode,1,'original NES RAM still playing at pixel sample');
  assert.ok(pixels.x>=8&&pixels.x<=247&&pixels.y>=8&&pixels.y<=231,
    'hardware X/Y stay inside visible sprite region');
  assert.notDeepEqual(pixels.sprite.slice(0,3),pixels.background.slice(0,3),
    'the actual NES canvas must show sprite pixels distinct from background');
  assert.equal(await page.locator('#av186-three-tools button[role="tab"]').count(),3);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({kind:'AV-224-REAL-NES-PPU-PIXELS',
    pixels,originalController:true,hostedPagesVerified:false}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-224 NES PPU sprite verification failed',err);process.exitCode=1;});
