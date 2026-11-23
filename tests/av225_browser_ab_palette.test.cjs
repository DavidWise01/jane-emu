'use strict';
/* AV-225: verify A/B completed original NES gameplay effects and two RGB sprite colors.
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
  // AV-225: watch original completed NES A/B effects and capture a canvas
  // pixel for the same playing-mode observation, without injecting buttons.
  await page.waitForFunction(()=>{
    const f=document.querySelector('#game')?.contentWindow,
      canvas=f?.document.getElementById('nesCanvas'),ram=f?.JANE_ARENA_RAM,
      ctx=canvas?.getContext('2d');
    const rows=window.JANE_AV215_INPUT_STATUS?.()?.rows||[];
    if(!ctx||!ram||ram.read(5)!==1||canvas.width!==256||
       canvas.height!==240)return false;
    const palette=ram.read(4),button=palette===0x16?'A':palette===0x2a?'B':null;
    if(!button||!rows.some(r=>r.button===button&&r.changed===true&&
       r.kind==='NES_EFFECT_OBSERVED'&&r.after?.mode===1))return false;
    const x=ram.read(2),y=ram.read(3);
    if(x<8||x>247||y<8||y>231)return false;
    const sprite=[...ctx.getImageData(x+4,y+4,1,1).data];
    const bg=[...ctx.getImageData(1,1,1,1).data];
    if(sprite.slice(0,3).every((v,i)=>v===bg[i]))return false;
    window.__av225ColorProof??={};
    window.__av225ColorProof[button]={button,palette,x,y,sprite,bg,
      mode:ram.read(5),root:window.JANE_RUN_CONTEXT?.()?.root,
      rom:window.JANE_RUN_CONTEXT?.()?.rom};
    return Object.keys(window.__av225ColorProof).length>=2;
  },null,{timeout:90000,polling:'raf'});
  const proof=await page.evaluate(()=>window.__av225ColorProof);
  assert.equal(proof.A.palette,0x16);
  assert.equal(proof.B.palette,0x2a);
  assert.notDeepEqual(proof.A.sprite.slice(0,3),proof.A.bg.slice(0,3));
  assert.notDeepEqual(proof.B.sprite.slice(0,3),proof.B.bg.slice(0,3));
  assert.notDeepEqual(proof.A.sprite.slice(0,3),proof.B.sprite.slice(0,3),
    'real NES A and B must produce distinct rendered sprite colors');
  assert.equal(proof.A.mode,1);
  assert.equal(proof.B.mode,1);
  assert.equal(proof.A.root,first.root);
  assert.equal(proof.B.root,first.root);
  assert.equal(proof.A.rom,first.rom);
  assert.equal(proof.B.rom,first.rom);
  assert.equal(await page.locator('#av186-three-tools button[role="tab"]').count(),3);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({kind:'AV-225-REAL-NES-AB-PIXELS',
    proof,originalController:true,hostedPagesVerified:false}));
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve));}
}
main().catch(err=>{console.error('AV-225 NES A/B sprite pixel verification failed',err);process.exitCode=1;});
