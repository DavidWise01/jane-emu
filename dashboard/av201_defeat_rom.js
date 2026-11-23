/* AV-201 · Original, deterministic NROM-128 controller exercise cartridge.
 * Purpose: a legal homebrew test of real 6502/PPU/controller mechanics.
 * START begins/restarts each life from x120/y108/palette30, D-pad moves, A/B changes palette; at 180 game frames the ROM itself sets $0005=2 (game over) and hides the sprite. A later START restarts.
 * No second emulator and no fake frame reporting: load via the existing .nes path.
 */
(function(root,factory){'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV201=api;
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});
  else api.mount();
 }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SCHEMA='jane.av201.cartridge-defeat-rom.v1';
 function buildROM(){
  const bytes=[],labels=new Map(),fixups=[];
  const emit=(...xs)=>{for(const x of xs){if(!Number.isInteger(x)||x<0||x>255)throw Error('Invalid opcode');bytes.push(x)}};
  const label=name=>{if(labels.has(name))throw Error('Duplicate assembler label '+name);labels.set(name,bytes.length)};
  const branch=(opcode,name)=>{emit(opcode,0);fixups.push({type:'rel',at:bytes.length-1,name})};
  const jump=name=>{emit(0x4C,0,0);fixups.push({type:'abs',at:bytes.length-2,name})};
  const ldaImm=n=>emit(0xA9,n);
  const staAbs=addr=>emit(0x8D,addr&255,addr>>8);
  const ldaAbs=addr=>emit(0xAD,addr&255,addr>>8);
  const staZp=addr=>emit(0x85,addr);
  const ldaZp=addr=>emit(0xA5,addr);
  function input(name,body){
   ldaAbs(0x4016);emit(0x29,1);branch(0xF0,name+'_skip');body();label(name+'_skip');
  }
  label('reset');
  emit(0x78,0xD8,0xA2,0xFF,0x9A); // SEI CLD LDX #FF TXS
  ldaImm(0);staAbs(0x2000);staAbs(0x2001);staAbs(0x4010);
  ldaImm(120);staZp(0x02); // player X
  ldaImm(108);staZp(0x03); // player Y
  ldaImm(0x30);staZp(0x04); // sprite color
  ldaImm(0);staZp(0x05); // 0=title 1=playing 2=dead
  ldaImm(0);staZp(0x06); // live 6502 gameplay counter
  // Disable all sprites, then update sprite zero only.
  ldaImm(0);staAbs(0x2003);emit(0xA2,0);
  label('hide');ldaImm(0xF8);staAbs(0x2004);emit(0xE8);branch(0xD0,'hide');
  // Universal background palette = dark, sprite color = white.
  emit(0x2C,0x02,0x20); // BIT PPUSTATUS clears address latch
  ldaImm(0x3F);staAbs(0x2006);ldaImm(0);staAbs(0x2006);
  ldaImm(0x0F);staAbs(0x2007);
  label('frame');
  label('vblank');emit(0x2C,0x02,0x20);branch(0x10,'vblank');
  // Controller strobe latches A,B,Select,Start,Up,Down,Left,Right.
  ldaImm(1);staAbs(0x4016);ldaImm(0);staAbs(0x4016);
  // AV-225: title and defeat are not active gameplay. A/B and D-pad
  // must not mutate the frozen prior-life RAM while awaiting START.
  const onlyPlaying=(name,body)=>{
   ldaZp(0x05);emit(0xC9,1);branch(0xD0,name+'_not_playing');
   body();label(name+'_not_playing');
  };
  input('A',()=>onlyPlaying('A',()=>{ldaImm(0x16);staZp(0x04)}));
  input('B',()=>onlyPlaying('B',()=>{ldaImm(0x2A);staZp(0x04)}));
  input('SELECT',()=>{ldaImm(120);staZp(0x02);ldaImm(108);staZp(0x03)});
  // AV-222: a new life must start with deterministic sprite and palette
  // state. Holding START while already playing must not restart each frame.
  input('START',()=>{
   ldaZp(0x05);emit(0xC9,1);branch(0xF0,'START_no_reentry');
   ldaImm(120);staZp(0x02);
   ldaImm(108);staZp(0x03);
   ldaImm(0x30);staZp(0x04);
   ldaImm(0);staZp(0x06);
   ldaImm(1);staZp(0x05);
   // AV-224: leave PPU rendering disabled until palette and OAM are written
   // for this new life. Re-enabling here could display the prior life.
   label('START_no_reentry');
  });
  // AV-223: keep the complete 8x8 original NES sprite inside the visible
  // viewport. 8-bit INC/DEC otherwise wraps across the screen at 0/255.
  // Every clamp executes as original 6502 instructions, not a host-side fix.
  input('UP',()=>onlyPlaying('UP',()=>{ldaZp(0x03);emit(0xC9,8);branch(0xF0,'UP_edge');emit(0xC6,0x03);label('UP_edge');}));
  input('DOWN',()=>onlyPlaying('DOWN',()=>{ldaZp(0x03);emit(0xC9,231);branch(0xF0,'DOWN_edge');emit(0xE6,0x03);label('DOWN_edge');}));
  input('LEFT',()=>onlyPlaying('LEFT',()=>{ldaZp(0x02);emit(0xC9,8);branch(0xF0,'LEFT_edge');emit(0xC6,0x02);label('LEFT_edge');}));
  input('RIGHT',()=>onlyPlaying('RIGHT',()=>{ldaZp(0x02);emit(0xC9,247);branch(0xF0,'RIGHT_edge');emit(0xE6,0x02);label('RIGHT_edge');}));
  // Actual 6502 game-over transition, not a host-side label or injected RAM.
  ldaZp(0x05);emit(0xC9,1);branch(0xD0,'skip_age');
  emit(0xE6,0x06); // INC $06 once per observed PPU vblank
  ldaZp(0x06);emit(0xC9,180);branch(0xD0,'skip_age');
  ldaImm(2);staZp(0x05);ldaImm(0);staAbs(0x2001);
  label('skip_age');
  ldaZp(0x05);emit(0xC9,1);branch(0xD0,'skip_draw');
  // Sprite color palette entry $3F11.
  emit(0x2C,0x02,0x20);
  ldaImm(0x3F);staAbs(0x2006);ldaImm(0x11);staAbs(0x2006);
  ldaZp(0x04);staAbs(0x2007);
  ldaImm(0);staAbs(0x2003);
  ldaZp(0x03);staAbs(0x2004); // Y
  ldaImm(1);staAbs(0x2004); // CHR tile 1
  ldaImm(0);staAbs(0x2004); // sprite palette 0
  ldaZp(0x02);staAbs(0x2004); // X
  // AV-224: all current-life sprite state is committed. NOW enable
  // the original PPU sprite output, never before the OAM/palette writes.
  ldaImm(0x14);staAbs(0x2001);
  label('skip_draw');jump('frame');
  for(const f of fixups){
   if(!labels.has(f.name))throw Error('Unresolved assembler label '+f.name);
   const dest=labels.get(f.name);
   if(f.type==='rel'){
    const off=dest-(f.at+1);
    if(off< -128||off>127)throw Error('6502 branch out of range: '+f.name+' '+off);
    bytes[f.at]=off&255;
   }else{
    const target=0x8000+dest;bytes[f.at]=target&255;bytes[f.at+1]=target>>8;
   }
  }
  if(bytes.length>16384)throw Error('ROM code exceeds 16 KiB');
  const rom=new Uint8Array(16+16384+8192);
  rom.set([0x4E,0x45,0x53,0x1A,1,1,0,0],0);
  rom.fill(0xEA,16,16+16384);rom.set(bytes,16);
  const reset=0x8000;
  for(const offset of [0x3FFA,0x3FFC,0x3FFE]){
   rom[16+offset]=reset&255;rom[16+offset+1]=reset>>8;
  }
  // CHR tile 1 = 8x8 solid colored square, all other tiles transparent.
  const chr=16+16384;for(let line=0;line<8;line++)rom[chr+16+line]=0xFF;
  return rom;
 }
 function mount(){
  if(document.getElementById('av201-demo'))return;
  const toolbar=document.querySelector('.toolbar');if(!toolbar)return;
  const button=document.createElement('button');button.id='av201-demo';button.type='button';
  button.textContent='PLAY LOSS ROM';button.title='Original homebrew NES loss-and-restart test: START, 180-frame defeat, START recovery.';
  button.style.cssText='border:1px solid #bd72ff;color:#e2c3ff;background:#25142e;font-weight:900';
  button.addEventListener('click',()=>{
   const rom=buildROM();
   const file=new File([rom],'jane-loss-restart-test.nes',{type:'application/octet-stream'});
   window.dispatchEvent(new CustomEvent('jane-av193-load',{detail:{file}}));
  });
  toolbar.append(button);
  window.JANE_AV201_TEST_ROM={buildROM,SCHEMA};
 }
 return {SCHEMA,buildROM,mount};
});
