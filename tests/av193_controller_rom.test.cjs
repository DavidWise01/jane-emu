'use strict';
/* AV-193 test performs a small instruction-level 6502 ROM controller harness.
 * It does not substitute for a jsnes/real browser run.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {buildROM,SCHEMA}=require('../dashboard/av193_test_rom.js');
const rom=buildROM(),again=buildROM();
assert.equal(SCHEMA,'jane.av193.original-controller-rom.v1');
assert.equal(rom.length,16+16384+8192);
assert.deepEqual([...rom.slice(0,8)],[78,69,83,26,1,1,0,0]);
assert.deepEqual([...rom],[...again],'test ROM deterministic');
assert.equal(rom[16+0x3FFC],0);assert.equal(rom[16+0x3FFD],0x80);
assert.equal(rom[16+16384+16],0xFF,'solid CHR sprite tile present');
assert.ok(rom.subarray(16,16+16384).includes(0x4C),'frame loop exists');
const names=['A','B','SELECT','START','UP','DOWN','LEFT','RIGHT'];
function run(inputFrames){
 const ram=new Uint8Array(65536);
 let pc=0x8000,a=0,x=0,zero=false,negative=false,ppuWrite=[],input=[],index=0;
 const read8=addr=>{
  if(addr===0x2002)return 0x80; // vblank in this focused deterministic test
  if(addr===0x4016)return input[index++]||0;
  return ram[addr];
 };
 const write8=(addr,n)=>{
  ram[addr]=n&255;
  if(addr===0x4016){if(n===1)index=0;}
  if(addr===0x2001||addr===0x2003||addr===0x2004||addr===0x2006||addr===0x2007)
   ppuWrite.push([addr,n&255]);
 };
 const fetch=()=>rom[16+((pc++-0x8000)&0x3FFF)];
 const imm=()=>fetch();
 const abs=()=>fetch()|(fetch()<<8);
 const flags=n=>{zero=(n&255)===0;negative=!!(n&0x80);};
 const setKeys=pressed=>{input=names.map(k=>pressed.includes(k)?1:0);index=0;};
 function step(){
  const op=fetch();
  switch(op){
   case 0x78:case 0xD8:case 0x9A:break;
   case 0xA9:a=imm();flags(a);break;
   case 0xA2:x=imm();flags(x);break;
   case 0x8D:write8(abs(),a);break;
   case 0x85:write8(imm(),a);break;
   case 0xA5:a=read8(imm());flags(a);break;
   case 0xAD:a=read8(abs());flags(a);break;
   case 0x29:a&=imm();flags(a);break;
   case 0x2C:{const val=read8(abs());zero=(a&val)===0;negative=!!(val&0x80);break;}
   case 0xE8:x=(x+1)&255;flags(x);break;
   case 0xC6:{const z=imm();write8(z,(read8(z)-1)&255);flags(read8(z));break;}
   case 0xE6:{const z=imm();write8(z,(read8(z)+1)&255);flags(read8(z));break;}
   case 0x4C:pc=abs();break;
   case 0xF0:case 0xD0:case 0x10:{
    let off=imm();if(off>=128)off-=256;
    if(op===0xF0&&zero||op===0xD0&&!zero||op===0x10&&!negative)pc=(pc+off)&65535;
    break;
   }
   default:throw Error('Unexpected opcode '+op.toString(16)+' at '+(pc-1).toString(16));
  }
 }
 function cycle(keys,n=1000){setKeys(keys);for(let i=0;i<n;i++)step();}
 for(const keys of inputFrames)cycle(keys);
 return {ram,ppuWrite,pc};
}
const idle=run([[]]);
assert.equal(idle.ram[5],0,'sprite remains hidden until START');
const started=run([[],['START']]);
assert.equal(started.ram[5],1,'START sets gameplay mode');
assert.ok(started.ppuWrite.some(([addr,value])=>addr===0x2001&&value===0x14),'START enables sprite rendering');
const moving=run([[],['START'],['RIGHT'],['DOWN'],['A']]);
assert.ok(moving.ram[2]>started.ram[2],'RIGHT increases NES sprite X');
assert.ok(moving.ram[3]>started.ram[3],'DOWN increases NES sprite Y');
assert.equal(moving.ram[4],0x16,'A changes sprite color');
const attacking=run([[],['START'],['B']]);
assert.equal(attacking.ram[4],0x2A,'B changes color differently');
const resetting=run([[],['START'],['RIGHT'],['SELECT']]);
assert.equal(resetting.ram[2],120,'SELECT centers sprite X');
const html=fs.readFileSync(path.join(__dirname,'../dashboard/arena.html'),'utf8');
assert.ok(html.includes('<script src="./av193_test_rom.js"></script>'));
assert.ok(html.includes("window.addEventListener('jane-av193-load'"));
assert.ok(html.includes('if(!ready){pendingNESFile=file;'));
assert.ok(html.includes('<iframe id="game"'));
assert.ok(html.includes('<script src="./av186_three_tools.js"></script>'));
new vm.Script(fs.readFileSync(path.join(__dirname,'../dashboard/av193_test_rom.js'),'utf8'));
console.log('AV-193 iNES ROM assembly, CPU controller START, directional movement, A/B and native ROM loader checks passed');
