'use strict';
/* AV-222: execute the assembled homebrew 6502 instructions with a minimal
 * deterministic bus. No synthetic host-side ROM RAM success assignment.
 * This is a controller/ROM functional test, NOT real Chromium JSNES evidence.
 */
const assert=require('node:assert/strict');
const {buildROM}=require('../dashboard/av201_defeat_rom.js');
const rom=buildROM();
assert.deepEqual([...rom.slice(0,4)],[0x4e,0x45,0x53,0x1a]);
assert.equal(rom.length,16+16384+8192);
const program=rom.slice(16,16+16384);
const mem=new Uint8Array(65536);
mem.set(program,0x8000);mem.set(program,0xc000); // NROM-128 mirrors 16 KiB into $C000-$FFFF
const readWord=a=>mem[a]|mem[a+1]<<8;
let pc=readWord(0xfffc),a=0,x=0,flags=0,cycles=0,readIndex=0,
  strobe=0,buttonMask=0,latches=0,ppuMask=0;
assert.equal(pc,0x8000);
const Z=2,N=128,V=64;
const setNZ=v=>{flags=(flags&~(Z|N))|(v===0?Z:0)|(v&N)};
function read(addr){
 if(addr===0x2002)return 0x80; // next vblank is ready
 if(addr===0x4016){const v=readIndex<8?(buttonMask>>readIndex)&1:1;
  if(!strobe)readIndex++;return v;}
 return mem[addr];
}
function write(addr,v){
 if(addr===0x4016){const before=strobe;strobe=v&1;
  if(before&&!strobe){readIndex=0;latches++;}}
 if(addr===0x2001)ppuMask=v;
 mem[addr]=v;
}
function byte(){return mem[pc++&65535]}
function address(){const lo=byte();return lo|byte()<<8}
function branch(on){const off=byte();if(on)pc=(pc+(off&128?off-256:off))&65535;}
function step(){
 const op=byte();cycles++;
 switch(op){
  case 0x78:case 0xd8:case 0x9a:break;
  case 0xa2:x=byte();setNZ(x);break;
  case 0xa9:a=byte();setNZ(a);break;
  case 0xa5:a=read(byte());setNZ(a);break;
  case 0xad:a=read(address());setNZ(a);break;
  case 0x85:write(byte(),a);break;
  case 0x8d:write(address(),a);break;
  case 0x29:a&=byte();setNZ(a);break;
  case 0xc9:{const d=a-byte();flags=(flags&~(Z|N))|(d===0?Z:0)|(d&N);break}
  case 0x2c:{const v=read(address());flags=(flags&~(Z|N|V))|(v&(N|V))|((a&v)?0:Z);break}
  case 0xf0:branch(Boolean(flags&Z));break;
  case 0xd0:branch(!(flags&Z));break;
  case 0x10:branch(!(flags&N));break;
  case 0xe8:x=(x+1)&255;setNZ(x);break;
  case 0xe6:{const addr=byte(),v=(read(addr)+1)&255;write(addr,v);setNZ(v);break}
  case 0xc6:{const addr=byte(),v=(read(addr)-1)&255;write(addr,v);setNZ(v);break}
  case 0x4c:pc=address();break;
  default:throw Error('Unsupported emitted opcode 0x'+op.toString(16)+' at '+(pc-1).toString(16));
 }
 if(cycles>200000)throw Error('6502 interpreter instruction budget exceeded');
}
function frames(n,buttons=[]){
 const map={A:0,B:1,SELECT:2,START:3,UP:4,DOWN:5,LEFT:6,RIGHT:7};
 buttonMask=buttons.reduce((b,k)=>b|1<<map[k],0);
 const end=latches+n;
 while(latches<end)step();
 // Controller latches once near the start of frame; finish previous frame.
 while(latches===end)step();
}
function state(){return {x:mem[2],y:mem[3],palette:mem[4],mode:mem[5],age:mem[6]}}
frames(1);
assert.equal(state().mode,0);
assert.equal(state().x,120);
frames(1,['START']);
assert.equal(state().mode,1,'the 6502, not the host, begins the game');
assert.ok(state().age>=1&&state().age<=2,'one observed startup window plus initial latch');
frames(9,['RIGHT','A']);
assert.ok(state().x>120);
assert.equal(state().palette,0x16);
const moved=state();
frames(7,['START','LEFT','B']);
assert.equal(state().mode,1,'holding START in a running life must not reset');
assert.ok(state().x<moved.x,'LEFT continues moving with START held');
assert.equal(state().palette,0x2a,'B still changes palette');
assert.ok(state().age>moved.age,'holding START must not reset game age');
frames(180,[]);
assert.equal(state().mode,2,'original NES program actually reaches game over');
assert.equal(ppuMask,0,'the 6502 hides sprites on defeat');
assert.notEqual(state().x,120,'previous life had moved away from spawn');
frames(1,['START']);
assert.equal(state().mode,1,'the actual CPU restarts the defeated cartridge');
assert.equal(state().x,120,'fresh life sprite X reset');
assert.equal(state().y,108,'fresh life sprite Y reset');
assert.equal(state().palette,0x30,'fresh life palette reset');
assert.ok(state().age>=1&&state().age<=2,'new life age restarts');
assert.equal(ppuMask,0x14,'original NES sprite display reenabled');
const afterRestart=state();
frames(3,['START']);
assert.ok(state().age>afterRestart.age,'held START cannot repeatedly zero age');
assert.equal(state().x,120);
// AV-223: execute actual NES 6502 edge clamps, including held D-pad input.
frames(140,['RIGHT']);
assert.equal(state().x,247,'RIGHT clamps the full sprite at visible right boundary');
frames(10,['RIGHT']);
assert.equal(state().x,247,'held RIGHT cannot wrap x to zero');
function freshLife(){
 frames(190,[]);
 assert.equal(state().mode,2,'real game age must trigger defeat before next edge case');
 frames(1,['START']);
 assert.equal(state().mode,1,'fresh life uses actual 6502 START transition');
 assert.equal(state().x,120);
 assert.equal(state().y,108);
}
freshLife();
frames(130,['LEFT']);
assert.equal(state().x,8,'LEFT clamps at visible margin');
frames(6,['LEFT']);
assert.equal(state().x,8,'held LEFT cannot wrap');
freshLife();
frames(115,['UP']);
assert.equal(state().y,8,'UP clamps at visible upper margin');
frames(6,['UP']);
assert.equal(state().y,8,'held UP cannot wrap');
freshLife();
frames(140,['DOWN']);
assert.equal(state().y,231,'DOWN clamps the full sprite at visible lower boundary');
frames(6,['DOWN']);
assert.equal(state().y,231,'held DOWN cannot wrap');
console.log('AV-223 6502 NES sprite edge test PASS: x 8..247 and y 8..231, no wrap on held D-pad');
