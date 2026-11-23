'use strict';
/* AV-201 genuine 6502 ROM game-over/restart in JSNES, not browser proof. */
const assert=require('node:assert/strict');
const {buildROM}=require('../dashboard/av201_defeat_rom.js');
const {pathToFileURL}=require('node:url');
async function main(){
 const entry=require.resolve('jsnes');
 const src=require('node:path').resolve(require('node:path').dirname(entry),'../src/index.js');
 const jsnes=await import(pathToFileURL(src).href);
 const em=new jsnes.NES({emulateSound:false,onFrame:()=>{}});
 em.loadROM(Buffer.from(buildROM()).toString('binary'));
 assert.equal(em.rom.valid,true);
 const frames=n=>{for(let i=0;i<n;i++)em.frame();};
 const press=(key,n=3)=>{em.buttonDown(1,jsnes.Controller['BUTTON_'+key]);frames(n);
  em.buttonUp(1,jsnes.Controller['BUTTON_'+key]);frames(2)};
 frames(8);assert.equal(em.cpu.mem[5],0,'title mode before START');
 press('START');assert.equal(em.cpu.mem[5],1,'ROM starts play via controller port');
 frames(210);assert.equal(em.cpu.mem[5],2,'6502 timer must cause game over');
 assert.equal(em.cpu.mem[6],180,'game over at ROM frame counter 180');
 frames(10);assert.equal(em.cpu.mem[5],2,'cannot spontaneously recover without START');
 press('START');assert.equal(em.cpu.mem[5],1,'real START restarts run');
 assert.ok(em.cpu.mem[6]<15,'new session timer reset in 6502 code');
 frames(60);assert.equal(em.cpu.mem[5],1,'new game survives post-restart frames');
 console.log(JSON.stringify({kind:'AV-201-JSNES',real6502:true,loss:true,
   restart:true,postRestartFrames:60,syntheticBrowser:false}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
