'use strict';
// AV-194: inspect the REAL JSNES PPU framebuffer, not only zero-page variables.
// This checks that player sprites are visibly rendered after START, move after
// D-pad input and change visible pixels when A/B are held.
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {buildROM}=require('../dashboard/av193_test_rom.js');
async function main(){
  const entry=path.resolve(path.dirname(require.resolve('jsnes')),'../src/index.js');
  const {NES,Controller}=await import(pathToFileURL(entry).href);
  let screenshot=null, rendered=0;
  const emulator=new NES({emulateSound:false,onFrame:frame=>{
    screenshot=Int32Array.from(frame);rendered++;
  }});
  emulator.loadROM(Buffer.from(buildROM()).toString('binary'));
  function frames(n=3){for(let i=0;i<n;i++)emulator.frame();assert.ok(screenshot?.length===256*240,'JSNES must emit 256x240 frame pixels');return screenshot.slice();}
  function down(name,n=5){
    const button=Controller['BUTTON_'+name];assert.notEqual(button,undefined);
    emulator.buttonDown(1,button);const img=frames(n);
    emulator.buttonUp(1,button);frames(3);return img;
  }
  function changed(a,b){let count=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])count++;return count;}
  function locate(img,bg,roi={xmin:95,xmax:190,ymin:80,ymax:150}){
    let n=0,minX=999,maxX=-1,minY=999,maxY=-1;
    for(let y=roi.ymin;y<=roi.ymax;y++)for(let x=roi.xmin;x<=roi.xmax;x++){
      if(img[y*256+x]!==bg[y*256+x]){n++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
    }
    return {n,minX,maxX,minY,maxY};
  }
  const before=frames(9);
  const preColor=new Set(before);
  down('START',5);
  const after=frames(4);
  const sprite=locate(after,before);
  assert.ok(sprite.n>=32,'START must draw a visible sprite; changed pixels='+sprite.n+' preColors='+preColor.size);
  assert.ok(sprite.maxX-sprite.minX<=16&&sprite.maxY-sprite.minY<=16,'sprite must be localized 8x8');
  const x=emulator.cpu.mem[2],y=emulator.cpu.mem[3];
  down('RIGHT',6);
  const right=frames(4),shifted=locate(right,before);
  assert.ok(emulator.cpu.mem[2]>x,'RIGHT must advance x');
  assert.ok(shifted.minX>sprite.minX,'RIGHT must move visible framebuffer sprite');
  down('DOWN',6);
  const moved=frames(4),lowered=locate(moved,before);
  assert.ok(emulator.cpu.mem[3]>y,'DOWN must advance y');
  assert.ok(lowered.minY>shifted.minY,'DOWN must move visible framebuffer sprite');
  const beforeAttack=frames(3);
  down('A',3);
  const attack=frames(3);
  assert.ok(changed(beforeAttack,attack)>=16,'A palette action must visibly change sprite pixels');
  down('B',3);
  const special=frames(3);
  assert.ok(changed(attack,special)>=16,'B palette action must visibly differ from A');
  assert.ok(rendered>=30,'framebuffer must advance from JSNES actual frames');
  console.log(JSON.stringify({kind:'av194-jsnes-framebuffer',startSpritePixels:sprite.n,
    startBoundingBox:sprite,rightBoundingBox:shifted,downBoundingBox:lowered,
    colorPixelsA:changed(beforeAttack,attack),colorPixelsB:changed(attack,special),
    renderedFrames:rendered,browserVerified:false}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
