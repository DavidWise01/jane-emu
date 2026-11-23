'use strict';
/* AV-216: sustained original NES movement and A/B effects across owner handoff.
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
  await page.waitForFunction(()=>document.querySelector('#game')?.contentWindow?.JANE_ARENA_RAM?.read?.(5)===1,
    null,{timeout:60000});
  await page.waitForFunction(()=>window.JANE_AV215_INPUT_STATUS?.()?.qualifiedEpisodes>=1,
    null,{timeout:60000});
  const observation=await page.evaluate(()=>{
    const f=document.querySelector('#game').contentWindow;
    return {context:window.JANE_RUN_CONTEXT(),trace:window.JANE_AV215_INPUT_STATUS(),
      nesWidth:f.document.getElementById('nesCanvas')?.width,
      nesHeight:f.document.getElementById('nesCanvas')?.height,
      ram:{x:f.JANE_ARENA_RAM.read(2),y:f.JANE_ARENA_RAM.read(3),
        palette:f.JANE_ARENA_RAM.read(4),mode:f.JANE_ARENA_RAM.read(5)}};
  });
  assert.equal(observation.nesWidth,256);
  assert.equal(observation.nesHeight,240);
  assert.equal(observation.context.root,first.root);
  assert.equal(observation.context.rom,first.rom);
  assert.ok(observation.trace.rows.length>=4);
  assert.ok(observation.trace.qualifiedEpisodes>=1,
    'one original NES actor must show sustained movement and palette changes');
  const movement=observation.trace.rows.filter(x=>['RIGHT','LEFT','UP','DOWN'].includes(x.button));
  const colors=observation.trace.rows.filter(x=>['A','B'].includes(x.button));
  assert.ok(movement.some(x=>x.kind==='NES_EFFECT_OBSERVED'),
    'at least one completed D-pad action must change real NES sprite RAM');
  assert.ok(colors.some(x=>x.kind==='NES_EFFECT_OBSERVED'),
    'at least one completed A/B action must change real NES palette RAM');
  assert.equal(new Set(observation.trace.rows.map(x=>x.id)).size,
    observation.trace.rows.length,'one real action completion per evidence ID');
  assert.equal(await page.locator('#av186-three-tools button[role="tab"]').count(),3);
  assert.deepEqual(errors,[],'no JavaScript errors');
  const qualified=observation.trace.episodes.filter(x=>x.qualified);
  assert.ok(qualified.some(x=>x.movements>=2&&x.colors>=2),
    'real NES must complete repeated movement and A/B effects in one episode');
  console.log(JSON.stringify({kind:'AV-216-SUSTAINED-NES-INPUT-EFFECTS',
    root:observation.context.root,rom:observation.context.rom,
    frame:observation.context.frame,movementResults:movement,
    paletteResults:colors,nesSize:[observation.nesWidth,observation.nesHeight],
    qualifiedEpisodes:qualified,
    hostedPagesVerified:false}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-216 sustained NES input verification failed',err);process.exitCode=1;});
